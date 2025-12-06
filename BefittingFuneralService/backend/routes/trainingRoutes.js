import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import {
  listTrainingModules,
  fetchProgress,
  upsertProgress,
  listScenarios
} from '../services/trainingEngineService.js';
import { withAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get(
  '/modules',
  withAccess,
  asyncHandler(async (req, res) => {
    const modules = await listTrainingModules();
    res.json({ success: true, modules });
  })
);

router.get(
  '/progress',
  withAccess,
  asyncHandler(async (req, res) => {
    const staffId = req.staff?.id;
    const progress = await fetchProgress(staffId);
    res.json({ success: true, progress });
  })
);

router.post(
  '/progress',
  withAccess,
  asyncHandler(async (req, res) => {
    const staffId = req.staff?.id;
    const { moduleId, score } = req.body;
    const updated = await upsertProgress(staffId, moduleId, score);
    res.json({ success: true, updated });
  })
);

router.get(
  '/scenarios',
  withAccess,
  asyncHandler(async (req, res) => {
    const scenarios = await listScenarios();
    res.json({ success: true, scenarios });
  })
);

export default router;

