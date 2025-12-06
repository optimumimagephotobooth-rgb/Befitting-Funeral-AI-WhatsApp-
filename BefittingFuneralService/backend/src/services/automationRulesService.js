import pool from '../db/database.js';
import { logCaseEvent } from './supabaseService.js';

const HOURS = 60 * 60 * 1000;

function hoursSince(date) {
  if (!date) return Infinity;
  return (Date.now() - new Date(date).getTime()) / HOURS;
}

const SLA_THRESHOLDS_HOURS = {
  STALE_COMMUNICATION: 6,
  STAGE_STALLED: 12,
  MISSING_DOCUMENTS: 12,
  TRANSPORT_NOT_SCHEDULED: 4,
  HIGH_RISK: 3,
  EQUIPMENT_OVERDUE: 4,
  EQUIPMENT_DAMAGED: 2,
  TOMBSTONE_DELAYED: 6
};

function buildAlert(type, overrides = {}) {
  return {
    type,
    severity: overrides.severity || 'medium',
    title: overrides.title || 'Operational alert',
    description: overrides.description || '',
    recommendedAction: overrides.recommendedAction || '',
    key: overrides.key || type,
    slaDueAt:
      overrides.slaDueAt ||
      new Date(Date.now() + (SLA_THRESHOLDS_HOURS[type] || 12) * 60 * 60 * 1000).toISOString()
  };
}

function checkInactivity(context) {
  const inbound = context.messages?.find((msg) => msg.direction?.toUpperCase() === 'INBOUND');
  const lastInboundHours = hoursSince(inbound?.created_at);
  if (lastInboundHours < 72) return [];
  return [
    buildAlert('STALE_COMMUNICATION', {
      severity: 'high',
      title: 'No family update in 3 days',
      description: `Last inbound message was ${Math.round(lastInboundHours)}h ago.`,
      recommendedAction: 'Call the family to reassure them and capture updates.',
      key: 'STALE_COMMUNICATION'
    })
  ];
}

function checkStageStall(context) {
  const stage = context.stage;
  const stageEvents = [...(context.events || [])]
    .filter((evt) => evt.event_type === 'STAGE_CHANGE')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latestStageChange = stageEvents[0]?.created_at || context.caseDetails?.updated_at;
  const hours = hoursSince(latestStageChange);
  const thresholds = {
    NEW: 48,
    INTAKE: 72,
    DOCUMENTS: 96,
    QUOTE: 72,
    SCHEDULED: 48
  };
  const limit = thresholds[stage] || 96;
  if (hours < limit) return [];
  return [
    buildAlert('STAGE_STALLED', {
      severity: 'medium',
      title: `Case stuck in ${stage}`,
      description: `Case has been in ${stage} for ${Math.round(hours)}h.`,
      recommendedAction: 'Review workflow blockers and advance the case.',
      key: `STAGE_STALLED_${stage}`
    })
  ];
}

function checkTransportBooked(context) {
  if (context.stage !== 'SCHEDULED') return [];
  const hasTransportTask = (context.tasks || []).some((task) =>
    `${task.title || task.name || ''}`.toLowerCase().includes('transport')
  );
  if (hasTransportTask) return [];
  return [
    buildAlert('TRANSPORT_NOT_SCHEDULED', {
      severity: 'high',
      title: 'Service scheduled but no transport booked',
      description: 'No transport-related task found while case is in SCHEDULED stage.',
      recommendedAction: 'Confirm transport bookings and log a task.',
      key: 'TRANSPORT_NOT_SCHEDULED'
    })
  ];
}

function checkMissingDocuments(context) {
  if (!['DOCUMENTS', 'QUOTE', 'SCHEDULED'].includes(context.stage)) return [];
  if ((context.documents || []).length > 0) return [];
  return [
    buildAlert('MISSING_DOCUMENTS', {
      severity: 'medium',
      title: 'Missing key documents',
      description: 'No case documents uploaded for document-centric stage.',
      recommendedAction: 'Upload statutory documents or contact the family.',
      key: 'MISSING_DOCUMENTS'
    })
  ];
}

const RULES = [checkInactivity, checkStageStall, checkTransportBooked, checkMissingDocuments];

export function evaluateAutomationRules(context) {
  return RULES.flatMap((rule) => {
    const alerts = rule(context) || [];
    return alerts.map((alert) => ({
      ...alert,
      key: alert.key || `${alert.type}_${context.caseDetails?.id}`
    }));
  });
}

export async function persistAutomationAlerts(caseId, alerts = []) {
  for (const alert of alerts) {
    const existing = await pool.query(
      `SELECT id FROM automation_alerts
       WHERE case_id = $1 AND alert_key = $2 AND status = 'open'
       LIMIT 1`,
      [caseId, alert.key]
    );
    if (existing.rows.length) continue;

    const { rows } = await pool.query(
      `INSERT INTO automation_alerts
        (case_id, alert_key, alert_type, severity, title, description, recommended_action, metadata, sla_due_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, severity, title, recommended_action, sla_due_at`,
      [
        caseId,
        alert.key,
        alert.type,
        alert.severity,
        alert.title,
        alert.description,
        alert.recommendedAction || null,
        JSON.stringify(alert.metadata || {}),
        alert.slaDueAt ? new Date(alert.slaDueAt) : null
      ]
    );

    await logCaseEvent({
      case_id: caseId,
      event_type: 'AUTOMATION_ALERT',
      stage: alert.severity,
      metadata: {
        automationAlertId: rows[0]?.id,
        automationKey: alert.key,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        recommendedAction: alert.recommendedAction || null,
        slaDueAt: rows[0]?.sla_due_at || alert.slaDueAt || null
      }
    });
  }
}

const TYPE_BUCKETS = {
  STALE_COMMUNICATION: 'stale',
  STAGE_STALLED: 'stalled',
  MISSING_DOCUMENTS: 'missingDocs',
  TRANSPORT_NOT_SCHEDULED: 'transport',
  HIGH_RISK: 'highRisk'
};

export async function listOpenAutomationAlerts() {
  const { rows } = await pool.query(
    `SELECT aa.id,
            aa.case_id,
            c.case_ref,
            aa.alert_key,
            aa.alert_type,
            aa.severity,
            aa.title,
            aa.description,
            aa.recommended_action,
            aa.created_at,
            aa.sla_due_at,
            aa.breached_at
     FROM automation_alerts aa
     LEFT JOIN cases c ON c.id = aa.case_id
     WHERE aa.status = 'open'
     ORDER BY aa.created_at DESC`
  );

  const byType = {
    stale: 0,
    stalled: 0,
    missingDocs: 0,
    transport: 0,
    highRisk: 0
  };
  const caseMap = new Map();

  rows.forEach((row) => {
    const bucket = TYPE_BUCKETS[row.alert_type] || 'stale';
    byType[bucket] = (byType[bucket] || 0) + 1;

    if (!caseMap.has(row.case_id)) {
      caseMap.set(row.case_id, {
        caseId: row.case_id,
        caseRef: row.case_id,
        alerts: []
      });
    }
    caseMap.get(row.case_id).alerts.push({
      id: row.id,
      key: row.alert_key,
      type: row.alert_type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      recommendedAction: row.recommended_action,
      slaDueAt: row.sla_due_at,
      breachedAt: row.breached_at
    });
    caseMap.get(row.case_id).caseRef = row.case_ref || row.case_id;
  });

  return {
    totalAlerts: rows.length,
    byType,
    cases: Array.from(caseMap.values())
  };
}

export async function listOpenAutomationAlertsByCase(caseId, includeHistory = false) {
  const open = await pool.query(
    `SELECT id, alert_key, alert_type, severity, title, description, recommended_action, created_at, sla_due_at, breached_at
     FROM automation_alerts
     WHERE case_id = $1 AND status = 'open'
     ORDER BY created_at DESC`,
    [caseId]
  );

  const history = includeHistory
    ? await pool.query(
        `SELECT id, alert_key, alert_type, severity, title, description, recommended_action, created_at, resolved_at, resolved_by, sla_due_at, breached_at
         FROM automation_alerts
         WHERE case_id = $1 AND status = 'resolved'
         ORDER BY resolved_at DESC
         LIMIT 20`,
        [caseId]
      )
    : { rows: [] };

  const mapRow = (row) => ({
    id: row.id,
    key: row.alert_key,
    type: row.alert_type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    recommendedAction: row.recommended_action,
    createdAt: row.created_at,
    slaDueAt: row.sla_due_at,
    breachedAt: row.breached_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by
  });

  return {
    open: open.rows.map(mapRow),
    history: history.rows.map(mapRow)
  };
}

export async function markBreachedAlerts() {
  await pool.query(
    `UPDATE automation_alerts
     SET breached_at = now()
     WHERE status = 'open'
       AND sla_due_at IS NOT NULL
       AND breached_at IS NULL
       AND sla_due_at < now()`
  );
}

export async function resolveAutomationAlert(alertId, staff = {}) {
  const resolvedById = staff?.id || staff?.staffId || null;
  const resolvedByName = staff?.name || null;

  const { rows } = await pool.query(
    `UPDATE automation_alerts
     SET status = 'resolved',
         resolved_at = now(),
         resolved_by = $2
     WHERE id = $1 AND status = 'open'
     RETURNING case_id, alert_key, title, severity, recommended_action, resolved_at`,
    [alertId, resolvedById]
  );

  const alert = rows[0];
  if (!alert) {
    return null;
  }

  await logCaseEvent({
    case_id: alert.case_id,
    event_type: 'AUTOMATION_ALERT_RESOLVED',
    stage: 'info',
      metadata: {
        automationAlertId: alertId,
        automationKey: alert.alert_key,
        title: alert.title,
        severity: alert.severity,
        recommendedAction: alert.recommended_action || null,
        resolvedBy: resolvedById,
        resolvedByName,
        resolvedAt: alert.resolved_at
      }
  });

  return alert;
}

export async function evaluateInventoryAutomations() {
  const { rows } = await pool.query(
    `SELECT id, name, quantity FROM inventory_items WHERE quantity <= 2 AND status = 'ACTIVE'`
  );
  for (const item of rows) {
    await logCaseEvent({
      case_id: null,
      event_type: 'INVENTORY_LOW_STOCK',
      stage: 'high',
      metadata: {
        itemId: item.id,
        name: item.name,
        quantity: item.quantity
      }
    });
  }
}

export async function evaluateMortuaryAutomations() {
  const { rows } = await pool.query(
    `SELECT id, case_id, name, intake_time
     FROM mortuary_bodies
     WHERE status != 'RELEASED'
       AND intake_time < NOW() - INTERVAL '72 hours'`
  );
  for (const body of rows) {
    await logCaseEvent({
      case_id: body.case_id || null,
      event_type: 'MORTUARY_BODY_OVERSTAY',
      stage: 'high',
      metadata: {
        bodyId: body.id,
        name: body.name,
        intake: body.intake_time
      }
    });
  }
}

export async function evaluateCemeteryAutomations() {
  const { rows } = await pool.query(
    `SELECT plot_id, array_agg(case_id) as cases, count(*) as total
     FROM burial_assignments
     GROUP BY plot_id
     HAVING count(*) > 1`
  );
  for (const conflict of rows) {
    const plot = await pool.query(
      `SELECT section, row, plot_number FROM cemetery_plots WHERE id = $1`,
      [conflict.plot_id]
    );
    await logCaseEvent({
      case_id: null,
      event_type: 'CEMETERY_PLOT_CONFLICT',
      stage: 'high',
      metadata: {
        plot: `${plot.rows[0]?.section || 'N/A'} · ${plot.rows[0]?.row || 'N/A'} · ${
          plot.rows[0]?.plot_number || 'N/A'
        }`,
        cases: conflict.cases
      }
    });
  }
}

function pushEquipmentAlert(alerts, caseId, alert) {
  if (!caseId) return;
  if (!alerts.has(caseId)) {
    alerts.set(caseId, []);
  }
  alerts.get(caseId).push(alert);
}

export async function evaluateEquipmentAutomations() {
  const alerts = new Map();

  const overdueRows = await pool.query(
    `SELECT ea.id,
            ea.case_id,
            ii.name,
            ea.assigned_from,
            ea.assigned_to,
            ea.status
     FROM equipment_allocations ea
     JOIN inventory_items ii ON ii.id = ea.item_id
     WHERE ea.status IN ('allocated', 'in_use')
       AND (
         (ea.assigned_to IS NOT NULL AND ea.assigned_to < NOW())
         OR (ea.assigned_to IS NULL AND ea.assigned_from < NOW() - INTERVAL '4 hours')
       )`
  );
  overdueRows.rows.forEach((row) => {
    const alert = buildAlert('EQUIPMENT_OVERDUE', {
      severity: 'high',
      title: `Equipment overdue: ${row.name}`,
      description: `Allocation ${row.status} since ${row.assigned_from || 'unknown'}.`,
      recommendedAction: 'Contact the assigned staff and retrieve/replace the equipment.',
      key: `EQUIPMENT_OVERDUE_${row.id}`
    });
    pushEquipmentAlert(alerts, row.case_id, alert);
  });

  const damagedRows = await pool.query(
    `SELECT ea.id,
            ea.case_id,
            ii.name,
            ea.status,
            ii.condition_status
     FROM equipment_allocations ea
     JOIN inventory_items ii ON ii.id = ea.item_id
     WHERE ea.status = 'damaged'
        OR ii.condition_status = 'DAMAGED'`
  );
  damagedRows.rows.forEach((row) => {
    const alert = buildAlert('EQUIPMENT_DAMAGED', {
      severity: 'high',
      title: `Damaged equipment: ${row.name}`,
      description: `Condition flagged as ${row.condition_status || 'damaged'}.`,
      recommendedAction: 'Inspect the equipment and book a repair or replacement.',
      key: `EQUIPMENT_DAMAGED_${row.id}`
    });
    pushEquipmentAlert(alerts, row.case_id, alert);
  });

  const delayedOrders = await pool.query(
    `SELECT id, case_id, status, scheduled_date
     FROM work_orders
     WHERE type = 'tombstone_installation'
       AND status = 'delayed'
       AND scheduled_date < NOW() - INTERVAL '1 hour'`
  );
  delayedOrders.rows.forEach((row) => {
    const alert = buildAlert('TOMBSTONE_DELAYED', {
      severity: 'medium',
      title: 'Tombstone installation delayed',
      description: `Installation scheduled for ${row.scheduled_date || 'N/A'} is marked delayed.`,
      recommendedAction: 'Follow up with the vendor and update the family.',
      key: `TOMBSTONE_DELAYED_${row.id}`
    });
    pushEquipmentAlert(alerts, row.case_id, alert);
  });

  return alerts;
}


