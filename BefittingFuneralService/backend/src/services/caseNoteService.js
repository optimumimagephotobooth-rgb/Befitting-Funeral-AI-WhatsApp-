import pool from '../db/database.js';

export async function listCaseNotes(caseId, { limit = 50 } = {}) {
  const result = await pool.query(
    `SELECT cn.*, s.name as staff_name
     FROM case_notes cn
     LEFT JOIN staff s ON s.id = cn.staff_id
     WHERE cn.case_id = $1
     ORDER BY cn.created_at DESC
     LIMIT $2`,
    [caseId, limit]
  );
  return result.rows;
}

export async function createCaseNote(caseId, { body, staffId }) {
  const result = await pool.query(
    `INSERT INTO case_notes (case_id, staff_id, body)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [caseId, staffId || null, body]
  );
  return result.rows[0];
}

