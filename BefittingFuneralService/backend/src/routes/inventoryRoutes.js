import express from 'express';
import { requireStaffOrApiKey } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errorHandler.js';
import {
  listInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  createInventoryReservation,
  checkoutReservation,
  checkinReservation,
  getCaseInventory,
  listInventoryAlerts
} from '../services/inventoryService.js';

const router = express.Router();

router.get(
  '/inventory/items',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const filters = {
      category: req.query.category,
      status: req.query.status,
      search: req.query.search
    };
    const data = await listInventoryItems(filters);
    res.json({ success: true, data });
  })
);

router.post(
  '/inventory/items',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const item = await createInventoryItem(payload);
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/inventory/items/:id',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};
    const item = await updateInventoryItem(id, updates);
    res.json({ success: true, data: item });
  })
);

router.post(
  '/inventory/reservations',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const reservation = await createInventoryReservation(payload);
    res.json({ success: true, data: reservation });
  })
);

router.patch(
  '/inventory/reservations/:id/checkout',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { staffId, conditionOut } = req.body || {};
    const result = await checkoutReservation(id, staffId, conditionOut || '');
    res.json({ success: true, data: result });
  })
);

router.patch(
  '/inventory/reservations/:id/checkin',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { staffId, conditionIn } = req.body || {};
    const result = await checkinReservation(id, staffId, conditionIn || '');
    res.json({ success: true, data: result });
  })
);

router.get(
  '/cases/:caseId/inventory',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const data = await getCaseInventory(caseId);
    res.json({ success: true, data });
  })
);

router.get(
  '/inventory/alerts',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const alerts = await listInventoryAlerts();
    res.json({ success: true, data: alerts });
  })
);

export default router;

