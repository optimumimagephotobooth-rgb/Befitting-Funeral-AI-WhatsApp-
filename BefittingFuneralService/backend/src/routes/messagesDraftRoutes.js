import express from 'express';
import { asyncHandler } from '../utils/errorHandler.js';
import { generateDraftReply } from '../services/aiDraftService.js';

const router = express.Router();

router.post(
  '/draft',
  asyncHandler(async (req, res) => {
    const { messageText, caseContext, stage } = req.body || {};
    const draft = await generateDraftReply(messageText, caseContext, stage);
    res.json({ success: true, draft });
  })
);

export default router;

