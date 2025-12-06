import pool from '../db/database.js';
import { AIService } from '../../shared/ai/aiService.js';
import { evaluateAutomationRules } from './automationRulesService.js';
import { buildCaseSummaryContext } from './aiCaseSummaryService.js';
import { createPdfBuffer } from './pdfService.js';

const aiService = new AIService();

async function loadAggregateStats() {
  const [caseStats, automationStats, staffActivity] = await Promise.all([
    pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE stage != 'COMPLETED')::int AS active,
        COUNT(*) FILTER (WHERE stage = 'COMPLETED')::int AS completed,
        COUNT(*) FILTER (WHERE stage NOT IN ('COMPLETED','NEW'))::int AS inProgress
      FROM cases`
    ),
    pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE metadata->>'automation_key' IS NOT NULL AND created_at >= NOW() - INTERVAL '24 hours')::int AS alerts_24h,
        COUNT(*) FILTER (WHERE level = 'high' AND created_at >= NOW() - INTERVAL '24 hours')::int AS high_risk_24h
      FROM forecast_events`
    ),
    pool.query(
      `SELECT actor_name, COUNT(*) AS activity_count
       FROM staff_events
       WHERE created_at >= NOW() - INTERVAL '48 hours'
       GROUP BY actor_name
       ORDER BY activity_count DESC
       LIMIT 10`
    )
  ]);

  return {
    cases: caseStats.rows[0] || { active: 0, completed: 0, inprogress: 0 },
    automationAlerts: automationStats.rows[0] || { alerts_24h: 0, high_risk_24h: 0 },
    staffActivity: staffActivity.rows || []
  };
}

async function loadCaseIntelligence() {
  const cases = await pool.query("SELECT id, case_ref FROM cases WHERE stage != 'COMPLETED' LIMIT 50");
  const summaries = [];
  for (const row of cases.rows) {
    const context = await buildCaseSummaryContext(row.id);
    const automationAlerts = evaluateAutomationRules(context);
    summaries.push({
      caseId: row.id,
      caseRef: row.case_ref,
      stage: context.stage,
      alerts: automationAlerts,
      recentMessages: context.messages.slice(0, 3)
    });
  }
  return summaries;
}

export async function generateSupervisorIntel() {
  const [aggregates, caseIntel] = await Promise.all([loadAggregateStats(), loadCaseIntelligence()]);

  const payload = {
    aggregates,
    caseIntel
  };

  const prompt = `
You are Praxion's Executive Intelligence AI for funeral directors.

Given this JSON context, produce a strategic briefing with these sections:
1. Operational Overview (paragraph)
2. Predicted Workload for next 48 hours (bullet summary)
3. Top 5 Risks (list with case references)
4. Staff Efficiency Report (highlight best performers + bottlenecks)
5. Recommended Action Plan (bullet list)

Return JSON:
{
  "overview": "string",
  "workload": ["..."],
  "risks": [{ "caseRef": "string", "summary": "string" }],
  "staffEfficiency": ["..."],
  "actions": ["..."]
}

Context:
${JSON.stringify(payload, null, 2)}
`;

  const aiResponse = await aiService.complete({
    prompt,
    max_tokens: 900,
    temperature: 0.4
  });

  let parsed;
  try {
    parsed = JSON.parse(aiResponse);
  } catch (error) {
    parsed = {
      overview: aiResponse.slice(0, 400),
      workload: [],
      risks: [],
      staffEfficiency: [],
      actions: []
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    aggregates,
    summary: parsed
  };
}

export function buildSupervisorVoiceSummary(intel) {
  const lines = [];
  if (intel.summary?.overview) {
    lines.push(`Overview: ${intel.summary.overview}`);
  }
  if (intel.summary?.workload?.length) {
    lines.push(`Workload outlook: ${intel.summary.workload.slice(0, 2).join('. ')}`);
  }
  if (intel.summary?.risks?.length) {
    const topRisk = intel.summary.risks[0];
    lines.push(`Top risk: ${topRisk.caseRef || 'case'} — ${topRisk.summary}`);
  }
  if (intel.summary?.actions?.length) {
    lines.push(`Recommended actions: ${intel.summary.actions.slice(0, 2).join('. ')}`);
  }
  return lines.join(' ');
}

export async function generateSupervisorIntelPdf(intel) {
  const metadata = {
    'Generated At': intel.generatedAt,
    'Active Cases': intel.aggregates.cases.active,
    'High Risk (48h)': intel.aggregates.automationAlerts.high_risk_24h
  };
  const sections = [
    '=== Operational Overview ===',
    intel.summary.overview || 'No overview available.',
    '',
    '=== Predicted Workload (48h) ===',
    intel.summary.workload?.join('\n') || 'No workload forecast.',
    '',
    '=== Top Risks ===',
    (intel.summary.risks || [])
      .map((risk) => `• ${risk.caseRef || 'Case'}: ${risk.summary}`)
      .join('\n') || 'No risks detected.',
    '',
    '=== Staff Efficiency ===',
    intel.summary.staffEfficiency?.join('\n') || 'No staff efficiency notes.',
    '',
    '=== Action Plan (24–48h) ===',
    intel.summary.actions?.map((action) => `• ${action}`).join('\n') || 'No actions available.'
  ];

  return createPdfBuffer('Supervisor Intelligence Report', metadata, sections.join('\n'));
}



