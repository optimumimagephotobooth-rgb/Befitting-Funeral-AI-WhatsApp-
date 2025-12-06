import pool from '../db/database.js';

export async function listCemeteryPlots(filters = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;
  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters.section) {
    conditions.push(`section = $${idx++}`);
    values.push(filters.section);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM cemetery_plots ${where} ORDER BY section, row, plot_number`,
    values
  );
  return rows;
}

export async function createCemeteryPlot(payload) {
  const { section, row, plot_number, status = 'AVAILABLE', metadata = {} } = payload;
  const { rows } = await pool.query(
    `
    INSERT INTO cemetery_plots (section, row, plot_number, status, metadata)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
  `,
    [section, row, plot_number, status, metadata]
  );
  return rows[0];
}

export async function updateCemeteryPlot(id, updates) {
  const keys = Object.keys(updates);
  const assignments = [];
  const values = [];
  keys.forEach((key, idx) => {
    assignments.push(`${key} = $${idx + 1}`);
    values.push(updates[key]);
  });
  if (!assignments.length) return null;
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE cemetery_plots SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0];
}

export async function assignBurial(payload) {
  const { case_id, plot_id, burial_time, workers = [], metadata = {} } = payload;
  const { rows } = await pool.query(
    `
    INSERT INTO burial_assignments (case_id, plot_id, burial_time, workers, metadata)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
  `,
    [case_id, plot_id, burial_time, workers, metadata]
  );
  await pool.query(`UPDATE cemetery_plots SET status = 'RESERVED' WHERE id = $1`, [plot_id]);
  return rows[0];
}

export async function listBurialAssignments(caseId) {
  const { rows } = await pool.query(
    `
    SELECT b.*, p.section, p.row, p.plot_number
    FROM burial_assignments b
    LEFT JOIN cemetery_plots p ON p.id = b.plot_id
    WHERE b.case_id = $1
  `,
    [caseId]
  );
  return rows;
}

