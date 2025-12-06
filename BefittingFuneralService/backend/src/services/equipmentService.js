import pool from '../db/database.js';
import { AppError } from '../utils/errorHandler.js';
import { logCaseEvent } from './supabaseService.js';
import { createPdfBuffer } from './pdfService.js';

const EQUIPMENT_STATUS = ['ACTIVE', 'DAMAGED', 'RETIRED'];
const EQUIPMENT_CONDITIONS = ['GOOD', 'FAIR', 'NEEDS_REPAIR', 'DAMAGED'];

export async function listEquipment({ category, subtype, onlyAvailable } = {}) {
  const conditions = [];
  const params = [];

  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  if (subtype) {
    params.push(subtype);
    conditions.push(`subtype = $${params.length}`);
  }
  if (onlyAvailable) {
    params.push(true);
    conditions.push(`is_available = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM inventory_items ${whereClause} ORDER BY name ASC`,
    params
  );
  return rows;
}

export async function allocateEquipment(itemId, caseId, staffId, payload = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: itemRows } = await client.query(
      `SELECT id, is_available FROM inventory_items WHERE id = $1 FOR UPDATE`,
      [itemId]
    );
    const item = itemRows[0];
    if (!item) {
      throw new AppError('Equipment not found', 404);
    }
    if (!item.is_available) {
      throw new AppError('Equipment already allocated or unavailable', 400);
    }

    const now = new Date().toISOString();
    const assignedFrom = payload.assigned_from || now;
    const assignedTo = payload.assigned_to || null;

    const { rows: allocationRows } = await client.query(
      `INSERT INTO equipment_allocations (item_id, case_id, staff_id, assigned_from, assigned_to, status, notes, metadata)
       VALUES ($1,$2,$3,$4,$5,'allocated',$6,$7)
       RETURNING *`,
      [itemId, caseId, staffId, assignedFrom, assignedTo, payload.notes || null, payload.metadata || {}]
    );

    await client.query(
      `UPDATE inventory_items
       SET is_available = false,
           usage_logs = usage_logs || jsonb_build_array(jsonb_build_object(
             'event','allocated',
             'case_id',$2,
             'staff_id',$3,
             'timestamp',NOW(),
             'notes',$6
           ))
       WHERE id = $1`,
      [itemId, caseId, staffId, assignedFrom, assignedTo, payload.notes || null]
    );

    await client.query('COMMIT');
    await logCaseEvent({
      case_id: caseId,
      event_type: 'EQUIPMENT_ALLOCATED',
      stage: 'info',
      metadata: {
        equipmentId: itemId,
        allocationId: allocationRows[0]?.id,
        staffId,
        notes: payload.notes || null
      }
    });
    return allocationRows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function returnEquipment(allocationId, { conditionStatus, status = 'returned', notes }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: allocationRows } = await client.query(
      `SELECT * FROM equipment_allocations WHERE id = $1 FOR UPDATE`,
      [allocationId]
    );
    const allocation = allocationRows[0];
    if (!allocation) {
      throw new AppError('Allocation not found', 404);
    }
    if (allocation.status === 'returned') {
      throw new AppError('Allocation already returned', 400);
    }

    const condition = EQUIPMENT_CONDITIONS.includes(conditionStatus)
      ? conditionStatus
      : 'GOOD';

    await client.query(
      `UPDATE equipment_allocations
       SET status = $1,
           return_condition = $2,
           notes = COALESCE(notes, '') || $3,
           assigned_to = COALESCE(assigned_to, NOW()),
           metadata = metadata || '{}'::JSONB,
           metadata = jsonb_set(metadata, '{last_returned_at}', to_jsonb(NOW()), true)
       WHERE id = $4`,
      [status, condition, notes || '', allocationId]
    );

    await client.query(
      `UPDATE inventory_items
       SET is_available = true,
           condition_status = $1,
           usage_logs = usage_logs || jsonb_build_array(jsonb_build_object(
             'event', 'returned',
             'allocation_id', $2,
             'timestamp', NOW(),
             'condition', $1,
             'notes', $3
           ))
       WHERE id = $2`,
      [condition, allocation.item_id, notes || '']
    );

    await client.query('COMMIT');
    await logCaseEvent({
      case_id: allocation.case_id,
      event_type: 'EQUIPMENT_RETURNED',
      stage: status === 'damaged' ? 'high' : 'info',
      metadata: {
        allocationId,
        equipmentId: allocation.item_id,
        condition,
        notes: notes || null
      }
    });
    return {
      ...allocation,
      status,
      return_condition: condition,
      notes: `${allocation.notes || ''} ${notes || ''}`.trim()
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listEquipmentAllocations(caseId) {
  const { rows } = await pool.query(
    `SELECT ea.*, ii.name AS equipment_name, ii.subtype, ii.condition_status
     FROM equipment_allocations ea
     JOIN inventory_items ii ON ii.id = ea.item_id
     WHERE ea.case_id = $1
     ORDER BY ea.status, ea.assigned_from`,
    [caseId]
  );
  return rows;
}

export async function listWorkOrdersByCase(caseId) {
  const { rows } = await pool.query(
    `SELECT wo.*, v.name as vendor_name
     FROM work_orders wo
     LEFT JOIN vendors v ON v.id = wo.vendor_id
     WHERE wo.case_id = $1
     ORDER BY wo.created_at DESC`,
    [caseId]
  );
  return rows;
}

export async function createTombstoneWorkOrder(caseId, vendorId, payload) {
  const { rows } = await pool.query(
    `INSERT INTO work_orders (tenant_id, case_id, vendor_id, type, status, scheduled_date, attachments, metadata, created_by, notes)
     VALUES (
       (SELECT tenant_id FROM cases WHERE id = $1),
       $1,
       $2,
       'tombstone_installation',
       $3,
       $4,
       $5,
       $6,
       $7,
       $8
     )
     RETURNING *`,
    [
      caseId,
      vendorId,
      payload.status || 'scheduled',
      payload.scheduled_date || null,
      payload.attachments || [],
      payload.metadata || {},
      payload.created_by || null,
      payload.notes || null
    ]
  );
  await logCaseEvent({
    case_id: caseId,
    event_type: 'TOMBSTONE_WORK_ORDER_SCHEDULED',
    stage: 'info',
    metadata: {
      workOrderId: rows[0]?.id,
      vendorId,
      scheduledDate: payload.scheduled_date || null
    }
  });
  return rows[0];
}

export async function updateWorkOrderStatus(workOrderId, status, updates = {}) {
  const validStatuses = ['scheduled', 'in_progress', 'delayed', 'completed'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid work order status', 400);
  }
  await pool.query(
    `UPDATE work_orders
     SET status = $1,
         completed_date = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_date END,
         metadata = metadata || $2,
         notes = COALESCE(notes, '') || $3,
         certificate_url = COALESCE(certificate_url, $4),
         updated_at = NOW()
     WHERE id = $5`,
    [
      status,
      updates.metadata || {},
      updates.notes || '',
      updates.certificate_url || null,
      workOrderId
    ]
  );
  let { rows } = await pool.query('SELECT * FROM work_orders WHERE id = $1', [workOrderId]);
  let updated = rows[0];
  if (status === 'completed' && !updated?.certificate_url) {
    await generateWorkOrderCertificate(workOrderId);
    const refreshed = await pool.query('SELECT * FROM work_orders WHERE id = $1', [workOrderId]);
    updated = refreshed.rows[0];
  }
  if (updated) {
    await logCaseEvent({
      case_id: updated.case_id,
      event_type: status === 'delayed' ? 'TOMBSTONE_VENDOR_ALERT' : 'TOMBSTONE_WORK_ORDER_STATUS_CHANGE',
      stage: status === 'delayed' ? 'high' : 'info',
      metadata: {
        workOrderId,
        status,
        vendorId: updated.vendor_id,
        scheduledDate: updated.scheduled_date
      }
    });
  }
  return updated;
}

export async function ensureVendor(category, vendorPayload) {
  const { rows } = await pool.query(
    `INSERT INTO vendors (tenant_id, name, category, contact_name, contact_phone, contact_email, notes, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (tenant_id,name,category) DO UPDATE SET contact_name = EXCLUDED.contact_name, contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email, notes = EXCLUDED.notes, metadata = EXCLUDED.metadata
     RETURNING *`,
    [
      vendorPayload.tenant_id,
      vendorPayload.name,
      category,
      vendorPayload.contact_name || null,
      vendorPayload.contact_phone || null,
      vendorPayload.contact_email || null,
      vendorPayload.notes || null,
      vendorPayload.metadata || {}
    ]
  );
  return rows[0];
}

export async function listVendorsByCategory(category) {
  const { rows } = await pool.query(
    `SELECT * FROM vendors WHERE category = $1 ORDER BY name ASC`,
    [category]
  );
  return rows;
}

export async function fetchWorkOrderById(workOrderId) {
  const { rows } = await pool.query(
    `SELECT wo.*, c.case_ref, c.deceased_name, v.name AS vendor_name
     FROM work_orders wo
     LEFT JOIN cases c ON c.id = wo.case_id
     LEFT JOIN vendors v ON v.id = wo.vendor_id
     WHERE wo.id = $1`,
    [workOrderId]
  );
  return rows[0];
}

export async function generateWorkOrderCertificate(workOrderId) {
  const workOrder = await fetchWorkOrderById(workOrderId);
  if (!workOrder) {
    throw new AppError('Work order not found', 404);
  }
  const metadata = {
    caseRef: workOrder.case_ref || 'N/A',
    deceased: workOrder.deceased_name || 'N/A',
    vendor: workOrder.vendor_name || 'Tombstone vendor',
    scheduled: workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toISOString() : 'TBD',
    completed: workOrder.completed_date ? new Date(workOrder.completed_date).toISOString() : 'TBD'
  };
  const body = `This certificate confirms completion of the tombstone installation for case ${metadata.caseRef}. Work order ${workOrder.id} has jurisdiction approval and vendor confirmation.`;
  const buffer = await createPdfBuffer('Tombstone Installation Certificate', metadata, body);
  const certificateUrl = `data:application/pdf;base64,${buffer.toString('base64')}`;
  await pool.query('UPDATE work_orders SET certificate_url = $1 WHERE id = $2', [certificateUrl, workOrderId]);
  await logCaseEvent({
    case_id: workOrder.case_id,
    event_type: 'TOMBSTONE_CERTIFICATE_GENERATED',
    stage: 'info',
    metadata: {
      workOrderId,
      certificateUrl
    }
  });
  return certificateUrl;
}

