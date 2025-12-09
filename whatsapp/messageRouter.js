import { MessageHandler } from '../services/messageHandler.js';
import { AIService } from '../ai/aiService.js';
import { sendMessage } from './webhook.js';

let messageHandler = null;

/**
 * Initialize message handler for routing
 */
function getMessageHandler() {
  if (!messageHandler) {
    const aiService = new AIService();
    const WebhookService = {
      sendMessage: async (phoneNumber, message) => {
        // Remove @c.us suffix if present (for webhook mode)
        const cleanNumber = phoneNumber.replace('@c.us', '');
        return sendMessage(cleanNumber, message);
      }
    };
    messageHandler = new MessageHandler(WebhookService, aiService);
  }
  return messageHandler;
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
    const from = message.from; // WhatsApp phone number
    const text = message.text?.body || "";
    const profileName = metadata?.contacts?.[0]?.profile?.name || "";

    console.log(`📨 Incoming from ${from}: ${text}`);

    // Skip if not a text message
    if (message.type !== 'text' || !text) {
      console.log(`⚠️ Skipping non-text message type: ${message.type}`);
      return;
    }

    // Create a message-like object compatible with our handler
    const messageObj = {
      from: from,
      body: text,
      id: message.id,
      timestamp: message.timestamp,
      type: message.type,
      contact: metadata?.contacts?.[0],
      profileName: profileName,
      raw: message
    };

    // Route to message handler (which handles DB, stage logic, AI, etc.)
    const handler = getMessageHandler();
    await handler.handleMessage(messageObj);
  } catch (error) {
    console.error('❌ Error routing message:', error);
    // Optionally send error message to user
    try {
      await sendMessage(
        message.from, 
        'I apologize, but I encountered an error processing your message. Please try again or contact us directly.'
      );
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
}
