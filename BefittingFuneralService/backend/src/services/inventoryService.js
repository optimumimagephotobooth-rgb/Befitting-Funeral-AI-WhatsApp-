import pool from '../db/database.js';

function buildUpdateClause(payload) {
  const keys = Object.keys(payload);
  if (!keys.length) return { clause: '', values: [] };
  const assignments = [];
  const values = [];
  keys.forEach((key, idx) => {
    assignments.push(`${key} = $${idx + 1}`);
    values.push(payload[key]);
  });
  return { clause: assignments.join(', '), values };
}

export async function listInventoryItems({ category, status, search } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (category) {
    conditions.push(`category = $${idx++}`);
    values.push(category);
  }
  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }
  if (search) {
    conditions.push(`name ILIKE $${idx++}`);
    values.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM inventory_items ${where} ORDER BY name ASC`,
    values
  );
  return rows;
}

export async function createInventoryItem(payload) {
  const {
    name,
    category,
    quantity = 1,
    unit_cost,
    status = 'ACTIVE',
    metadata = {},
    license_plate = null,
    mileage = 0,
    last_service_date = null
  } = payload;
  const { rows } = await pool.query(
    `
    INSERT INTO inventory_items (
      name, category, quantity, unit_cost, status, metadata,
      license_plate, mileage, last_service_date
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `,
    [
      name,
      category,
      quantity,
      unit_cost ?? null,
      status,
      metadata,
      license_plate,
      mileage,
      last_service_date
    ]
  );
  return rows[0];
}

export async function updateInventoryItem(id, payload) {
  const { clause, values } = buildUpdateClause(payload);
  if (!clause) return null;
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE inventory_items SET ${clause}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0];
}

export async function createInventoryReservation(payload) {
  const {
    item_id,
    case_id,
    reserved_quantity,
    reserved_from,
    reserved_to,
    created_by,
    metadata = {}
  } = payload;

  const { rows } = await pool.query(
    `
    INSERT INTO inventory_reservations (
      item_id, case_id, reserved_quantity, reserved_from,
      reserved_to, created_by, metadata
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
  `,
    [item_id, case_id, reserved_quantity, reserved_from, reserved_to, created_by, metadata]
  );
  return rows[0];
}

export async function getCaseInventory(caseId) {
  const { rows } = await pool.query(
    `
    SELECT
      r.*,
      i.name as item_name,
      i.category,
      i.status as item_status,
      i.quantity as on_hand,
      i.license_plate,
      i.metadata as item_metadata
    FROM inventory_reservations r
    JOIN inventory_items i ON i.id = r.item_id
    WHERE r.case_id = $1
    ORDER BY r.reserved_from ASC
  `,
    [caseId]
  );
  return rows;
}

export async function checkoutReservation(reservationId, staffId, conditionOut = '') {
  const { rows } = await pool.query(
    `
      UPDATE inventory_reservations
      SET status = 'CHECKED_OUT'
      WHERE id = $1
      RETURNING *
    `,
    [reservationId]
  );
  const reservation = rows[0];
  if (!reservation) {
    return null;
  }

  const log = await pool.query(
    `
    INSERT INTO inventory_checkout_log (
      reservation_id, checked_out_by, condition_out
    ) VALUES ($1,$2,$3) RETURNING *
  `,
    [reservationId, staffId, conditionOut]
  );

  return { reservation, log: log.rows[0] };
}

export async function checkinReservation(reservationId, staffId, conditionIn = '') {
  const { rows } = await pool.query(
    `
      UPDATE inventory_reservations
      SET status = 'RETURNED'
      WHERE id = $1
      RETURNING *
    `,
    [reservationId]
  );
  const reservation = rows[0];
  if (!reservation) {
    return null;
  }

  const logResult = await pool.query(
    `
      UPDATE inventory_checkout_log
      SET checked_in_by = $1, checked_in_at = now(), condition_in = $2
      WHERE reservation_id = $3 AND checked_in_at IS NULL
      RETURNING *
    `,
    [staffId, conditionIn, reservationId]
  );

  return { reservation, log: logResult.rows[0] };
}

export async function listInventoryAlerts() {
  const lowStock = await pool.query(
    `
      SELECT id, name, category, quantity
      FROM inventory_items
      WHERE quantity <= 2 AND status = 'ACTIVE'
      ORDER BY quantity ASC
    `
  );

  const overdueReservations = await pool.query(
    `
      SELECT r.*, i.name as item_name
      FROM inventory_reservations r
      JOIN inventory_items i ON i.id = r.item_id
      WHERE r.status = 'CHECKED_OUT' AND r.reserved_to < now()
      ORDER BY r.reserved_to ASC
    `
  );

  return {
    lowStock: lowStock.rows,
    overdue: overdueReservations.rows
  };
}

