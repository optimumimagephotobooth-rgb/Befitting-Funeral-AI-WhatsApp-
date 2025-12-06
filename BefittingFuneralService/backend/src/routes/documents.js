import express from 'express';
import { requireStaffOrApiKey } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { Case } from '../models/Case.js';
import {
  buildCaseContext,
  renderTemplate,
  htmlToPdfBuffer,
  saveCaseDocument,
  listCaseDocuments,
  getCaseDocument,
  openCaseDocumentStream
} from '../services/documentGeneratorService.js';
import {
  getDocumentTemplateById,
  listDocumentTemplates
} from '../services/documentTemplateService.js';
import {
  listCaseCharges,
  createCaseCharge,
  updateCaseCharge,
  deleteCaseCharge
} from '../services/caseChargeService.js';
import { downloadPdf, createSignedPdfUrl } from '../services/storageService.js';
import { logCaseEvent, logStaffEvent, listCaseEvents } from '../services/supabaseService.js';
import { recordAuditLog } from '../services/auditLogService.js';
import {
  getWorkflowSummary,
  validateTransition,
  canRoleTransition
} from '../services/workflowService.js';
import { evaluateStageGate } from '../services/complianceGateService.js';
import { Message } from '../models/Message.js';
import { Contact } from '../models/Contact.js';
import { listCaseNotes, createCaseNote } from '../services/caseNoteService.js';
import { getCaseForecast, logForecastEvent } from '../services/forecastService.js';
import { getAISupervisorHints, logSupervisorHints } from '../services/aiSupervisorService.js';
import { generateAIDraft, sendDraftMessage } from '../services/aiDraftService.js';

const router = express.Router();

async function ensureCase(caseId) {
  const caseRecord = await Case.findById(caseId);
  if (!caseRecord) {
    const error = new Error('Case not found');
    error.status = 404;
    throw error;
  }
  return caseRecord;
}

router.get(
  '/:caseId/workflow',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const caseRecord = await ensureCase(req.params.caseId);
    const summary = getWorkflowSummary(caseRecord.stage || caseRecord.status || 'NEW');
    res.json({
      success: true,
      data: {
        stage: caseRecord.stage || caseRecord.status || 'NEW',
        summary
      }
    });
  })
);

router.get(
  '/:caseId/messages',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    await ensureCase(caseId);
    const messages = await Message.findByCaseId(caseId);
    res.json({ success: true, data: messages });
  })
);

router.post(
  '/:caseId/messages/draft',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { prompt, tone } = req.body || {};
    await ensureCase(caseId);
    const result = await generateAIDraft(caseId, { prompt, tone }, req.staff || {});
    res.json({ success: true, data: result });
  })
);

router.post(
  '/:caseId/messages/send',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { body } = req.body || {};
    await ensureCase(caseId);
    await sendDraftMessage(caseId, body, req.staff || {});
    res.json({ success: true });
  })
);

router.get(
  '/:caseId/notes',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    await ensureCase(caseId);
    const notes = await listCaseNotes(caseId);
    res.json({ success: true, data: notes });
  })
);

router.post(
  '/:caseId/notes',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { body } = req.body || {};
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, error: 'body is required' });
    }

    await ensureCase(caseId);
    const note = await createCaseNote(caseId, { body: body.trim(), staffId: req.staff?.staffId || null });

    await logCaseEvent({
      case_id: caseId,
      event_type: 'NOTE_ADDED',
      stage: null,
      metadata: {
        staffId: req.staff?.staffId || null,
        staffName: req.staff?.name || 'Unknown',
        noteId: note.id
      }
    });

    await recordAuditLog({
      caseId,
      staffId: req.staff?.staffId || null,
      action: 'NOTE_ADDED',
      metadata: { noteId: note.id, body: note.body.slice(0, 140) },
      ipAddress: req.ip
    });

    await logStaffEvent({
      staff_id: req.staff?.staffId || null,
      actor_id: req.staff?.staffId || null,
      actor_name: req.staff?.name || 'Unknown',
      event_type: 'NOTE_ADDED',
      metadata: { caseId, noteId: note.id }
    });

    res.status(201).json({ success: true, data: note });
  })
);

router.get(
  '/:caseId/timeline',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { limit = 50 } = req.query;
    await ensureCase(caseId);
    const events = await listCaseEvents(caseId, Number(limit) || 50);
    res.json({ success: true, data: events });
  })
);

router.get(
  '/:caseId/forecast',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    await ensureCase(caseId);
    const forecast = await getCaseForecast(caseId);
    await logForecastEvent(caseId, forecast);
    res.json({ success: true, data: forecast });
  })
);

router.get(
  '/:caseId/supervisor',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    await ensureCase(caseId);
    const hints = await getAISupervisorHints(caseId);
    await logSupervisorHints(caseId, hints.hints);
    res.json({ success: true, data: hints });
  })
);

router.post(
  '/:caseId/transition',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { toStage } = req.body || {};
    if (!toStage) {
      return res.status(400).json({ success: false, error: 'toStage is required' });
    }

    const caseRecord = await ensureCase(caseId);
    const currentStage = caseRecord.stage || caseRecord.status || 'NEW';
    if (!validateTransition(currentStage, toStage)) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition from ${currentStage} to ${toStage}`
      });
    }

    const role = req.staff?.role || 'agent';
    if (!canRoleTransition(currentStage, role)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to move this case from the current stage'
      });
    }

    const gateStatus = await evaluateStageGate(caseId, toStage);
    if (!gateStatus.passed) {
      return res.status(412).json({
        success: false,
        error: 'Stage requirements are incomplete. Resolve compliance blockers before proceeding.',
        data: gateStatus
      });
    }

    const updatedCase = await Case.update(caseId, {
      stage: toStage,
      status: toStage
    });

    const timelineEvent = await logCaseEvent({
      case_id: caseId,
      event_type: 'STAGE_CHANGE',
      stage: toStage,
      metadata: {
        from: currentStage,
        to: toStage,
        staffId: req.staff?.staffId || null,
        staffName: req.staff?.name || 'Unknown',
        role
      }
    });

    await recordAuditLog({
      caseId,
      staffId: req.staff?.staffId || null,
      action: 'STAGE_CHANGE',
      metadata: {
        from: currentStage,
        to: toStage,
        staffName: req.staff?.name || 'Unknown',
        role
      },
      ipAddress: req.ip
    });

    await logStaffEvent({
      staff_id: req.staff?.staffId || null,
      actor_id: req.staff?.staffId || null,
      actor_name: req.staff?.name || 'Unknown',
      event_type: 'STAGE_CHANGE',
      metadata: {
        caseId,
        from: currentStage,
        to: toStage
      }
    });

    res.json({
      success: true,
      data: {
        case: updatedCase,
        workflow: getWorkflowSummary(toStage),
        timelineEvent,
        gateStatus
      }
    });
  })
);

router.get(
  '/:caseId/documents',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const caseId = req.params.caseId;
    await ensureCase(caseId);
    const documents = await listCaseDocuments(caseId);
    res.json({ success: true, data: documents });
  })
);

router.get(
  '/:caseId/charges',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const caseId = req.params.caseId;
    await ensureCase(caseId);
    const charges = await listCaseCharges(caseId);
    res.json({ success: true, data: charges });
  })
);

router.post(
  '/:caseId/charges',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const caseId = req.params.caseId;
    const { description, amount, quantity, category } = req.body || {};
    if (!description) {
      return res.status(400).json({ success: false, error: 'description is required' });
    }
    await ensureCase(caseId);
    const record = await createCaseCharge(
      caseId,
      {
        description,
        amount: amount ?? 0,
        quantity: quantity ?? 1,
        category
      },
      req.staff?.staffId || null
    );
    res.status(201).json({ success: true, data: record });
  })
);

router.put(
  '/:caseId/charges/:chargeId',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId, chargeId } = req.params;
    await ensureCase(caseId);
    const updated = await updateCaseCharge(caseId, chargeId, req.body || {});
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Charge not found' });
    }
    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/:caseId/charges/:chargeId',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId, chargeId } = req.params;
    await ensureCase(caseId);
    await deleteCaseCharge(caseId, chargeId);
    res.json({ success: true });
  })
);

router.get(
  '/:caseId/documents/templates',
  requireStaffOrApiKey,
  asyncHandler(async (_req, res) => {
    const templates = await listDocumentTemplates({ includeInactive: false });
    res.json({ success: true, data: templates });
  })
);

router.post(
  '/:caseId/documents/preview',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const caseId = req.params.caseId;
    const { templateId, htmlOverride } = req.body;
    if (!templateId && !htmlOverride) {
      return res.status(400).json({ success: false, error: 'templateId or htmlOverride required' });
    }

    await ensureCase(caseId);
    const template =
      htmlOverride !== undefined ? null : await getDocumentTemplateById(templateId);
    if (!template && !htmlOverride) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const context = await buildCaseContext(caseId);
    const html = renderTemplate(htmlOverride || template.htmlTemplate, context);
    res.json({
      success: true,
      data: {
        html,
        context
      }
    });
  })
);

router.post(
  '/:caseId/documents',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const caseId = req.params.caseId;
    const { templateId, htmlOverride, title } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, error: 'templateId is required' });
    }

    const caseRecord = await ensureCase(caseId);
    const template = await getDocumentTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const context = await buildCaseContext(caseId);
    const compiledHtml = renderTemplate(htmlOverride || template.htmlTemplate, context);
    const pdfBuffer = await htmlToPdfBuffer(compiledHtml);
    const documentTitle = title || `${template.name} - ${context.case.case_ref}`;

    const record = await saveCaseDocument({
      caseId,
      templateId,
      title: documentTitle,
      htmlSnapshot: compiledHtml,
      pdfBuffer,
      createdBy: req.staff?.staffId || null,
      metadata: {
        templateName: template.name,
        documentType: template.documentType
      }
    });

    await logCaseEvent({
      case_id: caseId,
      event_type: 'DOC_GENERATED',
      stage: caseRecord.stage || caseRecord.status,
      metadata: {
        documentId: record.id,
        title: documentTitle,
        template: template.name
      }
    });

    await logStaffEvent({
      staff_id: req.staff?.staffId || null,
      actor_id: req.staff?.staffId || null,
      actor_name: req.staff?.name || 'Unknown',
      event_type: 'DOC_GENERATED',
      metadata: {
        caseId,
        documentId: record.id,
        template: template.name
      }
    });

    res.json({
      success: true,
      data: {
        id: record.id,
        title: record.title,
        createdAt: record.created_at,
        downloadUrl: `/api/cases/${caseId}/documents/${record.id}/download`
      }
    });
  })
);

router.get(
  '/:caseId/documents/:documentId/download',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId, documentId } = req.params;
    await ensureCase(caseId);
    const document = await getCaseDocument(caseId, documentId);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const signedUrl = await createSignedPdfUrl(document.file_path);
    if (signedUrl) {
      return res.redirect(signedUrl);
    }

    const fileBuffer = await downloadPdf(document.file_path);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.title || 'document'}.pdf"`
    );
    res.send(fileBuffer);
  })
);

export default router;

