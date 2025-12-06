import express from 'express';
import { requireStaffOrApiKey } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errorHandler.js';
import {
  listMortuaryBodies,
  createMortuaryBody,
  updateMortuaryBody,
  recordMortuaryMovement,
  assignStorage,
  releaseBody
} from '../services/mortuaryService.js';

const router = express.Router();

router.get(
  '/mortuary/bodies',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const filters = { caseId: req.query.caseId, status: req.query.status };
    const data = await listMortuaryBodies(filters);
    res.json({ success: true, data });
  })
);

router.post(
  '/mortuary/bodies',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const body = await createMortuaryBody(payload);
    res.json({ success: true, data: body });
  })
);

router.patch(
  '/mortuary/bodies/:id',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};
    const body = await updateMortuaryBody(id, updates);
    res.json({ success: true, data: body });
  })
);

router.post(
  '/mortuary/movements',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const movement = await recordMortuaryMovement(payload);
    res.json({ success: true, data: movement });
  })
);

router.post(
  '/mortuary/storage',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const record = await assignStorage(payload);
    res.json({ success: true, data: record });
  })
);

router.post(
  '/mortuary/release',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { bodyId, metadata } = req.body;
    const record = await releaseBody(bodyId, { metadata });
    res.json({ success: true, data: record });
  })
);

export default router;

