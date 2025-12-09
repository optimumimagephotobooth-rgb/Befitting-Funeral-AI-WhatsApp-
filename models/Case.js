import pool from '../db/database.js';

export class Case {
  static async create(contactId, data = {}) {
    // Generate case reference
    const caseRef = await this.generateCaseRef();
    
    const result = await pool.query(
      `INSERT INTO cases (
        contact_id, case_ref, status, deceased_name, funeral_date, 
        location, package_name, total_amount, deposit_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        contactId,
        caseRef,
        data.status || 'NEW',
        data.deceased_name || null,
        data.funeral_date || null,
        data.location || null,
        data.package_name || null,
        data.total_amount || null,
        data.deposit_amount || null
      ]
    );
    return result.rows[0];
  }

  static async findByContactId(contactId) {
    const result = await pool.query(
      'SELECT * FROM cases WHERE contact_id = $1 ORDER BY created_at DESC',
      [contactId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM cases WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByCaseRef(caseRef) {
    const result = await pool.query(
      'SELECT * FROM cases WHERE case_ref = $1',
      [caseRef]
    );
    return result.rows[0] || null;
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });

    fields.push(`updated_at = now()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE cases SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async generateCaseRef() {
    const year = new Date().getFullYear();
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM cases WHERE case_ref LIKE $1`,
      [`CASE-${year}-%`]
    );
    const count = parseInt(result.rows[0].count) + 1;
    return `CASE-${year}-${String(count).padStart(4, '0')}`;
  }
}

