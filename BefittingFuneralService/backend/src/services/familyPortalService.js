import pool from '../db/database.js';
import crypto from 'crypto';
import { serializeSafeCase } from '../../shared/family/safeCaseSerializer.js';

const OTP_TTL_MS = 48 * 60 * 60 * 1000;

async function resolveCaseByIdentifier(identifier) {
  if (!identifier) {
    return null;
  }
  const { rows } = await pool.query(
    `SELECT id, case_ref, status, stage, deceased_name, funeral_date, package_name, total_amount, deposit_amount, tenant_id
     FROM cases
     WHERE id = $1 OR case_ref = $1
     LIMIT 1`,
    [identifier]
  );
  return rows[0] || null;
}

async function fetchCaseContext(caseId) {
  const { rows } = await pool.query(
    `SELECT id, tenant_id, case_ref, status, stage, deceased_name, funeral_date, package_name, total_amount, deposit_amount
     FROM cases
     WHERE id = $1`,
    [caseId]
  );
  return rows[0] || null;
}

export async function requestPortalOtp(caseIdentifier, contact = {}) {
  const caseRecord = await resolveCaseByIdentifier(caseIdentifier);
  if (!caseRecord) {
    throw new Error('Case not found');
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await pool.query(
    `INSERT INTO family_portal_tokens (case_id, otp, token, expires_at)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (case_id) DO UPDATE SET otp = EXCLUDED.otp, token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
    [caseRecord.id, otp, token, expiresAt]
  );
  const response = {
    token,
    expires_at: expiresAt.toISOString(),
    caseId: caseRecord.id,
    caseRef: caseRecord.case_ref,
    otp_sent_to: contact.phone || contact.email || null
  };
  if (process.env.NODE_ENV !== 'production') {
    response.debug_otp = otp;
  }
  return response;
}

export async function verifyPortalToken(caseIdentifier, otp, token) {
  const caseRecord = await resolveCaseByIdentifier(caseIdentifier);
  if (!caseRecord) {
    return null;
  }
  const { rows } = await pool.query(
    `SELECT * FROM family_portal_tokens WHERE case_id = $1`,
    [caseRecord.id]
  );
  const record = rows[0];
  if (!record) return null;
  const now = new Date();
  if (now > new Date(record.expires_at)) return null;
  if (record.token !== token || record.otp !== otp) return null;
  return {
    caseId: caseRecord.id,
    token: record.token,
    expires_at: record.expires_at
  };
}

export async function validateFamilyPortalToken(caseId, token) {
  if (!caseId || !token) {
    return null;
  }
  const { rows } = await pool.query(
    `SELECT * FROM family_portal_tokens WHERE case_id = $1`,
    [caseId]
  );
  const record = rows[0];
  if (!record) return null;
  const now = new Date();
  if (now > new Date(record.expires_at)) return null;
  if (record.token !== token) return null;
  return record;
}

export async function resolveCaseIdentifier(identifier) {
  return resolveCaseByIdentifier(identifier);
}

export async function loadFamilySummary(caseId) {
  const caseRecord = await fetchCaseContext(caseId);
  if (!caseRecord) {
    return null;
  }
  const [documents, schedule, chat, automationAlerts, complianceAlerts] = await Promise.all([
    listFamilyDocuments(caseId),
    listFamilySchedule(caseId),
    listFamilyChat(caseId),
    listFamilyAutomationAlerts(caseId),
    listFamilyComplianceAlerts(caseId)
  ]);
  const payments = await listFamilyPayments(caseId);
  return serializeSafeCase(
    {
      ...caseRecord,
      documents,
      schedule,
      messages: chat,
      automationAlerts,
      compliance: { alerts: complianceAlerts },
      payments,
      familyUploads: documents.filter((doc) => doc.metadata?.uploader === 'family')
    },
    { showCosts: false }
  );
}

async function listFamilyAutomationAlerts(caseId) {
  const { rows } = await pool.query(
    `SELECT id, title, description, severity, status, created_at FROM automation_alerts WHERE case_id = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 5`,
    [caseId]
  );
  return rows;
}

async function listFamilyComplianceAlerts(caseId) {
  const { rows } = await pool.query(
    `SELECT id, title, description, severity, status, created_at FROM compliance_alerts WHERE case_id = $1 ORDER BY created_at DESC LIMIT 5`,
    [caseId]
  );
  return rows;
}

export async function listFamilyDocuments(caseId) {
  const { rows } = await pool.query(
    `SELECT id, title, file_url, metadata, created_at FROM case_documents WHERE case_id = $1 ORDER BY created_at DESC`,
    [caseId]
  );
  return rows;
}

export async function addFamilyDocument(caseId, payload) {
  const filePath =
    payload.file_path || payload.fileUrl || payload.file_url || `family_uploads/${crypto.randomUUID()}.bin`;
  const metadata = {
    uploader: 'family',
    ...(payload.metadata || {}),
    description: payload.description,
    documentType: payload.documentType || 'family_upload'
  };
  const { rows } = await pool.query(
    `INSERT INTO case_documents (case_id, title, file_path, file_url, metadata)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, title, file_url, metadata, created_at`,
    [caseId, payload.title, filePath, payload.file_url || payload.fileUrl || '', metadata]
  );
  return rows[0];
}

export async function listFamilyPayments(caseId) {
  const [chargesResult, uploadsResult] = await Promise.all([
    pool.query(
      `SELECT id, description, amount, status, metadata, created_at FROM case_charges WHERE case_id = $1 ORDER BY created_at DESC`,
      [caseId]
    ),
    pool.query(
      `SELECT id, amount, reference, file_url, status, metadata, created_at FROM family_payment_uploads WHERE case_id = $1 ORDER BY created_at DESC`,
      [caseId]
    )
  ]);
  const outstandingResult = await pool.query(
    `SELECT COALESCE(SUM(amount),0)::numeric(12,2) AS total FROM case_charges WHERE case_id = $1 AND status != 'paid'`,
    [caseId]
  );
  return {
    charges: chargesResult.rows,
    uploads: uploadsResult.rows,
    outstandingBalance: parseFloat(outstandingResult.rows[0]?.total ?? 0)
  };
}

export async function recordFamilyPayment(caseId, payload) {
  const { rows } = await pool.query(
    `INSERT INTO family_payment_uploads (case_id, amount, reference, file_url, metadata)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, amount, reference, file_url, status, created_at`,
    [
      caseId,
      payload.amount,
      payload.reference,
      payload.file_url || payload.fileUrl || '',
      { uploader: 'family', ...(payload.metadata || {}) }
    ]
  );
  return rows[0];
}

export async function listFamilySchedule(caseId) {
  const { rows } = await pool.query(
    `SELECT id, label, code, scheduled_start, scheduled_end, status, notes FROM funeral_events WHERE case_id = $1 ORDER BY sequence_order ASC`,
    [caseId]
  );
  return rows;
}

export async function listFamilyChat(caseId) {
  const { rows } = await pool.query(
    `SELECT id, author, content, created_at FROM case_messages
     WHERE case_id = $1 AND type = 'family_message'
     ORDER BY created_at ASC`,
    [caseId]
  );
  return rows;
}

export async function addFamilyChat(caseId, message) {
  const caseContext = await fetchCaseContext(caseId);
  if (!caseContext) {
    throw new Error('Case context missing');
  }
  const { rows } = await pool.query(
    `INSERT INTO case_messages (case_id, tenant_id, author, type, content, status)
     VALUES ($1,$2,'family','family_message',$3,'approved')
     RETURNING id, author, content, created_at`,
    [caseId, caseContext.tenant_id, message]
  );
  return rows[0];
}

