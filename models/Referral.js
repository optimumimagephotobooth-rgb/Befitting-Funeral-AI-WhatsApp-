import pool from '../db/database.js';

export class Referral {
  static async create(data) {
    const result = await pool.query(
      `INSERT INTO referrals (referrer_contact_id, referred_contact_id, referral_code, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        data.referrer_contact_id,
        data.referred_contact_id || null,
        data.referral_code,
        data.status || 'PENDING'
      ]
    );
    return result.rows[0];
  }

  static async findByCode(referralCode) {
    const result = await pool.query(
      'SELECT * FROM referrals WHERE referral_code = $1',
      [referralCode]
    );
    return result.rows[0] || null;
  }

  static async findByReferrer(contactId) {
    const result = await pool.query(
      'SELECT * FROM referrals WHERE referrer_contact_id = $1 ORDER BY created_at DESC',
      [contactId]
    );
    return result.rows;
  }

  static async markAsUsed(referralCode, referredContactId) {
    const result = await pool.query(
      `UPDATE referrals 
       SET status = 'USED', 
           referred_contact_id = $1, 
           used_at = now() 
       WHERE referral_code = $2 
       RETURNING *`,
      [referredContactId, referralCode]
    );
    return result.rows[0];
  }

  static async markAsRewarded(referralId) {
    const result = await pool.query(
      `UPDATE referrals 
       SET reward_applied = true, 
           status = 'REWARDED' 
       WHERE id = $1 
       RETURNING *`,
      [referralId]
    );
    return result.rows[0];
  }

  static async getReferralStats(contactId) {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_referrals,
         COUNT(CASE WHEN status = 'USED' THEN 1 END) as successful_referrals,
         COUNT(CASE WHEN reward_applied = true THEN 1 END) as rewards_earned
       FROM referrals 
       WHERE referrer_contact_id = $1`,
      [contactId]
    );
    return result.rows[0];
  }
}

