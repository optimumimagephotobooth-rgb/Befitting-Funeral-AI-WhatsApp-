import pool from '../db/database.js';

const CHECKLIST_STATUSES = ['pending', 'in_progress', 'completed', 'waived'];
const DOCUMENT_STATUSES = ['pending', 'submitted', 'verified', 'rejected', 'waived'];

export async function listCaseCompliance(caseId) {
  const [checklistResult, documentsResult] = await Promise.all([
    pool.query(
      `SELECT *
       FROM compliance_checklist_items
       WHERE case_id = $1
       ORDER BY required_stage NULLS LAST, sort_order NULLS LAST, created_at ASC`,
      [caseId]
    ),
    pool.query(
      `SELECT *
       FROM required_documents_status
       WHERE case_id = $1
       ORDER BY required_stage NULLS LAST, created_at ASC`,
      [caseId]
    )
  ]);

  return {
    checklist: checklistResult.rows || [],
    documents: documentsResult.rows || []
  };
}

export async function updateChecklistItemStatus(caseId, itemId, { status, notes, waivedReason, staffId }) {
  if (!status && notes === undefined && waivedReason === undefined) {
    return null;
  }

  if (status && !CHECKLIST_STATUSES.includes(status)) {
    const error = new Error('Invalid checklist status');
    error.status = 400;
    throw error;
  }

  const existingResult = await pool.query(
    `SELECT * FROM compliance_checklist_items WHERE id = $1 AND case_id = $2`,
    [itemId, caseId]
  );
  const existing = existingResult.rows[0];
  if (!existing) {
    const error = new Error('Checklist item not found');
    error.status = 404;
    throw error;
  }

  const sets = [];
  const values = [];
  let idx = 1;

  if (status) {
    sets.push(`status = $${idx}`);
    values.push(status);
    idx++;

    if (status === 'completed') {
      sets.push(`completed_by = $${idx}`);
      values.push(staffId || null);
      idx++;
      sets.push(`completed_at = now()`);
      sets.push(`waived_by = NULL`);
      sets.push(`waived_at = NULL`);
      sets.push(`waived_reason = NULL`);
    } else if (status === 'waived') {
      sets.push(`waived_by = $${idx}`);
      values.push(staffId || null);
      idx++;
      sets.push(`waived_at = now()`);
      sets.push(`waived_reason = $${idx}`);
      values.push(waivedReason || null);
      idx++;
      sets.push(`completed_by = NULL`);
      sets.push(`completed_at = NULL`);
    } else {
      sets.push(`completed_by = NULL`);
      sets.push(`completed_at = NULL`);
      sets.push(`waived_by = NULL`);
      sets.push(`waived_at = NULL`);
      sets.push(`waived_reason = NULL`);
    }
  } else if (waivedReason !== undefined) {
    sets.push(`waived_reason = $${idx}`);
    values.push(waivedReason);
    idx++;
  }

  if (notes !== undefined) {
    sets.push(`notes = $${idx}`);
    values.push(notes);
    idx++;
  }

  if (!sets.length) {
    return existing;
  }

  const { rows } = await pool.query(
    `UPDATE compliance_checklist_items
     SET ${sets.join(', ')}
     WHERE id = $${idx} AND case_id = $${idx + 1}
     RETURNING *`,
    [...values, itemId, caseId]
  );

  return rows[0] || null;
}

export async function updateDocumentStatus(caseId, documentId, { status, notes, waivedReason, staffId }) {
  if (!status && notes === undefined && waivedReason === undefined) {
    return null;
  }

  if (status && !DOCUMENT_STATUSES.includes(status)) {
    const error = new Error('Invalid document status');
    error.status = 400;
    throw error;
  }

  const existingResult = await pool.query(
    `SELECT *
     FROM required_documents_status
     WHERE id = $1 AND case_id = $2`,
    [documentId, caseId]
  );
  const existing = existingResult.rows[0];
  if (!existing) {
    const error = new Error('Document record not found');
    error.status = 404;
    throw error;
  }

  const sets = [];
  const values = [];
  let idx = 1;

  if (status) {
    sets.push(`status = $${idx}`);
    values.push(status);
    idx++;

    if (status === 'verified') {
      sets.push(`verified_by = $${idx}`);
      values.push(staffId || null);
      idx++;
      sets.push(`verified_at = now()`);
      sets.push(`waived_by = NULL`);
      sets.push(`waived_at = NULL`);
      sets.push(`waived_reason = NULL`);
    } else if (status === 'waived') {
      sets.push(`waived_by = $${idx}`);
      values.push(staffId || null);
      idx++;
      sets.push(`waived_at = now()`);
      sets.push(`waived_reason = $${idx}`);
      values.push(waivedReason || null);
      idx++;
      sets.push(`verified_by = NULL`);
      sets.push(`verified_at = NULL`);
    } else {
      sets.push(`verified_by = NULL`);
      sets.push(`verified_at = NULL`);
      sets.push(`waived_by = NULL`);
      sets.push(`waived_at = NULL`);
      sets.push(`waived_reason = NULL`);
    }
  } else if (waivedReason !== undefined) {
    sets.push(`waived_reason = $${idx}`);
    values.push(waivedReason);
    idx++;
  }

  if (notes !== undefined) {
    sets.push(`notes = $${idx}`);
    values.push(notes);
    idx++;
  }

  const { rows } = await pool.query(
    `UPDATE required_documents_status
     SET ${sets.join(', ')}
     WHERE id = $${idx} AND case_id = $${idx + 1}
     RETURNING *`,
    [...values, documentId, caseId]
  );

  return rows[0] || null;
}

