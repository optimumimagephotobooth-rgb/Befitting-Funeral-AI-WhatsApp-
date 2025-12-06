import { MessageHandler } from '../services/messageHandler.js';
import { AIService } from '../../../shared/ai/aiService.js';
import { sendMessage } from './webhook.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

// See docs/whatsapp-flow.md for how this module fits into the WhatsApp pipeline.

let messageHandler = null;

/**
 * Initialize message handler for routing
 */
function getMessageHandler() {
  if (!messageHandler) {
    const aiService = new AIService();
    const WebhookService = {
      sendMessage: async (phoneNumber, message) => {
        const cleanNumber = phoneNumber.replace('@c.us', '');
        return sendMessage(cleanNumber, message);
      }
    };
    messageHandler = new MessageHandler(WebhookService, aiService);
  }
  return messageHandler;
}

function toInternalMessage(payload, metadata = null) {
  const mode = config.whatsapp.mode;
  const cloudMessage =
    mode === 'cloud'
      ? payload ?? metadata?.messages?.[0]
      : payload;

  const raw = cloudMessage ?? payload ?? metadata;
  const text = cloudMessage?.text?.body || cloudMessage?.body || '';
  const messageType = cloudMessage?.type || 'text';
  const contact = metadata?.contacts?.[0] ?? cloudMessage?.contact;
  const profileName = contact?.profile?.name || cloudMessage?.profileName || '';
  const contactId = contact?.wa_id || contact?.waId;

  return {
    from: cloudMessage?.from || payload?.from || contactId || '',
    body: text,
    id: cloudMessage?.id,
    timestamp: cloudMessage?.timestamp,
    type: messageType,
    contact,
    profileName,
    raw
  };
}

/**
 * Route incoming WhatsApp message
 * This is the main entry point for processing incoming messages
 * 
 * @param {Object} message - WhatsApp message object from webhook
 * @param {Object} metadata - Webhook metadata containing contacts, etc.
 */
export async function routeIncomingMessage(message, metadata) {
  try {
    const internal = toInternalMessage(message, metadata);

    logger.info(`📨 Incoming from ${internal.from}: ${internal.body}`);

    if (internal.type !== 'text' || !internal.body) {
      logger.debug(`⚠️ Skipping non-text message type: ${internal.type}`);
      return;
    }

    const handler = getMessageHandler();
    await handler.handleMessage(internal);
  } catch (error) {
    logger.error('❌ Error routing message:', error);
    try {
      await sendMessage(
        message?.from || metadata?.contacts?.[0]?.wa_id || '',
        'I apologize, but I encountered an error processing your message. Please try again or contact us directly.'
      );
    } catch (sendError) {
      logger.error('Failed to send error message:', sendError);
    }
  }
}
