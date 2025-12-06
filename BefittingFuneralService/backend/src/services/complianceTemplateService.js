import pool from '../db/database.js';

export async function listActiveComplianceTemplates() {
  const { rows } = await pool.query(
    `SELECT *
     FROM compliance_templates
     WHERE is_active = true
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function getComplianceTemplateById(templateId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM compliance_templates
     WHERE id = $1`,
    [templateId]
  );
  return rows[0] || null;
}

export async function getDefaultComplianceTemplate() {
  const { rows } = await pool.query(
    `SELECT *
     FROM compliance_templates
     WHERE is_active = true
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 1`
  );
  return rows[0] || null;
}

export async function listTemplateItems(templateId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM compliance_template_items
     WHERE template_id = $1
     ORDER BY sort_order ASC, category ASC`,
    [templateId]
  );
  return rows;
}

export async function listTemplateDocuments(templateId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM compliance_template_documents
     WHERE template_id = $1
     ORDER BY sort_order ASC, label ASC`,
    [templateId]
  );
  return rows;
}

export async function createComplianceTemplate({
  name,
  jurisdiction,
  facility_type,
  version,
  metadata
}) {
  const { rows } = await pool.query(
    `INSERT INTO compliance_templates (name, jurisdiction, facility_type, version, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, jurisdiction, facility_type, version || 'v1', metadata || {}]
  );
  return rows[0];
}

export async function addTemplateItem(templateId, item) {
  const { rows } = await pool.query(
    `INSERT INTO compliance_template_items
      (template_id, category, item_key, description, required_stage, is_required, default_sla_hours, requires_evidence, metadata, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      templateId,
      item.category,
      item.item_key,
      item.description,
      item.required_stage,
      item.is_required ?? true,
      item.default_sla_hours ?? null,
      item.requires_evidence ?? false,
      item.metadata || {},
      item.sort_order ?? 0
    ]
  );
  return rows[0];
}

