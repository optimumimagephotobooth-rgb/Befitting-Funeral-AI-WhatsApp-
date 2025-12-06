import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { buildCaseSummaryContext, generateAttentionItems } from '../services/aiCaseSummaryService.js';
import { withAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/:caseId/attention',
  withAccess,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const context = await buildCaseSummaryContext(caseId);
    const attention = await generateAttentionItems(context);

    return res.json({ success: true, attention });
  })
);

export default router;


