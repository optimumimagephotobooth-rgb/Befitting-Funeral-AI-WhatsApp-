import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { withAccess } from '../middleware/authMiddleware.js';
import { buildCaseSummaryContext } from '../services/aiCaseSummaryService.js';
import {
  evaluateAutomationRules,
  persistAutomationAlerts,
  listOpenAutomationAlertsByCase,
  resolveAutomationAlert,
  listOpenAutomationAlerts
} from '../services/automationRulesService.js';
import { listOpenAutomationAlerts } from '../services/automationRulesService.js';

const router = express.Router();

router.post(
  '/:caseId/automations/run',
  withAccess,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const context = await buildCaseSummaryContext(caseId);
    const alerts = evaluateAutomationRules(context);
    await persistAutomationAlerts(caseId, alerts);
    res.json({ success: true, alerts });
  })
);

router.get(
  '/:caseId/automations',
  withAccess,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const data = await listOpenAutomationAlertsByCase(caseId, true);
    res.json({ success: true, alerts: data.open, history: data.history });
  })
);

router.get(
  '/alerts',
  withAccess,
  asyncHandler(async (req, res) => {
    const data = await listOpenAutomationAlerts();
    res.json({ success: true, data });
  })
);

router.post(
  '/:caseId/automations/:alertId/resolve',
  withAccess,
  asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const result = await resolveAutomationAlert(alertId, req.staff);
    if (!result) {
      return res.status(404).json({ error: 'Alert not found or already resolved.' });
    }
    res.json({ success: true });
  })
);

export default router;


