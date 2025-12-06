import express from 'express';
import { requireStaffOrApiKey } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { listPaymentAudits } from '../services/supabaseService.js';

const router = express.Router();

router.get(
  '/payments/audit',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit || 12);
    const data = await listPaymentAudits({ limit });
    res.json({ success: true, data });
  })
);

export default router;

