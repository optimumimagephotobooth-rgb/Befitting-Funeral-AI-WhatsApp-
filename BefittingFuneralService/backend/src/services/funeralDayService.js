import pool from '../db/database.js';
import { generateDeepBriefing } from './aiCaseSummaryService.js';

export async function getFuneralDayPayload(caseId) {
  const [eventsResult, tasksResult, staffResult, vehicleResult, venueResult, checklistResult] =
    await Promise.all([
      pool.query(
        `SELECT * FROM funeral_events WHERE case_id = $1 ORDER BY sequence_order ASC`,
        [caseId]
      ),
      pool.query(
        `SELECT t.*, e.code, e.label AS event_label
         FROM funeral_event_tasks t
         JOIN funeral_events e ON e.id = t.event_id
         WHERE e.case_id = $1
         ORDER BY t.created_at ASC`,
        [caseId]
      ),
      pool.query(
        `SELECT fa.*, s.name AS staff_name, s.phone AS staff_phone
         FROM funeral_staff_assignments fa
         LEFT JOIN staff s ON s.id = fa.staff_id
         WHERE fa.case_id = $1`,
        [caseId]
      ),
      pool.query(
        `SELECT * FROM funeral_vehicle_assignments WHERE case_id = $1 ORDER BY departure_time ASC`,
        [caseId]
      ),
      pool.query(
        `SELECT * FROM funeral_venues WHERE case_id = $1 ORDER BY venue_type ASC`,
        [caseId]
      ),
      pool.query(
        `SELECT * FROM funeral_venue_checklist_items WHERE venue_id IN (
           SELECT id FROM funeral_venues WHERE case_id = $1
         ) ORDER BY created_at ASC`,
        [caseId]
      )
    ]);

  return {
    events: eventsResult.rows,
    tasks: tasksResult.rows,
    staff: staffResult.rows,
    vehicles: vehicleResult.rows,
    venues: venueResult.rows,
    venueChecklist: checklistResult.rows
  };
}

export async function upsertFuneralEvent(caseId, payload) {
  if (payload.id) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const key of ['sequence_order', 'code', 'label', 'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end', 'status', 'notes', 'metadata']) {
      if (payload[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(payload[key]);
        idx++;
      }
    }
    values.push(payload.id);
    const result = await pool.query(
      `UPDATE funeral_events SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  }
  const insertResult = await pool.query(
    `INSERT INTO funeral_events (
       case_id, sequence_order, code, label, scheduled_start, scheduled_end,
       actual_start, actual_end, status, notes, metadata
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      caseId,
      payload.sequence_order,
      payload.code,
      payload.label,
      payload.scheduled_start || null,
      payload.scheduled_end || null,
      payload.actual_start || null,
      payload.actual_end || null,
      payload.status || 'PENDING',
      payload.notes || null,
      payload.metadata || {}
    ]
  );
  return insertResult.rows[0];
}

export async function updateFuneralEventStatus(eventId, updates) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const key of ['status', 'actual_start', 'actual_end', 'notes']) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(updates[key]);
      idx++;
    }
  }
  if (!fields.length) return null;
  values.push(eventId);
  const { rows } = await pool.query(
    `UPDATE funeral_events SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function updateFuneralEventTask(taskId, updates) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const key of ['status', 'assigned_staff_id', 'notes']) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(updates[key]);
      idx++;
    }
  }
  if (updates.completed_at !== undefined) {
    fields.push(`completed_at = $${idx}`);
    values.push(updates.completed_at);
    idx++;
  }
  if (!fields.length) return null;
  values.push(taskId);
  const { rows } = await pool.query(
    `UPDATE funeral_event_tasks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function upsertAssignment(table, data, columns) {
  const fields = columns.map((col) => col);
  const placeholders = fields.map((_, idx) => `$${idx + 1}`);
  const updateSet = fields.map((col, idx) => `${col} = EXCLUDED.${col}`).join(', ');
  const values = fields.map((col) => data[col]);
  const { rows } = await pool.query(
    `
      INSERT INTO ${table} (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (id) DO UPDATE
      SET ${updateSet}, metadata = EXCLUDED.metadata
      RETURNING *
    `,
    values
  );
  return rows[0];
}

export function upsertFuneralStaffAssignment(payload) {
  return upsertAssignment('funeral_staff_assignments', payload, [
    'id',
    'case_id',
    'role',
    'staff_id',
    'name_override',
    'contact_phone',
    'notes',
    'metadata'
  ]);
}

export function upsertFuneralVehicle(payload) {
  return upsertAssignment('funeral_vehicle_assignments', payload, [
    'id',
    'case_id',
    'vehicle_type',
    'vehicle_label',
    'driver_name',
    'driver_phone',
    'from_location',
    'to_location',
    'departure_time',
    'arrival_time',
    'notes',
    'metadata'
  ]);
}

export function upsertFuneralVenue(payload) {
  return upsertAssignment('funeral_venues', payload, [
    'id',
    'case_id',
    'venue_type',
    'name',
    'address',
    'contact_person',
    'contact_phone',
    'notes',
    'metadata'
  ]);
}

export async function addVenueChecklistItem(payload) {
  const { rows } = await pool.query(
    `INSERT INTO funeral_venue_checklist_items
      (venue_id, label, is_required, status, notes, metadata)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      payload.venue_id,
      payload.label,
      payload.is_required ?? true,
      payload.status || 'PENDING',
      payload.notes || null,
      payload.metadata || {}
    ]
  );
  return rows[0];
}

export async function generateFuneralDayBriefing(caseId) {
  const payload = await getFuneralDayPayload(caseId);
  const context = {
    events: payload.events,
    staff: payload.staff,
    vehicles: payload.vehicles,
    venues: payload.venues,
    checklist: payload.tasks,
    caseId
  };
  return generateDeepBriefing(context);
}

