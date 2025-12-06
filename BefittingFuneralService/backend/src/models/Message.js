import pool from '../db/database.js';

export class Message {
  static async create(data) {
    const result = await pool.query(
      `INSERT INTO messages (case_id, direction, from_number, body, raw, intent, flow)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.case_id || null,
        data.direction, // INBOUND or OUTBOUND
        data.from_number,
        data.body,
        data.raw ? JSON.stringify(data.raw) : null,
        data.intent || null,
        data.flow || null
      ]
    );
    return result.rows[0];
  }

  static async findByCaseId(caseId) {
    const result = await pool.query(
      'SELECT * FROM messages WHERE case_id = $1 ORDER BY created_at ASC',
      [caseId]
    );
    return result.rows;
  }

  static async findRecentByCaseId(caseId, limit = 10) {
    const result = await pool.query(
      'SELECT * FROM messages WHERE case_id = $1 ORDER BY created_at DESC LIMIT $2',
      [caseId, limit]
    );
    return result.rows;
  }

  static async findByPhoneNumber(phoneNumber, limit = 50) {
    const result = await pool.query(
      'SELECT * FROM messages WHERE from_number = $1 ORDER BY created_at DESC LIMIT $2',
      [phoneNumber, limit]
    );
    return result.rows;
  }

  static async getConversationHistory(phoneNumber, limit = 20) {
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE from_number = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [phoneNumber, limit]
    );
    return result.rows.reverse(); // Return in chronological order
  }
}

