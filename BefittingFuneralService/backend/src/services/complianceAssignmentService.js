import pool from '../db/database.js';
import {
  listTemplateItems,
  getComplianceTemplateById,
  listTemplateDocuments
} from './complianceTemplateService.js';

export async function cloneComplianceTemplateForCase(caseId, templateId, version = 'v1') {
  const template = await getComplianceTemplateById(templateId);
  if (!template) {
    throw new Error('Compliance template not found');
  }

  const [items, documents] = await Promise.all([
    listTemplateItems(templateId),
    listTemplateDocuments(templateId)
  ]);

  if (!items.length && !documents.length) {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE cases
       SET compliance_template_id = $1,
           compliance_template_version = $2
       WHERE id = $3`,
      [templateId, version || template.version || 'v1', caseId]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO compliance_checklist_items
          (case_id, category, item_key, description, required_stage, is_required, status, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,'pending', $7)`,
        [
          caseId,
          item.category,
          item.item_key,
          item.description,
          item.required_stage,
          item.is_required,
          {
            template_item_id: item.id,
            requiresEvidence: item.requires_evidence,
            defaultSlaHours: item.default_sla_hours
          }
        ]
      );
    }

    for (const doc of documents) {
      const slaDueAt =
        doc.sla_hours && Number.isFinite(doc.sla_hours)
          ? new Date(Date.now() + doc.sla_hours * 60 * 60 * 1000)
          : null;

      await client.query(
        `INSERT INTO required_documents_status
          (case_id, document_type, label, required_stage, is_required, status, metadata, sla_due_at, notes)
         VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,NULL)
         ON CONFLICT (case_id, document_type) DO NOTHING`,
        [
          caseId,
          doc.document_type,
          doc.label,
          doc.required_stage,
          doc.is_required,
          {
            template_document_id: doc.id,
            requiresEvidence: doc.requires_evidence
          },
          slaDueAt
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

