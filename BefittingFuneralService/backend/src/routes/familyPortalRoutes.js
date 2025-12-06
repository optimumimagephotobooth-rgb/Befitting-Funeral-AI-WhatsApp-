import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { withFamilyPortalAccess } from '../middleware/familyPortalAuth.js';
import {
  requestPortalOtp,
  verifyPortalToken,
  loadFamilySummary,
  listFamilyDocuments,
  addFamilyDocument,
  listFamilyPayments,
  recordFamilyPayment,
  listFamilySchedule,
  listFamilyChat,
  addFamilyChat
} from '../services/familyPortalService.js';

const router = express.Router();

router.post(
  '/:caseId/login',
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { contact } = req.body;
    const payload = await requestPortalOtp(caseId, contact);
    res.json({ success: true, data: payload });
  })
);

router.post(
  '/:caseId/token/verify',
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { otp, token } = req.body;
    const session = await verifyPortalToken(caseId, otp, token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    res.json({ success: true, session });
  })
);

router.get(
  '/:caseId/summary',
  withFamilyPortalAccess,
  asyncHandler(async (req, res) => {
    const summary = await loadFamilySummary(req.familyPortal.caseId);
    if (!summary) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }
    res.json({ success: true, summary });
  })
);

router.get(
  '/:caseId/documents',
  withFamilyPortalAccess,
  asyncHandler(async (req, res) => {
    const documents = await listFamilyDocuments(req.familyPortal.caseId);
    res.json({ success: true, documents });
  })
);

router.post(
  '/:caseId/documents',
  withFamilyPortalAccess,
  asyncHandler(async (req, res) => {
    const created = await addFamilyDocument(req.familyPortal.caseId, req.body);
    const documents = await listFamilyDocuments(req.familyPortal.caseId);
    res.json({ success: true, created, documents });
  })
);

router.get(
  '/:caseId/payments',
  withFamilyPortalAccess,
  asyncHandler(async (req, res) => {
    const payments = await listFamilyPayments(req.familyPortal.caseId);
    res.json({ success: true, payments });
  })
);

router.post(
  '/:caseId/payments/upload',
  withFamilyPortalAccess,
  asyncHandler(async (req, res) => {
    const upload = await recordFamilyPayment(req.familyPortal.caseId, req.body);
    const payments = await listFamilyPayments(req.familyPortal.caseId);
    res.json({ success: true, upload, payments });
  })
);

router.get(
  '/:caseId/schedule',
  withFamilyPortalAccess,
  asyncHandler(async (req, res) => {
    const schedule = await listFamilySchedule(req.familyPortal.caseId);
    res.json({ success: true, schedule });
  })
);

router.get(
  '/:caseId/chat',
  withFamilyPortalAccess,
  asyncHandler(async (req, res) => {
    const chat = await listFamilyChat(req.familyPortal.caseId);
    res.json({ success: true, chat });
  })
);

router.post(
  '/:caseId/chat',
  withFamilyPortalAccess,
  asyncHandler(async (req, res) => {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message body is required' });
    }
    const created = await addFamilyChat(req.familyPortal.caseId, message);
    res.json({ success: true, message: created });
  })
);

router.post(
  '/:caseId/ai',
  withFamilyPortalAccess,
  asyncHandler(async (req, res) => {
    const { prompt, style } = req.body;
    const suggestion = `AI assistant is ready. Prompt: ${prompt || 'n/a'}. Style: ${style || 'story'}.`;
    res.json({ success: true, suggestion });
  })
);

export default router;

