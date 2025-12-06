import pool from '../db/database.js';

export async function recordAuditLog({ caseId, staffId, action, metadata = {}, ipAddress = null }) {
  await pool.query(
    `INSERT INTO audit_log (case_id, staff_id, action, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [caseId, staffId || null, action, metadata, ipAddress]
  );
}

export async function listAuditLogs(caseId, { limit = 20 } = {}) {
  const result = await pool.query(
    `SELECT * FROM audit_log WHERE case_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [caseId, limit]
  );
  return result.rows;
}

