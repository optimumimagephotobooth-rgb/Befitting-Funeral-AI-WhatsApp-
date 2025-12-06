import pool from '../db/database.js';

export async function listMortuaryBodies(filters = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;
  if (filters.caseId) {
    conditions.push(`case_id = $${idx++}`);
    values.push(filters.caseId);
  }
  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM mortuary_bodies ${where} ORDER BY intake_time DESC`,
    values
  );
  return rows;
}

export async function createMortuaryBody(payload) {
  const { case_id, name, sex, age, condition_notes, status = 'IN_STORAGE', metadata = {} } = payload;
  const { rows } = await pool.query(
    `
    INSERT INTO mortuary_bodies (case_id, name, sex, age, condition_notes, status, metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
  `,
    [case_id, name, sex, age, condition_notes, status, metadata]
  );
  return rows[0];
}

export async function updateMortuaryBody(id, updates) {
  const keys = Object.keys(updates);
  const assignments = [];
  const values = [];
  keys.forEach((key, index) => {
    assignments.push(`${key} = $${index + 1}`);
    values.push(updates[key]);
  });
  if (!assignments.length) return null;
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE mortuary_bodies SET ${assignments.join(', ')}, intake_time = intake_time WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0];
}

export async function recordMortuaryMovement(payload) {
  const { body_id, from_area, to_area, moved_at = new Date(), notes } = payload;
  const { rows } = await pool.query(
    `
    INSERT INTO mortuary_movements (body_id, from_area, to_area, moved_at, notes)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
  `,
    [body_id, from_area, to_area, moved_at, notes]
  );
  return rows[0];
}

export async function assignStorage(payload) {
  const { body_id, slot_number, stored_at = new Date() } = payload;
  const { rows } = await pool.query(
    `
    INSERT INTO mortuary_storage (body_id, slot_number, stored_at)
    VALUES ($1,$2,$3)
    RETURNING *
  `,
    [body_id, slot_number, stored_at]
  );
  return rows[0];
}

export async function releaseBody(bodyId, records = {}) {
  const { released_at = new Date(), metadata = {} } = records;
  await pool.query(
    `UPDATE mortuary_bodies SET status = 'RELEASED', metadata = metadata || $1 WHERE id = $2`,
    [metadata, bodyId]
  );
  const { rows } = await pool.query(
    `
    UPDATE mortuary_storage
    SET released_at = $1
    WHERE body_id = $2 AND released_at IS NULL
    RETURNING *
  `,
    [released_at, bodyId]
  );
  return rows[0];
}

