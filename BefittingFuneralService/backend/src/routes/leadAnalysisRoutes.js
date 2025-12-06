import express from 'express';
import { analyseLead } from '../services/leadAnalysisService.js';
import { withAccess } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/errorHandler.js';

const router = express.Router();

router.post(
  '/analysis',
  withAccess,
  asyncHandler(async (req, res) => {
    const result = await analyseLead(req.body || {});
    res.json({ success: true, analysis: result });
  })
);

export default router;


