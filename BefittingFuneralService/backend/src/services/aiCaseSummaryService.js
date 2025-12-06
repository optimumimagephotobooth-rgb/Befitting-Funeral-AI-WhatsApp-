import pool from '../db/database.js';
import { AIService } from '../../shared/ai/aiService.js';

export async function buildCaseSummaryContext(caseId) {
  const [
    caseDetailsResult,
    contactsResult,
    messagesResult,
    eventsResult,
    tasksResult,
    documentsResult,
    complianceAlertsResult
  ] = await Promise.all([
    pool.query('SELECT * FROM cases WHERE id = $1', [caseId]),
    pool.query('SELECT * FROM contacts WHERE case_id = $1', [caseId]),
    pool.query(
      `SELECT message, direction, created_at
       FROM messages
       WHERE case_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [caseId]
    ),
    pool.query('SELECT * FROM case_events WHERE case_id = $1 ORDER BY created_at ASC', [caseId]),
    pool.query('SELECT * FROM tasks WHERE case_id = $1', [caseId]),
    pool.query('SELECT * FROM case_documents WHERE case_id = $1', [caseId]),
    pool.query('SELECT * FROM compliance_alerts WHERE case_id = $1 AND resolved_at IS NULL', [caseId])
  ]);

  const caseDetails = caseDetailsResult.rows[0] || {};
  const contacts = contactsResult.rows || [];
  const messages = messagesResult.rows || [];
  const events = eventsResult.rows || [];
  const tasks = tasksResult.rows || [];
  const documents = documentsResult.rows || [];
  const complianceAlerts = complianceAlertsResult.rows || [];

  return {
    caseId,
    caseDetails,
    familyContacts: contacts,
    messages,
    events,
    tasks,
    documents,
    stage: caseDetails.stage || 'UNKNOWN',
    complianceAlerts
  };
}

const aiService = new AIService();

export async function generateCaseSummary(context) {
  const { caseDetails, familyContacts, messages, events, tasks, stage } = context;

  const prompt = `
You are an AI assistant for a funeral management team. 
Generate a calm, respectful, concise summary of the case.

Include:
1. A 3–6 sentence overview of the situation.
2. Key facts (bullet points).
3. Missing information or unresolved items.
4. Recommended next steps for the coordinator.

Case Details:
${JSON.stringify(caseDetails, null, 2)}

Family Contacts:
${JSON.stringify(familyContacts, null, 2)}

Recent Messages:
${JSON.stringify(messages.slice(0, 10), null, 2)}

Events Timeline:
${JSON.stringify(events, null, 2)}

Tasks:
${JSON.stringify(tasks, null, 2)}

Current Stage: ${stage}
`;

  const aiResponse = await aiService.complete({
    prompt,
    max_tokens: 500,
    temperature: 0.3
  });

  const text = aiResponse;
  const wordCount = text ? text.trim().split(/\s+/).length : 0;

  return {
    summary: text,
    generatedAt: new Date().toISOString(),
    wordCount,
    stage: context.stage || 'UNKNOWN'
  };
}

export async function generateAttentionItems(context) {
  const prompt = `
You are an AI assistant for a funeral management team.

Analyse the case and list areas that need attention.
Return SHORT bullet points grouped into categories.

Categories may include:
- Missing information
- Outstanding tasks
- Unconfirmed decisions
- Communication gaps
- Time-sensitive risks
- Stage inconsistencies

Return EXACTLY this JSON shape:

{
  "items": [
    { "category": "string", "item": "string" }
  ]
}

Case Context:
${JSON.stringify(context, null, 2)}
`;

  const aiResponse = await aiService.complete({
    prompt,
    max_tokens: 400,
    temperature: 0.3
  });

  let parsed;
  try {
    parsed = JSON.parse(aiResponse);
  } catch {
    parsed = { items: [] };
  }

  return parsed;
}

export async function generateDeepBriefing(context) {
  const prompt = `
You are an AI assistant for a funeral management team operating in Ghana.

Produce a deep operational briefing that can be read by senior coordinators.

Include:
- 1-2 paragraph overview (700-1000 tokens total output)
- Emotional tone scan derived from recent messages (what the family sounds like, stress indicators)
- Family relationship inference (who is leading decisions, any tensions, cultural considerations)
- Recommended operational strategy (actionable steps for the next 48-72 hours)
- Risk grade (Low | Medium | High) with justification

Return EXACTLY this JSON:
{
  "briefing": {
    "overview": "string",
    "emotionalTone": "string",
    "familyDynamics": "string",
    "operationalStrategy": "string",
    "riskGrade": "Low | Medium | High"
  }
}

Case Context:
${JSON.stringify(context, null, 2)}
`;

  const aiResponse = await aiService.complete({
    prompt,
    max_tokens: 900,
    temperature: 0.4
  });

  let parsed;
  try {
    parsed = JSON.parse(aiResponse);
  } catch {
    parsed = {
      briefing: {
        overview: aiResponse,
        emotionalTone: 'Unavailable',
        familyDynamics: 'Unavailable',
        operationalStrategy: 'Unavailable',
        riskGrade: 'Medium'
      }
    };
  }

  return {
    ...parsed,
    generatedAt: new Date().toISOString()
  };
}






