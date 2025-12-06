import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { withAccess } from '../middleware/authMiddleware.js';
import { listCaseEvents, listStaffEvents } from '../services/supabaseService.js';

const router = express.Router();

router.get(
  '/events',
  withAccess,
  asyncHandler(async (req, res) => {
    const [caseEvents, staffEvents] = await Promise.all([listCaseEvents(null, 30), listStaffEvents(30)]);
    res.json({
      success: true,
      events: [...caseEvents, ...staffEvents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    });
  })
);

export default router;

