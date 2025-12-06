import pool from '../db/database.js';

function mapTemplate(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    documentType: row.document_type,
    description: row.description,
    htmlTemplate: row.html_template,
    isActive: row.is_active,
    metadata: row.metadata || {},
    updatedAt: row.updated_at,
    createdBy: row.created_by
  };
}

export async function listDocumentTemplates({ includeInactive = false } = {}) {
  const result = await pool.query(
    `
      SELECT *
      FROM document_templates
      ${includeInactive ? '' : 'WHERE is_active = true'}
      ORDER BY updated_at DESC
    `
  );
  return result.rows.map(mapTemplate);
}

export async function getDocumentTemplateById(templateId) {
  const result = await pool.query('SELECT * FROM document_templates WHERE id = $1', [templateId]);
  return mapTemplate(result.rows[0]);
}

export async function createDocumentTemplate(payload, staffId = null) {
  const result = await pool.query(
    `
      INSERT INTO document_templates (
        name, document_type, description, html_template, is_active, created_by, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      payload.name,
      payload.documentType,
      payload.description || null,
      payload.htmlTemplate,
      payload.isActive ?? true,
      staffId,
      payload.metadata || {}
    ]
  );
  return mapTemplate(result.rows[0]);
}

export async function updateDocumentTemplate(templateId, payload) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (payload.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(payload.name);
  }
  if (payload.documentType !== undefined) {
    fields.push(`document_type = $${paramIndex++}`);
    values.push(payload.documentType);
  }
  if (payload.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(payload.description);
  }
  if (payload.htmlTemplate !== undefined) {
    fields.push(`html_template = $${paramIndex++}`);
    values.push(payload.htmlTemplate);
  }
  if (payload.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(payload.isActive);
  }
  if (payload.metadata !== undefined) {
    fields.push(`metadata = $${paramIndex++}`);
    values.push(payload.metadata);
  }

  if (!fields.length) {
    return getDocumentTemplateById(templateId);
  }

  fields.push(`updated_at = now()`);
  values.push(templateId);

  const result = await pool.query(
    `UPDATE document_templates SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return mapTemplate(result.rows[0]);
}

export async function deleteDocumentTemplate(templateId) {
  await pool.query('DELETE FROM document_templates WHERE id = $1', [templateId]);
}

