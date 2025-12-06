import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { evaluateSupervisorInsights, listSupervisorInsights } from '../services/supervisorAiService.js';
import { withAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/',
  withAccess,
  asyncHandler(async (req, res) => {
    const { caseId } = req.body;
    const insight = await evaluateSupervisorInsights(caseId);
    res.json({ success: true, insight });
  })
);

router.get(
  '/',
  withAccess,
  asyncHandler(async (req, res) => {
    const insights = await listSupervisorInsights();
    res.json({ success: true, insights });
  })
);

export default router;

