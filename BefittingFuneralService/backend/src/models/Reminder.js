import pool from '../db/database.js';

export class Reminder {
  static async create(data) {
    const result = await pool.query(
      `INSERT INTO reminders (case_id, type, send_at, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        data.case_id || null,
        data.type, // FUNERAL_REMINDER, FOLLOWUP, etc.
        data.send_at,
        data.status || 'PENDING'
      ]
    );
    return result.rows[0];
  }

  static async findPending() {
    const result = await pool.query(
      `SELECT * FROM reminders 
       WHERE status = 'PENDING' 
       AND send_at <= now() 
       ORDER BY send_at ASC`
    );
    return result.rows;
  }

  static async findByCaseId(caseId) {
    const result = await pool.query(
      'SELECT * FROM reminders WHERE case_id = $1 ORDER BY send_at ASC',
      [caseId]
    );
    return result.rows;
  }

  static async updateStatus(id, status) {
    const result = await pool.query(
      'UPDATE reminders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0];
  }

  static async markAsSent(id) {
    return this.updateStatus(id, 'SENT');
  }

  static async markAsFailed(id) {
    return this.updateStatus(id, 'FAILED');
  }
}

