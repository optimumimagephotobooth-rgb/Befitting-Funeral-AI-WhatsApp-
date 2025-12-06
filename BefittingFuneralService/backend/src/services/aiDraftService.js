import { Case } from '../models/Case.js';
import { Contact } from '../models/Contact.js';
import { Message } from '../models/Message.js';
import { AIService } from '../../shared/ai/aiService.js';
import { logCaseEvent } from './supabaseService.js';
import { sendMessage as sendWhatsappMessage } from '../whatsapp/webhook.js';

const aiDraftService = new AIService();

function buildConversationHistory(messages = []) {
  return [...messages].reverse().map((msg) => ({
    role: msg.direction === 'OUTBOUND' ? 'assistant' : 'user',
    content: msg.body
  }));
}

function buildCaseContext(caseRecord, contact, tone) {
  return {
    caseRef: caseRecord.case_ref,
    stage: caseRecord.stage || caseRecord.status || 'NEW',
    contactName: contact?.name || 'Family',
    contactPhone: contact?.phone_number || '',
    tone: tone || 'condolence'
  };
}

export async function generateAIDraft(caseId, { prompt, tone } = {}, staff = {}) {
  const caseRecord = await Case.findById(caseId);
  if (!caseRecord) {
    const error = new Error('Case not found');
    error.status = 404;
    throw error;
  }

  const contact = caseRecord.contact_id ? await Contact.findById(caseRecord.contact_id) : null;
  const recentMessages = await Message.findRecentByCaseId(caseId, 10);
  const latestInbound = recentMessages.find((msg) => msg.direction === 'INBOUND');
  const userMessage = prompt?.trim() || latestInbound?.body;

  if (!userMessage) {
    const error = new Error('No inbound message found to base a draft on.');
    error.status = 400;
    throw error;
  }

  const stage = caseRecord.stage || caseRecord.status || 'NEW';
  const conversationHistory = buildConversationHistory(recentMessages);
  const context = buildCaseContext(caseRecord, contact, tone);
  const draft = await aiDraftService.generateResponse(userMessage, conversationHistory, stage, context);

  await logCaseEvent({
    case_id: caseId,
    event_type: 'DRAFT_GENERATED',
    stage,
    metadata: {
      preview: draft.slice(0, 160),
      staffId: staff.id || staff.staffId || null,
      staffName: staff.name || 'Unknown'
    }
  });

  return {
    draft,
    stage
  };
}

export async function generateDraftReply(messageText, caseContext = {}, stage = 'NEW') {
  const conversationHistory = caseContext.conversationHistory || [];
  const draft = await aiDraftService.generateResponse(
    messageText,
    conversationHistory,
    stage,
    caseContext
  );
  return draft;
}

export async function sendDraftMessage(caseId, body, staff = {}) {
  const caseRecord = await Case.findById(caseId);
  if (!caseRecord) {
    const error = new Error('Case not found');
    error.status = 404;
    throw error;
  }

  if (!caseRecord.contact_id) {
    const error = new Error('Case has no contact assigned');
    error.status = 400;
    throw error;
  }

  const contact = await Contact.findById(caseRecord.contact_id);
  if (!contact?.phone_number) {
    const error = new Error('Contact has no phone number');
    error.status = 400;
    throw error;
  }

  const messageText = body.trim();
  if (!messageText) {
    const error = new Error('Message body is required');
    error.status = 400;
    throw error;
  }

  const sendResult = await sendWhatsappMessage(contact.phone_number, messageText);
  if (!sendResult.success) {
    const error = new Error(sendResult.error || 'Failed to send message');
    error.status = 500;
    throw error;
  }

  await Message.create({
    case_id: caseId,
    direction: 'OUTBOUND',
    from_number: contact.phone_number,
    body: messageText,
    raw: {
      staffId: staff.id || staff.staffId || null,
      staffName: staff.name || 'Unknown'
    },
    intent: null,
    flow: 'manual'
  });

  await logCaseEvent({
    case_id: caseId,
    event_type: 'OUTBOUND_MESSAGE',
    stage: caseRecord.stage || caseRecord.status,
    metadata: {
      preview: messageText.slice(0, 120),
      staffId: staff.id || staff.staffId || null,
      staffName: staff.name || 'Unknown'
    }
  });

  return { success: true };
}

