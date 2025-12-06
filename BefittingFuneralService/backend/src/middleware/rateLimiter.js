/**
 * Rate Limiting Middleware
 * Prevents abuse and controls costs
 */

import { logger } from '../utils/logger.js';

class RateLimiter {
  constructor() {
    this.requests = new Map(); // phoneNumber -> { count, resetTime }
    this.windowMs = 60 * 1000; // 1 minute
    this.maxRequests = 20; // Max requests per window
  }

  clean() {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (value.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }

  check(phoneNumber) {
    this.clean();
    
    const now = Date.now();
    const record = this.requests.get(phoneNumber);

    if (!record) {
      this.requests.set(phoneNumber, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (record.resetTime < now) {
      // Window expired, reset
      this.requests.set(phoneNumber, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (record.count >= this.maxRequests) {
      logger.warn(`Rate limit exceeded for ${phoneNumber}`);
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count
    };
  }
}

export const rateLimiter = new RateLimiter();

export function rateLimitMiddleware(req, res, next) {
  const phoneNumber = req.body?.from || req.query?.phone || 'unknown';
  const result = rateLimiter.check(phoneNumber);

  if (!result.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      resetTime: result.resetTime
    });
  }

  res.setHeader('X-RateLimit-Remaining', result.remaining);
  next();
}

export default rateLimiter;

