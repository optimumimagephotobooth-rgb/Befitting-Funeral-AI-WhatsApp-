import express from 'express';
import { requireStaffOrApiKey } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { Case } from '../models/Case.js';
import {
  listCaseCompliance,
  updateChecklistItemStatus,
  updateDocumentStatus
} from '../services/complianceStatusService.js';
import { evaluateStageGate } from '../services/complianceGateService.js';
import { logCaseEvent, logStaffEvent } from '../services/supabaseService.js';
import { recordAuditLog } from '../services/auditLogService.js';

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
  '/:caseId/compliance',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const caseRecord = await ensureCase(req.params.caseId);
    const data = await listCaseCompliance(caseRecord.id);
    const gate = await evaluateStageGate(
      caseRecord.id,
      caseRecord.stage || caseRecord.status || 'NEW'
    );
    res.json({
      success: true,
      data: {
        ...data,
        gate
      }
    });
  })
);

router.patch(
  '/:caseId/compliance/checklist/:itemId',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId, itemId } = req.params;
    const { status, notes, waivedReason } = req.body || {};
    if (!status && notes === undefined && waivedReason === undefined) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }

    const caseRecord = await ensureCase(caseId);
    const staffId = req.staff?.staffId || req.staff?.id || null;

    const updated = await updateChecklistItemStatus(caseId, itemId, {
      status,
      notes,
      waivedReason,
      staffId
    });

    const gateStatus = await evaluateStageGate(caseId, caseRecord.stage || caseRecord.status || 'NEW');

    await logCaseEvent({
      case_id: caseId,
      event_type: 'COMPLIANCE_CHECKLIST_UPDATED',
      stage: caseRecord.stage || caseRecord.status || 'NEW',
      metadata: {
        checklist_id: itemId,
        category: updated?.category,
        item_key: updated?.item_key,
        description: updated?.description,
        status: updated?.status,
        notes: updated?.notes,
        waivedReason: updated?.waived_reason || waivedReason || null,
        staffId,
        staffName: req.staff?.name || 'Unknown'
      }
    });

    await recordAuditLog({
      caseId,
      staffId,
      action: 'COMPLIANCE_ITEM_UPDATE',
      metadata: {
        checklist_id: itemId,
        status: updated?.status,
        notes: updated?.notes,
        waivedReason: updated?.waived_reason || waivedReason || null
      },
      ipAddress: req.ip
    });

    await logStaffEvent({
      staff_id: staffId,
      actor_id: staffId,
      actor_name: req.staff?.name || 'Unknown',
      event_type: 'COMPLIANCE_ITEM_UPDATE',
      metadata: {
        caseId,
        checklist_id: itemId,
        status: updated?.status
      }
    });

    res.json({
      success: true,
      data: {
        item: updated,
        gateStatus
      }
    });
  })
);

router.patch(
  '/:caseId/compliance/documents/:documentId',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId, documentId } = req.params;
    const { status, notes, waivedReason } = req.body || {};
    if (!status && notes === undefined && waivedReason === undefined) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }

    const caseRecord = await ensureCase(caseId);
    const staffId = req.staff?.staffId || req.staff?.id || null;

    const updated = await updateDocumentStatus(caseId, documentId, {
      status,
      notes,
      waivedReason,
      staffId
    });

    const gateStatus = await evaluateStageGate(caseId, caseRecord.stage || caseRecord.status || 'NEW');

    await logCaseEvent({
      case_id: caseId,
      event_type: 'COMPLIANCE_DOCUMENT_UPDATED',
      stage: caseRecord.stage || caseRecord.status || 'NEW',
      metadata: {
        document_id: documentId,
        document_type: updated?.document_type,
        label: updated?.label,
        status: updated?.status,
        notes: updated?.notes,
        waivedReason: updated?.waived_reason || waivedReason || null,
        staffId,
        staffName: req.staff?.name || 'Unknown'
      }
    });

    await recordAuditLog({
      caseId,
      staffId,
      action: 'COMPLIANCE_DOCUMENT_UPDATE',
      metadata: {
        document_id: documentId,
        status: updated?.status,
        notes: updated?.notes,
        waivedReason: updated?.waived_reason || waivedReason || null
      },
      ipAddress: req.ip
    });

    await logStaffEvent({
      staff_id: staffId,
      actor_id: staffId,
      actor_name: req.staff?.name || 'Unknown',
      event_type: 'COMPLIANCE_DOCUMENT_UPDATE',
      metadata: {
        caseId,
        document_id: documentId,
        status: updated?.status
      }
    });

    res.json({
      success: true,
      data: {
        document: updated,
        gateStatus
      }
    });
  })
);

export default router;

