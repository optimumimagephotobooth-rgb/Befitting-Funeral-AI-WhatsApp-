import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { withAccess } from '../middleware/authMiddleware.js';
import {
  generateSupervisorIntel,
  buildSupervisorVoiceSummary,
  generateSupervisorIntelPdf
} from '../services/supervisorIntelService.js';

const router = express.Router();

router.get(
  '/intel',
  withAccess,
  asyncHandler(async (req, res) => {
    const intel = await generateSupervisorIntel();
    res.json({ success: true, intel });
  })
);

router.get(
  '/intel/pdf',
  withAccess,
  asyncHandler(async (req, res) => {
    const intel = await generateSupervisorIntel();
    const buffer = await generateSupervisorIntelPdf(intel);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="supervisor-intel.pdf"');
    res.send(buffer);
  })
);

router.get(
  '/intel/voice',
  withAccess,
  asyncHandler(async (req, res) => {
    const intel = await generateSupervisorIntel();
    const transcript = buildSupervisorVoiceSummary(intel);
    res.json({ success: true, transcript, generatedAt: intel.generatedAt });
  })
);

export default router;


