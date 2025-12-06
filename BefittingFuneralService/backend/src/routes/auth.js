import express from 'express';
import pool from '../db/database.js';
import { config } from '../config/config.js';
import { generateAndSendOtp, verifyOtp } from '../services/mfaService.js';
import { issueTokens } from '../services/tokenService.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ success: false, error: 'phone and password required' });
  }

  const query = `
    SELECT id, name, phone, role, email, is_active, mfa_enabled
    FROM staff
    WHERE phone = $1 AND password_hash = crypt($2, password_hash)
    LIMIT 1
  `;
  const result = await pool.query(query, [phone, password]);
  const staff = result.rows[0];

  if (!staff || staff.is_active === false) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  await pool.query('UPDATE staff SET last_login = now() WHERE id = $1', [staff.id]);

  const requiresMfa = staff.mfa_enabled || staff.role === 'admin';
  if (requiresMfa) {
    const extra = await generateAndSendOtp(staff);
    return res.json({
      success: true,
      data: {
        mfaRequired: true,
        staffId: staff.id,
        ...extra
      }
    });
  }

  const tokens = issueTokens(staff);
  await pool.query(
    `INSERT INTO staff_refresh_tokens (staff_id, refresh_token, expires_at)
     VALUES ($1,$2,$3)`,
    [staff.id, tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
  );

  return res.json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      staff
    }
  });
});

router.post('/mfa/verify', async (req, res) => {
  const { staffId, otp } = req.body;
  if (!staffId || !otp) {
    return res.status(400).json({ success: false, error: 'staffId and otp required' });
  }
  const isValid = await verifyOtp(staffId, otp);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Invalid or expired code' });
  }
  const { rows } = await pool.query('SELECT id, name, phone, role FROM staff WHERE id = $1 LIMIT 1', [
    staffId
  ]);
  const staff = rows[0];
  if (!staff) {
    return res.status(404).json({ success: false, error: 'Staff not found' });
  }
  const tokens = issueTokens(staff);
  await pool.query(
    `INSERT INTO staff_refresh_tokens (staff_id, refresh_token, expires_at)
     VALUES ($1,$2,$3)`,
    [staff.id, tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
  );

  return res.json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      staff
    }
  });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'refreshToken required' });
  }
  const { rows } = await pool.query(
    `SELECT staff_id FROM staff_refresh_tokens WHERE refresh_token = $1 AND expires_at > NOW() LIMIT 1`,
    [refreshToken]
  );
  const entry = rows[0];
  if (!entry) {
    return res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
  const staffResult = await pool.query('SELECT id, name, phone, role FROM staff WHERE id = $1 LIMIT 1', [
    entry.staff_id
  ]);
  const staff = staffResult.rows[0];
  const tokens = issueTokens(staff);
  await pool.query(
    `UPDATE staff_refresh_tokens SET refresh_token = $1, expires_at = $2 WHERE staff_id = $3`,
    [tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), staff.id]
  );
  return res.json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }
  });
});

export default router;

