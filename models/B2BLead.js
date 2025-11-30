/**
 * B2B Lead Model
 * Database operations for B2B leads
 */

import pool from '../db/database.js';

export class B2BLead {
  static async create(data) {
    const result = await pool.query(
      `INSERT INTO b2b_leads (
        company_name, contact_name, email, phone, website, 
        industry, location, company_size, source, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        data.company_name,
        data.contact_name || null,
        data.email,
        data.phone || null,
        data.website || null,
        data.industry || null,
        data.location || null,
        data.company_size || null,
        data.source || 'Manual',
        data.notes || null
      ]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM b2b_leads WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM b2b_leads WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findAll(filters = {}) {
    const { status, source, limit = 100, offset = 0 } = filters;
    let query = 'SELECT * FROM b2b_leads WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (source) {
      query += ` AND source = $${paramCount}`;
      params.push(source);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
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
      `UPDATE b2b_leads SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async markEmailSent(id, sendgridMessageId = null) {
    return this.update(id, {
      email_sent: true,
      email_sent_at: new Date(),
      last_contacted_at: new Date()
    });
  }

  static async markEmailOpened(id) {
    return this.update(id, {
      email_opened: true,
      email_opened_at: new Date()
    });
  }

  static async markEmailClicked(id) {
    return this.update(id, {
      email_clicked: true,
      email_clicked_at: new Date()
    });
  }

  static async bulkCreate(leads) {
    const values = [];
    const params = [];
    let paramCount = 1;

    for (const lead of leads) {
      values.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, $${paramCount + 4}, $${paramCount + 5}, $${paramCount + 6}, $${paramCount + 7}, $${paramCount + 8}, $${paramCount + 9})`);
      params.push(
        lead.company_name,
        lead.contact_name || null,
        lead.email,
        lead.phone || null,
        lead.website || null,
        lead.industry || null,
        lead.location || null,
        lead.company_size || null,
        lead.source || 'Scraped'
      );
      paramCount += 10;
    }

    const query = `
      INSERT INTO b2b_leads (
        company_name, contact_name, email, phone, website,
        industry, location, company_size, source
      ) VALUES ${values.join(', ')}
      ON CONFLICT (email) DO NOTHING
      RETURNING *
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'NEW' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'CONTACTED' THEN 1 END) as contacted,
        COUNT(CASE WHEN status = 'INTERESTED' THEN 1 END) as interested,
        COUNT(CASE WHEN status = 'CONVERTED' THEN 1 END) as converted,
        COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_sent,
        COUNT(CASE WHEN email_opened = true THEN 1 END) as emails_opened,
        COUNT(CASE WHEN email_clicked = true THEN 1 END) as emails_clicked
      FROM b2b_leads
    `);
    return result.rows[0];
  }
}

export default B2BLead;

