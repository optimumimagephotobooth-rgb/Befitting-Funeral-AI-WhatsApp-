import express from 'express';
import { requireStaffOrApiKey } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errorHandler.js';
import {
  getFuneralDayPayload,
  upsertFuneralEvent,
  updateFuneralEventStatus,
  updateFuneralEventTask,
  upsertFuneralStaffAssignment,
  upsertFuneralVehicle,
  upsertFuneralVenue,
  addVenueChecklistItem,
  generateFuneralDayBriefing
} from '../services/funeralDayService.js';

const router = express.Router();

router.get(
  '/:caseId/funeral-day',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const data = await getFuneralDayPayload(caseId);
    res.json({ success: true, data });
  })
);

router.post(
  '/:caseId/funeral-events',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const payload = { case_id: caseId, ...req.body };
    const event = await upsertFuneralEvent(caseId, payload);
    res.json({ success: true, data: event });
  })
);

router.patch(
  '/funeral-events/:eventId/status',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const updates = req.body || {};
    const event = await updateFuneralEventStatus(eventId, updates);
    res.json({ success: true, data: event });
  })
);

router.patch(
  '/funeral-event-tasks/:taskId',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const updates = req.body || {};
    const task = await updateFuneralEventTask(taskId, updates);
    res.json({ success: true, data: task });
  })
);

router.post(
  '/:caseId/funeral-staff',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const payload = { case_id: caseId, ...req.body };
    const record = await upsertFuneralStaffAssignment(payload);
    res.json({ success: true, data: record });
  })
);

router.post(
  '/:caseId/funeral-vehicles',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const payload = { case_id: caseId, ...req.body };
    const record = await upsertFuneralVehicle(payload);
    res.json({ success: true, data: record });
  })
);

router.post(
  '/:caseId/funeral-venues',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const payload = { case_id: caseId, ...req.body };
    const record = await upsertFuneralVenue(payload);
    res.json({ success: true, data: record });
  })
);

router.post(
  '/:caseId/funeral-venues/:venueId/checklist',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { venueId } = req.params;
    const payload = { venue_id: venueId, ...req.body };
    const record = await addVenueChecklistItem(payload);
    res.json({ success: true, data: record });
  })
);

router.post(
  '/:caseId/funeral-briefing/ai',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const briefing = await generateFuneralDayBriefing(caseId);
    res.json({ success: true, data: briefing });
  })
);

export default router;

