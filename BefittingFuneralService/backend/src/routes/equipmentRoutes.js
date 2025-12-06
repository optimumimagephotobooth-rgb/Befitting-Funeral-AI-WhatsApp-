import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { withAccess } from '../middleware/authMiddleware.js';
import {
  listEquipment,
  allocateEquipment,
  returnEquipment,
  listEquipmentAllocations
} from '../services/equipmentService.js';
import { buildEquipmentAllocationPdf } from '../services/workOrderPdfService.js';

const router = express.Router();

router.get(
  '/',
  withAccess,
  asyncHandler(async (req, res) => {
    const { category, subtype, onlyAvailable } = req.query;
    const equipment = await listEquipment({
      category: typeof category === 'string' ? category : undefined,
      subtype: typeof subtype === 'string' ? subtype : undefined,
      onlyAvailable: onlyAvailable === 'true'
    });
    res.json({ success: true, equipment });
  })
);

router.post(
  '/allocate',
  withAccess,
  asyncHandler(async (req, res) => {
    const { itemId, caseId, staffId, assignedFrom, assignedTo, notes, metadata } = req.body;
    const allocation = await allocateEquipment(itemId, caseId, staffId || req.staff?.id, {
      assigned_from: assignedFrom,
      assigned_to: assignedTo,
      notes,
      metadata
    });
    res.json({ success: true, allocation });
  })
);

router.post(
  '/return',
  withAccess,
  asyncHandler(async (req, res) => {
    const { allocationId, conditionStatus, status, notes } = req.body;
    const result = await returnEquipment(allocationId, {
      conditionStatus,
      status,
      notes
    });
    res.json({ success: true, allocation: result });
  })
);

router.get(
  '/allocations/:caseId',
  withAccess,
  asyncHandler(async (req, res) => {
    const allocations = await listEquipmentAllocations(req.params.caseId);
    res.json({ success: true, allocations });
  })
);

router.post(
  '/allocations/:allocationId/pdf',
  withAccess,
  asyncHandler(async (req, res) => {
    const buffer = await buildEquipmentAllocationPdf(req.params.allocationId);
    res.json({ success: true, pdf: buffer.toString('base64') });
  })
);

export default router;

