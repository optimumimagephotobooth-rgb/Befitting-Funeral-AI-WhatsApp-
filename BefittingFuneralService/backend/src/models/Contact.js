import pool from '../db/database.js';

export class Contact {
  static async findByPhoneNumber(phoneNumber) {
    const result = await pool.query(
      'SELECT * FROM contacts WHERE phone_number = $1',
      [phoneNumber]
    );
    return result.rows[0] || null;
  }

  static async create(phoneNumber, name = null) {
    const result = await pool.query(
      'INSERT INTO contacts (phone_number, name) VALUES ($1, $2) ON CONFLICT (phone_number) DO UPDATE SET name = COALESCE(EXCLUDED.name, contacts.name) RETURNING *',
      [phoneNumber, name]
    );
    return result.rows[0];
  }

  static async updateName(phoneNumber, name) {
    const result = await pool.query(
      'UPDATE contacts SET name = $1 WHERE phone_number = $2 RETURNING *',
      [name, phoneNumber]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM contacts WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }
}

