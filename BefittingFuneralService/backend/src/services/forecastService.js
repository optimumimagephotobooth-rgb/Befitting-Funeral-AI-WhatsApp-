import pool from '../db/database.js';
import { logCaseEvent } from './supabaseService.js';

const RISK_LEVELS = [
  { label: 'low', threshold: 30 },
  { label: 'medium', threshold: 60 },
  { label: 'high', threshold: 80 }
];

async function fetchCaseContext(caseId) {
  const [caseResult, docResult, chargeResult, eventResult] = await Promise.all([
    pool.query('SELECT * FROM cases WHERE id = $1', [caseId]),
    pool.query('SELECT COUNT(*)::integer as count FROM case_documents WHERE case_id = $1', [caseId]),
    pool.query('SELECT COUNT(*)::integer as count FROM case_charges WHERE case_id = $1', [caseId]),
    pool.query(
      `SELECT event_type, created_at
         FROM case_events
        WHERE case_id = $1
        ORDER BY created_at DESC
        LIMIT 10`,
      [caseId]
    )
  ]);

  return {
    caseRecord: caseResult.rows[0],
    documentCount: docResult.rows[0]?.count ?? 0,
    chargeCount: chargeResult.rows[0]?.count ?? 0,
    recentEvents: eventResult.rows
  };
}

function computeRiskScore({ caseRecord, documentCount, recentEvents }) {
  if (!caseRecord) return { score: 0, indicators: [] };

  const indicators = [];
  let score = 10;

  const createdAt = caseRecord.created_at ? new Date(caseRecord.created_at) : new Date();
  const hoursOpen = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursOpen > 72 && caseRecord.stage === 'NEW') {
    indicators.push('Case has been idle in NEW for more than 72 hours.');
    score += 35;
  } else if (hoursOpen > 48 && caseRecord.stage === 'INTAKE') {
    indicators.push('Intake taking longer than expected (48h+).');
    score += 25;
  }

  if (documentCount === 0 && ['DOCUMENTS', 'QUOTE', 'SCHEDULED'].includes(caseRecord.stage)) {
    indicators.push('No documents uploaded for document-centric stage.');
    score += 20;
  }

  const lastEvent = recentEvents[0];
  if (lastEvent) {
    const hoursSinceEvent = (Date.now() - new Date(lastEvent.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceEvent > 24) {
      indicators.push('No timeline activity in the last 24 hours.');
      score += 15;
    }
  }

  score = Math.min(100, score);
  return { score, indicators };
}

function determineLevel(score) {
  if (score >= RISK_LEVELS[2].threshold) return 'high';
  if (score >= RISK_LEVELS[1].threshold) return 'medium';
  if (score >= RISK_LEVELS[0].threshold) return 'low';
  return 'calm';
}

export async function getCaseForecast(caseId) {
  const context = await fetchCaseContext(caseId);
  const { score, indicators } = computeRiskScore(context);
  const level = determineLevel(score);

  const summaryByLevel = {
    high: 'Immediate attention required.',
    medium: 'Monitor closely, workflow delays detected.',
    low: 'On track with minor follow-ups.',
    calm: 'Everything looks steady.'
  };

  return {
    caseId,
    riskScore: score,
    level,
    summary: summaryByLevel[level] || summaryByLevel.calm,
    indicators
  };
}

export async function logForecastEvent(caseId, forecast) {
  const previous = await pool.query(
    `SELECT level, risk_score
       FROM forecast_events
      WHERE case_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [caseId]
  );

  const previousLevel = previous.rows[0]?.level;
  const previousScore = previous.rows[0]?.risk_score ?? 0;

  const { rows } = await pool.query(
    `INSERT INTO forecast_events (case_id, risk_score, level, summary, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [caseId, forecast.riskScore, forecast.level, forecast.summary, JSON.stringify({ indicators: forecast.indicators })]
  );

  await logCaseEvent({
    case_id: caseId,
    event_type: 'FORECAST',
    stage: forecast.level,
    metadata: {
      forecastId: rows[0]?.id,
      riskScore: forecast.riskScore,
      level: forecast.level,
      summary: forecast.summary,
      previousLevel,
      previousScore
    }
  });
}

