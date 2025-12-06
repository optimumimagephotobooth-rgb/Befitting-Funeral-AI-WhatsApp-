import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { withAccess } from '../middleware/authMiddleware.js';
import { listOpenAutomationAlerts } from '../services/automationRulesService.js';

const router = express.Router();

router.get(
  '/automations',
  withAccess,
  asyncHandler(async (req, res) => {
    const data = await listOpenAutomationAlerts();
    res.json({ success: true, ...data });
  })
);

export default router;


