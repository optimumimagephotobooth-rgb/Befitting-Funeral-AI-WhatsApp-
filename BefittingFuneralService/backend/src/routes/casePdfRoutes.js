import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import {
  buildCaseSummaryContext,
  generateCaseSummary,
  generateAttentionItems,
  generateDeepBriefing
} from '../services/aiCaseSummaryService.js';
import { createPdfBuffer } from '../services/pdfService.js';
import { withAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get(
  '/:caseId/summary/pdf',
  withAccess,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const context = await buildCaseSummaryContext(caseId);
    const summaryResult = await generateCaseSummary(context);

    const buffer = await createPdfBuffer(
      'AI Case Summary',
      {
        'Generated At': summaryResult.generatedAt,
        'Stage Analysed': summaryResult.stage,
        'Word Count': summaryResult.wordCount
      },
      summaryResult.summary
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="case-${caseId}-summary.pdf"`);
    res.send(buffer);
  })
);

router.get(
  '/:caseId/attention/pdf',
  withAccess,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const context = await buildCaseSummaryContext(caseId);
    const attentionResult = await generateAttentionItems(context);

    const bodyText = (attentionResult.items || []).map((item) => `${item.category}: ${item.item}`).join('\n');

    const buffer = await createPdfBuffer('Areas That Need Attention', {}, bodyText);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="case-${caseId}-attention.pdf"`);
    res.send(buffer);
  })
);

router.get(
  '/:caseId/intelligence/pdf',
  withAccess,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const context = await buildCaseSummaryContext(caseId);
    const summaryResult = await generateCaseSummary(context);
    const attentionResult = await generateAttentionItems(context);

    const sections = [
      '=== AI Case Summary ===',
      summaryResult.summary || 'No summary available.',
      '',
      '=== Areas That Need Attention ===',
      (attentionResult.items || [])
        .map((item) => `• ${item.category || 'General'}: ${item.item}`)
        .join('\n') || 'No attention items detected.'
    ];

    const buffer = await createPdfBuffer(
      'Praxion Intelligence Pack',
      {
        'Generated At': summaryResult.generatedAt,
        Stage: summaryResult.stage,
        'Word Count': summaryResult.wordCount,
        'Attention Items': (attentionResult.items || []).length
      },
      sections.join('\n')
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="case-${caseId}-intelligence-pack.pdf"`);
    res.send(buffer);
  })
);

router.get(
  '/:caseId/briefing/deep/pdf',
  withAccess,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const context = await buildCaseSummaryContext(caseId);
    const briefingResult = await generateDeepBriefing(context);

    const briefing = briefingResult?.briefing || {};
    const bodyText = [
      '=== Deep AI Briefing ===',
      '',
      'Overview:',
      briefing.overview || 'N/A',
      '',
      'Emotional Tone:',
      briefing.emotionalTone || 'N/A',
      '',
      'Family Dynamics:',
      briefing.familyDynamics || 'N/A',
      '',
      'Operational Strategy:',
      briefing.operationalStrategy || 'N/A',
      '',
      'Risk Grade:',
      briefing.riskGrade || 'Unknown'
    ].join('\n');

    const buffer = await createPdfBuffer(
      'Deep AI Briefing',
      {
        'Generated At': briefingResult.generatedAt || new Date().toISOString(),
        'Risk Grade': briefing.riskGrade || 'Unknown'
      },
      bodyText
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="case-${caseId}-deep-briefing.pdf"`);
    res.send(buffer);
  })
);

export default router;


