import express from 'express';
import { requireStaffOrApiKey } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errorHandler.js';
import {
  listCemeteryPlots,
  createCemeteryPlot,
  updateCemeteryPlot,
  assignBurial,
  listBurialAssignments
} from '../services/cemeteryService.js';

const router = express.Router();

router.get(
  '/cemetery/plots',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const filters = { status: req.query.status, section: req.query.section };
    const data = await listCemeteryPlots(filters);
    res.json({ success: true, data });
  })
);

router.post(
  '/cemetery/plots',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const plot = await createCemeteryPlot(payload);
    res.json({ success: true, data: plot });
  })
);

router.patch(
  '/cemetery/plots/:id',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};
    const plot = await updateCemeteryPlot(id, updates);
    res.json({ success: true, data: plot });
  })
);

router.post(
  '/cemetery/assign',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const assignment = await assignBurial(payload);
    res.json({ success: true, data: assignment });
  })
);

router.get(
  '/cases/:caseId/burial',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const data = await listBurialAssignments(caseId);
    res.json({ success: true, data });
  })
);

export default router;

