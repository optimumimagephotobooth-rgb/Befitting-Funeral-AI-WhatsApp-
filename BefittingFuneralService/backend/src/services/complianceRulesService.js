import pool from '../db/database.js';

const REQUIRED_DOCS = [
  { type: 'removal_authorization', stage: 'INTAKE', slaHours: 2, severity: 'high' },
  { type: 'transport_log', stage: 'SCHEDULED', slaHours: 3, severity: 'high' },
  { type: 'storage_register_entry', stage: 'DOCUMENTS', slaHours: 24, severity: 'medium' },
  { type: 'burial_permit', stage: 'SERVICE DAY', slaHours: 12, severity: 'high' },
  { type: 'next_of_kin_form', stage: 'INTAKE', slaHours: 12, severity: 'medium' }
];

async function fetchCaseComplianceContext(caseId) {
  const [docs, checklist] = await Promise.all([
    pool.query(
      `SELECT * FROM required_documents_status WHERE case_id = $1`,
      [caseId]
    ),
    pool.query(
      `SELECT * FROM compliance_checklist_items WHERE case_id = $1`,
      [caseId]
    )
  ]);
  return {
    documents: docs.rows || [],
    checklist: checklist.rows || []
  };
}

function detectDocumentAlerts(caseContext, caseRecord) {
  const alerts = [];
  const stage = caseRecord.stage;
  for (const rule of REQUIRED_DOCS) {
    if (rule.stage && rule.stage !== stage) continue;
    const doc = caseContext.documents.find((d) => d.document_type === rule.type);
    const isMissing = !doc || doc.status !== 'verified';
    if (isMissing) {
      alerts.push({
        alert_type: `MISSING_${rule.type.toUpperCase()}`,
        severity: rule.severity,
        title: `Missing ${rule.type.replace(/_/g, ' ')}`,
        description: `Required document (${rule.type}) is not provided or not verified.`,
        sla_due_at: rule.slaHours
          ? new Date(Date.now() + rule.slaHours * 60 * 60 * 1000).toISOString()
          : null,
        metadata: { stage: rule.stage, type: rule.type }
      });
    }
  }
  return alerts;
}

function detectChecklistAlerts(caseContext) {
  const alerts = [];
  for (const item of caseContext.checklist) {
    if (item.is_required && item.status !== 'completed' && item.status !== 'waived') {
      alerts.push({
        alert_type: `CHECKLIST_${item.item_key.toUpperCase()}`,
        severity: 'medium',
        title: `Pending compliance item: ${item.category}`,
        description: item.description || 'Required compliance checklist item not completed.',
        metadata: {
          checklistItemId: item.id,
          requiredStage: item.required_stage
        }
      });
    }
  }
  return alerts;
}

export async function evaluateComplianceAlerts(caseRecord) {
  if (!caseRecord?.id) return [];
  const context = await fetchCaseComplianceContext(caseRecord.id);
  return [...detectDocumentAlerts(context, caseRecord), ...detectChecklistAlerts(context)];
}

export async function persistComplianceAlerts(caseId, alerts = []) {
export async function markComplianceBreaches() {
  await pool.query(
    `UPDATE compliance_alerts
     SET severity = CASE WHEN severity = 'low' THEN 'medium' ELSE severity END,
         metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{breached}', 'true'::jsonb, true),
         resolved_at = resolved_at,
         resolved_by = resolved_by
     WHERE status = 'open'
       AND sla_due_at IS NOT NULL
       AND sla_due_at < now()
       AND metadata->>'breached' IS DISTINCT FROM 'true'`
  );
}
  if (!alerts.length) return;
  for (const alert of alerts) {
    const exists = await pool.query(
      `SELECT id FROM compliance_alerts
       WHERE case_id = $1 AND alert_type = $2 AND resolved_at IS NULL
       LIMIT 1`,
      [caseId, alert.alert_type]
    );
    if (exists.rows.length) continue;

    await pool.query(
      `INSERT INTO compliance_alerts
        (case_id, alert_type, severity, title, description, recommended_action, sla_due_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        caseId,
        alert.alert_type,
        alert.severity,
        alert.title,
        alert.description,
        alert.recommended_action || null,
        alert.sla_due_at ? new Date(alert.sla_due_at) : null,
        alert.metadata || {}
      ]
    );
  }
}

