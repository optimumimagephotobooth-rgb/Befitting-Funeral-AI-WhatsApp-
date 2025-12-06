import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import crypto from 'crypto';

const makeRefreshToken = () => crypto.randomBytes(24).toString('hex');

export function issueTokens(staff) {
  const secret = config.auth.jwtSecret || 'default-secret';
  const payload = {
    staffId: staff.id,
    role: staff.role,
    name: staff.name,
    phone: staff.phone
  };
  const accessToken = jwt.sign(payload, secret, { expiresIn: '1h' });
  const refreshToken = makeRefreshToken();
  return { accessToken, refreshToken };
}

