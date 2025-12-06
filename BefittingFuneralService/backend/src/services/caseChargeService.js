import pool from '../db/database.js';

function mapCharge(row) {
  if (!row) return null;
  return {
    id: row.id,
    caseId: row.case_id,
    description: row.description,
    amount: Number(row.amount) || 0,
    quantity: row.quantity || 1,
    category: row.category || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata || {}
  };
}

export async function listCaseCharges(caseId) {
  const result = await pool.query(
    `
      SELECT *
      FROM case_charges
      WHERE case_id = $1
      ORDER BY created_at ASC
    `,
    [caseId]
  );
  return result.rows.map(mapCharge);
}

export async function createCaseCharge(caseId, payload, staffId = null) {
  const result = await pool.query(
    `
      INSERT INTO case_charges (case_id, description, amount, quantity, category, created_by, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      caseId,
      payload.description,
      payload.amount ?? 0,
      payload.quantity ?? 1,
      payload.category || null,
      staffId,
      payload.metadata || {}
    ]
  );
  return mapCharge(result.rows[0]);
}

export async function updateCaseCharge(caseId, chargeId, payload) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (payload.description !== undefined) {
    fields.push(`description = $${idx++}`);
    values.push(payload.description);
  }
  if (payload.amount !== undefined) {
    fields.push(`amount = $${idx++}`);
    values.push(payload.amount);
  }
  if (payload.quantity !== undefined) {
    fields.push(`quantity = $${idx++}`);
    values.push(payload.quantity);
  }
  if (payload.category !== undefined) {
    fields.push(`category = $${idx++}`);
    values.push(payload.category);
  }
  if (payload.metadata !== undefined) {
    fields.push(`metadata = $${idx++}`);
    values.push(payload.metadata);
  }

  if (!fields.length) {
    const result = await pool.query(
      'SELECT * FROM case_charges WHERE id = $1 AND case_id = $2',
      [chargeId, caseId]
    );
    return mapCharge(result.rows[0]);
  }

  fields.push('updated_at = now()');
  values.push(chargeId);
  values.push(caseId);

  const result = await pool.query(
    `UPDATE case_charges SET ${fields.join(', ')} WHERE id = $${idx++} AND case_id = $${idx} RETURNING *`,
    values
  );
  return mapCharge(result.rows[0]);
}

export async function deleteCaseCharge(caseId, chargeId) {
  await pool.query('DELETE FROM case_charges WHERE id = $1 AND case_id = $2', [chargeId, caseId]);
}

