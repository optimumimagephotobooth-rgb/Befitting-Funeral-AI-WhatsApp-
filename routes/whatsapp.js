/**
 * WhatsApp Cloud API Routes
 * Handles webhook verification and incoming messages
 */

import express from 'express';
import { verifyWebhook, handleWebhook } from '../whatsapp/webhook.js';
import { sendWhatsAppText } from '../whatsapp/client.js';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../utils/errorHandler.js';

const router = express.Router();

/**
 * GET /whatsapp/webhook
 * Webhook verification endpoint
 * Meta will call this to verify your webhook
 */
router.get('/webhook', verifyWebhook);

/**
 * POST /whatsapp/webhook
 * Webhook receiver endpoint
 * Meta sends incoming messages here
 */
router.post('/webhook', handleWebhook);

/**
 * GET /whatsapp/send-test
 * Test endpoint to send a WhatsApp message
 * Usage: GET /whatsapp/send-test?to=233XXXXXXXXX&message=Hello
 */
router.get('/send-test', asyncHandler(async (req, res) => {
  const { to, message } = req.query;

  if (!to || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: to and message'
    });
  }

  logger.info('Sending test WhatsApp message', { to, message });

  const result = await sendWhatsAppText(to, message);

  if (result.success) {
    res.json({
      success: true,
      message: 'Message sent successfully',
      messageId: result.messageId,
      to: result.to
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      details: result.details
    });
  }
}));

/**
 * POST /whatsapp/send
 * Send WhatsApp message via API
 * Body: { to: "233XXXXXXXXX", message: "Hello" }
 */
router.post('/send', asyncHandler(async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to and message'
    });
  }

  logger.info('Sending WhatsApp message via API', { to, messageLength: message.length });

  const result = await sendWhatsAppText(to, message);

  if (result.success) {
    res.json({
      success: true,
      message: 'Message sent successfully',
      messageId: result.messageId,
      to: result.to
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      details: result.details
    });
  }
}));

/**
 * GET /whatsapp/status
 * Get WhatsApp API status
 */
router.get('/status', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    status: 'connected',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'configured' : 'not configured',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? 'configured' : 'not configured'
  });
}));

export default router;

