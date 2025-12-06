import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { buildCaseSummaryContext, generateDeepBriefing } from '../services/aiCaseSummaryService.js';
import { withAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/:caseId/briefing/deep',
  withAccess,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const context = await buildCaseSummaryContext(caseId);
    const briefing = await generateDeepBriefing(context);

    return res.json({ success: true, briefing });
  })
);

export default router;


