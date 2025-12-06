import axios from 'axios';
import { config } from '../config/config.js';
import { routeIncomingMessage } from './messageRouter.js';
import { logger } from '../utils/logger.js';

/**
 * WhatsApp Business API Webhook Handler
 * Supports Meta WhatsApp Cloud API webhook verification and message handling
 */
// See docs/whatsapp-flow.md for how this module fits into the WhatsApp pipeline.

/**
 * WhatsApp webhook verification (GET)
 * Used by Meta to confirm your endpoint.
 */
export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    logger.info('✅ WEBHOOK_VERIFIED');
    return res.status(200).send(challenge);
  }

  logger.warn('❌ Webhook verification failed');
  return res.sendStatus(403);
}

/**
 * WhatsApp webhook handler (POST)
 */
export async function handleWebhook(req, res) {
  try {
    const body = req.body;
    
    // Basic WhatsApp structure guard
    if (
      body.object === 'whatsapp_business_account' &&
      Array.isArray(body.entry) &&
      body.entry[0]?.changes
    ) {
      const changes = body.entry[0].changes;
      
      for (const change of changes) {
        // Handle status updates
        if (change.value?.statuses) {
          logger.debug('📊 Message status update:', change.value.statuses);
          continue;
        }
        
        // Handle incoming messages
        const messages = change.value?.messages;
        if (Array.isArray(messages)) {
          for (const message of messages) {
            await routeIncomingMessage(message, change.value);
          }
        }
      }
    }

    // Always return 200 to acknowledge receipt
    res.sendStatus(200);
  } catch (err) {
    logger.error('❌ Error handling webhook:', err);
    res.sendStatus(500);
  }
}

// Send message via WhatsApp Business API
export async function sendMessage(phoneNumber, messageText) {
  try {
    const phoneNumberId = config.whatsapp.phoneNumberId;
    const accessToken = config.whatsapp.accessToken;
    const version = config.whatsapp.apiVersion;

    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp API credentials not configured');
    }

    // Format phone number (remove + and ensure it's international format)
    const formattedNumber = phoneNumber.replace(/[^0-9]/g, '');

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to: formattedNumber,
      type: 'text',
      text: {
        body: messageText
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    logger.success(`✅ Message sent via API: ${response.data.messages[0].id}`);
    return { success: true, messageId: response.data.messages[0].id };
  } catch (error) {
    logger.error('❌ Error sending message via API:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}
