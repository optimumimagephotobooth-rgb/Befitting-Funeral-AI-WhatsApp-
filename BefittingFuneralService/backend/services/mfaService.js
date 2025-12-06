import pool from '../db/database.js';
import crypto from 'crypto';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import twilio from 'twilio';

const OTP_TTL_MS = 5 * 60 * 1000;

const twilioClient = config.twilio?.accountSid
  ? twilio(config.twilio.accountSid, config.twilio.authToken)
  : null;

export async function generateAndSendOtp(staff) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await pool.query(
    `INSERT INTO staff_mfa_codes (staff_id, otp, expires_at)
     VALUES ($1,$2,$3)
     ON CONFLICT (staff_id) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at`,
    [staff.id, otp, expiresAt]
  );

  if (twilioClient && staff.phone) {
    try {
      await twilioClient.messages.create({
        body: `Your Praxion OTP is ${otp}. It expires in 5 minutes.`,
        to: staff.phone,
        from: config.twilio.fromNumber
      });
    } catch (error) {
      logger.warn('Twilio OTP send failed', error);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return { otp };
  }
  return {};
}

export async function verifyOtp(staffId, otp) {
  const { rows } = await pool.query(
    `SELECT otp, expires_at FROM staff_mfa_codes WHERE staff_id = $1`,
    [staffId]
  );
  const record = rows[0];
  if (!record) return false;
  if (new Date() > new Date(record.expires_at)) return false;
  return record.otp === otp;
}

