/**
 * Admin Dashboard API Routes
 * Provides management and monitoring endpoints
 */

import express from 'express';
import { AnalyticsService } from '../services/analyticsService.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { Case } from '../models/Case.js';
import { Contact } from '../models/Contact.js';
import { Message } from '../models/Message.js';
import { Referral } from '../models/Referral.js';
import pool from '../db/database.js';

const router = express.Router();
const analyticsService = new AnalyticsService();

// Admin authentication middleware (simple - enhance in production)
const adminAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const adminKey = process.env.ADMIN_API_KEY || 'admin123';
  
  if (apiKey === adminKey) {
    return next();
  }
  
  return res.status(401).json({
    success: false,
    error: 'Unauthorized'
  });
};

// Dashboard overview
router.get('/dashboard', adminAuth, asyncHandler(async (req, res) => {
  const stats = await analyticsService.getOverallStats();
  const stageMetrics = await analyticsService.getStageMetrics();
  const dailyActivity = await analyticsService.getDailyActivity(7);
  
  res.json({
    success: true,
    data: {
      overview: stats,
      stages: stageMetrics,
      activity: dailyActivity
    }
  });
}));

// Get all cases
router.get('/cases', adminAuth, asyncHandler(async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  
  // Get all cases for a contact, then filter
  const allCases = [];
  const contacts = await pool.query('SELECT id FROM contacts LIMIT 1000');
  
  for (const contact of contacts.rows) {
    const cases = await Case.findByContactId(contact.id);
    allCases.push(...cases);
  }
  
  // Filter by status if provided
  let filteredCases = allCases;
  if (status) {
    filteredCases = allCases.filter(c => c.status === status);
  }
  
  // Sort and paginate
  filteredCases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const paginated = filteredCases.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  // Enrich with contact info
  const enriched = await Promise.all(paginated.map(async (c) => {
    const contact = await Contact.findById(c.contact_id);
    return {
      ...c,
      contact_name: contact?.name || null,
      contact_phone: contact?.phone_number || null
    };
  }));
  
  res.json({
    success: true,
    data: enriched,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: filteredCases.length
    }
  });
}));

// Get case details
router.get('/cases/:caseId', adminAuth, asyncHandler(async (req, res) => {
  const caseId = req.params.caseId;
  const activeCase = await Case.findById(caseId);
  
  if (!activeCase) {
    return res.status(404).json({
      success: false,
      error: 'Case not found'
    });
  }
  
  const contact = await Contact.findById(activeCase.contact_id);
  const messages = await Message.findByCaseId(caseId);
  
  res.json({
    success: true,
    data: {
      case: activeCase,
      contact,
      messages
    }
  });
}));

// Get all contacts
router.get('/contacts', adminAuth, asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  
  const query = `SELECT * FROM contacts ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
  const result = await pool.query(query, [parseInt(limit), parseInt(offset)]);
  
  res.json({
    success: true,
    data: result.rows,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: result.rows.length
    }
  });
}));

// Get referrals
router.get('/referrals', adminAuth, asyncHandler(async (req, res) => {
  const performance = await analyticsService.getReferralPerformance();
  
  res.json({
    success: true,
    data: performance
  });
}));

// System health
router.get('/health', adminAuth, asyncHandler(async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'unknown'
  };
  
  try {
    await pool.query('SELECT 1');
    health.database = 'connected';
  } catch (error) {
    health.database = 'disconnected';
    health.status = 'degraded';
  }
  
  res.json(health);
}));

// Export data
router.get('/export', adminAuth, asyncHandler(async (req, res) => {
  const { type = 'cases' } = req.query;
  
  let data = [];
  
  switch (type) {
    case 'cases':
      // Get all cases via contacts
      const contacts = await pool.query('SELECT id FROM contacts');
      for (const contact of contacts.rows) {
        const cases = await Case.findByContactId(contact.id);
        data.push(...cases);
      }
      break;
    case 'contacts':
      const contactsResult = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
      data = contactsResult.rows;
      break;
    case 'messages':
      const messagesResult = await pool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 1000');
      data = messagesResult.rows;
      break;
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid export type. Use: cases, contacts, or messages'
      });
  }
  
  res.json({
    success: true,
    type,
    count: data.length,
    data
  });
}));

export default router;

