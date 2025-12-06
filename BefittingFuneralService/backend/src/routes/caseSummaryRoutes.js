import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { buildCaseSummaryContext, generateCaseSummary } from '../services/aiCaseSummaryService.js';
import { withAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/:caseId/summary',
  withAccess,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const context = await buildCaseSummaryContext(caseId);
    const summary = await generateCaseSummary(context);

    return res.json({ success: true, summary });
  })
);

export default router;


