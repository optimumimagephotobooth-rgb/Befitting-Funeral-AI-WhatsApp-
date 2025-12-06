import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

export function requireStaff(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = auth.replace('Bearer ', '').trim();

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret || 'default-secret');
    req.staff = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireStaffOrApiKey(req, res, next) {
  const apiKey = req.query.apiKey;
  if (apiKey && apiKey === process.env.ADMIN_API_KEY) {
    req.staff = { staffId: 'system', name: 'System', role: 'admin' };
    return next();
  }
  return requireStaff(req, res, next);
}

export const requireRole = (role) => (req, res, next) => {
  if (!req.staff || req.staff.role !== role) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

export const requireAnyRole = (roles) => (req, res, next) => {
  if (!req.staff) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!roles.includes(req.staff.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  }

  next();
};

