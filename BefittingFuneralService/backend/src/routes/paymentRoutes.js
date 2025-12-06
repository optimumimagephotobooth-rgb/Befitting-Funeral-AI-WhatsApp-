import express from 'express';
import { requireStaffOrApiKey } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { PaymentService } from '../services/paymentService.js';
import { Case } from '../models/Case.js';
import { logCaseEvent, logStaffEvent } from '../services/supabaseService.js';

const router = express.Router();
const paymentService = new PaymentService();

async function ensureCase(caseId) {
  const caseRecord = await Case.findById(caseId);
  if (!caseRecord) {
    const error = new Error('Case not found');
    error.status = 404;
    throw error;
  }
  return caseRecord;
}

router.post(
  '/:caseId/payments/request',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { amount, paymentType } = req.body || {};
    const caseRecord = await ensureCase(caseId);
    const requestedAmount = amount ?? caseRecord.deposit_amount ?? caseRecord.total_amount ?? 0;
    const response = await paymentService.requestPaymentConfirmation(caseId, requestedAmount, paymentType);
    const staffId = req.staff?.staffId || req.staff?.id || null;
    const staffName = req.staff?.name || 'Unknown';
    await logCaseEvent({
      case_id: caseId,
      event_type: 'PAYMENT_INSTRUCTIONS_SENT',
      stage: caseRecord.stage || caseRecord.status || null,
      metadata: {
        amount: requestedAmount,
        paymentType: paymentType || 'deposit',
        staffId,
        staffName
      }
    });
    await logStaffEvent({
      staff_id: staffId,
      actor_id: staffId,
      actor_name: staffName,
      event_type: 'PAYMENT_INSTRUCTIONS_SENT',
      metadata: {
        caseId,
        amount: requestedAmount,
        paymentType: paymentType || 'deposit'
      }
    });
    res.json({ success: true, data: response });
  })
);

router.post(
  '/:caseId/payments/auto-detect',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { phoneNumber, amount } = req.body || {};
    const caseRecord = await ensureCase(caseId);
    const expectedAmount = amount ?? caseRecord.deposit_amount ?? caseRecord.total_amount ?? 0;
    const result = await paymentService.autoDetectPayment(phoneNumber || caseRecord.contact_phone, expectedAmount);
    const staffId = req.staff?.staffId || req.staff?.id || null;
    const staffName = req.staff?.name || 'Unknown';
    await logCaseEvent({
      case_id: caseId,
      event_type: 'PAYMENT_AUTO_DETECTED',
      stage: caseRecord.stage || caseRecord.status || null,
      metadata: {
        amount: result.amount || expectedAmount,
        method: result.method || 'unknown',
        verified: !!result.verified,
        staffId,
        staffName
      }
    });
    await logStaffEvent({
      staff_id: staffId,
      actor_id: staffId,
      actor_name: staffName,
      event_type: 'PAYMENT_AUTO_DETECTED',
      metadata: {
        caseId,
        method: result.method || 'unknown',
        verified: !!result.verified
      }
    });
    res.json({ success: true, data: result });
  })
);

router.post(
  '/:caseId/payments/confirm',
  requireStaffOrApiKey,
  asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { method, amount, paymentType } = req.body || {};
    if (!method || !amount) {
      return res.status(400).json({ success: false, error: 'method and amount are required' });
    }
    await ensureCase(caseId);
    const result = await paymentService.confirmPayment(caseId, { method, amount, paymentType });
    const staffId = req.staff?.staffId || req.staff?.id || null;
    const staffName = req.staff?.name || 'Unknown';
    await logCaseEvent({
      case_id: caseId,
      event_type: 'PAYMENT_CONFIRMED',
      stage: 'COMPLETED',
      metadata: {
        amount,
        method,
        paymentType: paymentType || 'deposit',
        staffId,
        staffName
      }
    });
    await logStaffEvent({
      staff_id: staffId,
      actor_id: staffId,
      actor_name: staffName,
      event_type: 'PAYMENT_CONFIRMED',
      metadata: {
        caseId,
        amount,
        method
      }
    });
    res.json({ success: true, data: result });
  })
);

export default router;

