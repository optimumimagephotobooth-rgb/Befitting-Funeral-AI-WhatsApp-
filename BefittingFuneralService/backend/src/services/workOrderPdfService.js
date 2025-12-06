import pool from '../db/database.js';
import { createPdfBuffer } from './pdfService.js';
import { logCaseEvent } from './supabaseService.js';

function formatCurrency(value) {
  if (!value && value !== 0) return 'N/A';
  return `₵ ${Number(value || 0).toFixed(2)}`;
}

export async function buildWorkOrderPdf(workOrderId) {
  const { rows } = await pool.query(
    `SELECT wo.*,
            c.case_ref,
            c.deceased_name,
            c.funeral_date,
            v.name AS vendor_name,
            (
              SELECT name
              FROM staff
              WHERE id = wo.created_by
              LIMIT 1
            ) AS assigned_staff,
            (
              SELECT contact_name || ' · ' || contact_phone
              FROM contacts
              WHERE case_id = wo.case_id
              LIMIT 1
            ) AS family_contact
     FROM work_orders wo
     LEFT JOIN cases c ON c.id = wo.case_id
     LEFT JOIN vendors v ON v.id = wo.vendor_id
     WHERE wo.id = $1
     LIMIT 1`,
    [workOrderId]
  );

  const workOrder = rows[0];
  if (!workOrder) {
    throw new Error('Work order not found');
  }

  const family = await pool.query(
    `SELECT name, phone, email
     FROM contacts
     WHERE case_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [workOrder.case_id]
  );
  const familyInfo = family.rows[0] || {};

  const charges = await pool.query(
    `SELECT description, amount, metadata
     FROM case_charges
     WHERE case_id = $1`,
    [workOrder.case_id]
  );
  const totalCost = charges.rows.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);
  const depositPaid = Number(workOrder.deposit_amount || workOrder.metadata?.deposit_paid || 0);
  const balanceRemaining = totalCost - depositPaid;

  const attachmentsRow = (workOrder.attachments || []).map((url) => `- ${url}`).join('\n') || 'None';
  const today = new Date().toISOString().split('T')[0];

  const body = `
Work Order ID: ${workOrder.id}
Case Reference: ${workOrder.case_ref || 'N/A'}
Deceased Name: ${workOrder.deceased_name || 'N/A'}
Family Representative: ${familyInfo.name || 'N/A'}
Contact: ${familyInfo.phone || familyInfo.email || 'N/A'}
Vendor Name: ${workOrder.vendor_name || 'Tombstone Contractor'}
Vendor Category: Tombstone Contractor
Assigned Staff: ${workOrder.assigned_staff || 'Coordinator TBD'}

Installation Details:
- Cemetery / Plot Location: ${workOrder.metadata?.plot_location || 'N/A'}
- Scheduled Date: ${workOrder.scheduled_date || 'TBD'}
- Expected Completion: ${workOrder.completed_date || 'TBD'}
- Required Materials: ${workOrder.metadata?.materials || 'N/A'}
- Inscription / Design File Attached: ${(workOrder.attachments || []).join(', ') || 'None'}

Financial Details:
- Total Cost: ${formatCurrency(totalCost)}
- Deposit Paid: ${formatCurrency(depositPaid)}
- Balance Remaining: ${formatCurrency(balanceRemaining)}

Attachments:
${attachmentsRow}

Notes:
${workOrder.notes || 'None'}

Sign-off:
Vendor Signature: _______________________
Praxion Staff Signature: ________________
Date: ${today}
`;

  const buffer = await createPdfBuffer('PRAXION — TOMBSTONE INSTALLATION WORK ORDER', {
    workOrderId: workOrder.id,
    caseRef: workOrder.case_ref || 'N/A'
  }, body);

  await logCaseEvent({
    case_id: workOrder.case_id,
    event_type: 'WORK_ORDER_PDF_GENERATED',
    stage: 'info',
    metadata: {
      workOrderId: workOrder.id,
      type: 'tombstone_installation'
    }
  });

  return buffer;
}

export async function buildEquipmentAllocationPdf(allocationId) {
  const { rows } = await pool.query(
    `SELECT ea.*,
            ii.name AS equipment_name,
            ii.subtype,
            ii.condition_status,
            c.case_ref,
            c.deceased_name,
            c.funeral_date,
            (
              SELECT name
              FROM staff
              WHERE id = ea.staff_id
              LIMIT 1
            ) AS staff_responsible
     FROM equipment_allocations ea
     JOIN inventory_items ii ON ii.id = ea.item_id
     JOIN cases c ON c.id = ea.case_id
     WHERE ea.id = $1
     LIMIT 1`,
    [allocationId]
  );

  const allocation = rows[0];
  if (!allocation) {
    throw new Error('Allocation not found');
  }

  const equipmentTable = [
    `Equipment: ${allocation.equipment_name}`,
    `Subtype: ${allocation.subtype || 'N/A'}`,
    `Condition Before Use: ${allocation.condition_status || 'N/A'}`,
    `Condition After Return: ${allocation.return_condition || 'N/A'}`
  ].join('\n');

  const body = `
Case Reference: ${allocation.case_ref}
Deceased Name: ${allocation.deceased_name || 'N/A'}
Coordinator: ${allocation.staff_responsible || 'Coordinator TBD'}
Funeral Date: ${allocation.funeral_date || 'TBD'}

Allocated Equipment:
${equipmentTable}

Staff Responsible: ${allocation.staff_responsible || 'TBD'}
Pickup Time: ${allocation.assigned_from ? new Date(allocation.assigned_from).toLocaleString() : 'TBD'}
Return Time (Expected): ${allocation.assigned_to ? new Date(allocation.assigned_to).toLocaleString() : 'TBD'}
Condition Before Use: ${allocation.metadata?.condition_before || allocation.condition_status || 'N/A'}
Condition After Return: ${allocation.return_condition || 'N/A'}

Notes:
${allocation.notes || 'None'}
`;

  const buffer = await createPdfBuffer('PRAXION — FUNERAL-DAY EQUIPMENT ALLOCATION FORM', {
    caseRef: allocation.case_ref,
    equipment: allocation.equipment_name
  }, body);

  await logCaseEvent({
    case_id: allocation.case_id,
    event_type: 'EQUIPMENT_ALLOCATION_PDF',
    stage: 'info',
    metadata: {
      allocationId,
      equipmentName: allocation.equipment_name
    }
  });

  return buffer;
}

export async function getWorkOrderPdfBuffer(workOrderId) {
  return buildWorkOrderPdf(workOrderId);
}

