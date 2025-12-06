import { AIService } from '../../shared/ai/aiService.js';

const aiService = new AIService();

function buildLeadPrompt(payload) {
  const { channel = 'unknown', message = '', metadata = {} } = payload;
  return `
You are an AI assistant for a funeral services lead desk in Ghana.
Analyse the following inbound lead.

Return JSON:
{
  "urgency": 1-5,
  "serviceType": "burial|cremation|repatriation|memorial|other",
  "tone": "string",
  "keyDetails": {
    "name": "string",
    "location": "string",
    "date": "string",
    "notes": "string"
  },
  "suggestedReply": "string"
}

Channel: ${channel}
Message: ${message}
Metadata: ${JSON.stringify(metadata, null, 2)}
`;
}

export async function analyseLead(payload) {
  const prompt = buildLeadPrompt(payload);
  const aiResponse = await aiService.complete({
    prompt,
    max_tokens: 700,
    temperature: 0.35
  });

  try {
    return JSON.parse(aiResponse);
  } catch (err) {
    return {
      urgency: 3,
      serviceType: 'other',
      tone: 'Unable to parse AI response',
      keyDetails: { name: '', location: '', date: '', notes: aiResponse.slice(0, 200) },
      suggestedReply: 'Thank you for reaching out. Could you share more details?'
    };
  }
}


