/**
 * B2B Lead Generation API Routes
 * Endpoints for lead scraping and email campaigns
 */

import express from 'express';
import { LeadGenerationService } from '../services/leadGenerationService.js';
import { B2BLead } from '../models/B2BLead.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { requireAnyRole, requireRole, requireStaffOrApiKey } from '../middleware/auth.js';

const router = express.Router();
const leadGenerationService = new LeadGenerationService();

// Generate leads from search query
router.post(
  '/generate',
  requireStaffOrApiKey,
  requireAnyRole(['admin', 'coordinator']),
  asyncHandler(async (req, res) => {
  const { query, location, maxResults, sources, extractEmails, sendEmails, emailTemplate } = req.body;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Search query is required'
    });
  }

  const result = await leadGenerationService.runLeadGenerationCampaign(query, {
    location: location || 'Accra, Ghana',
    maxResults: maxResults || 20,
    sources: sources || ['google', 'yellowpages'],
    extractEmails: extractEmails !== false,
    sendEmails: sendEmails === true,
    emailTemplate: emailTemplate || 'default'
  });

  res.json(result);
}));

// Get all leads
router.get(
  '/',
  requireStaffOrApiKey,
  requireAnyRole(['admin', 'coordinator', 'director']),
  asyncHandler(async (req, res) => {
  const { status, source, limit = 100, offset = 0 } = req.query;
  
  const leads = await B2BLead.findAll({
    status,
    source,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    success: true,
    data: leads,
    count: leads.length
  });
}));

// Get lead by ID
router.get(
  '/:id',
  requireStaffOrApiKey,
  requireAnyRole(['admin', 'coordinator', 'director', 'agent']),
  asyncHandler(async (req, res) => {
  const lead = await B2BLead.findById(req.params.id);
  
  if (!lead) {
    return res.status(404).json({
      success: false,
      error: 'Lead not found'
    });
  }

  res.json({
    success: true,
    data: lead
  });
}));

// Update lead
router.put(
  '/:id',
  requireStaffOrApiKey,
  requireAnyRole(['admin', 'coordinator']),
  asyncHandler(async (req, res) => {
  const { status, notes, contact_name, phone } = req.body;
  
  const updates = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (contact_name) updates.contact_name = contact_name;
  if (phone) updates.phone = phone;

  const updatedLead = await B2BLead.update(req.params.id, updates);

  res.json({
    success: true,
    data: updatedLead
  });
}));

// Send emails to specific leads
router.post(
  '/send-emails',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
  const { leadIds, emailTemplate = 'default' } = req.body;
  
  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Lead IDs array is required'
    });
  }

  const result = await leadGenerationService.sendEmailsToLeads(leadIds, emailTemplate);

  res.json(result);
}));

// Send emails to all new leads
router.post(
  '/send-emails/new',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
  const { emailTemplate = 'default', limit = 50 } = req.body;
  
  const result = await leadGenerationService.sendEmailsToNewLeads(emailTemplate, limit);

  res.json(result);
}));

// Get lead statistics
router.get(
  '/stats/overview',
  requireStaffOrApiKey,
  requireAnyRole(['admin', 'coordinator', 'director']),
  asyncHandler(async (req, res) => {
  const stats = await B2BLead.getStats();
  
  res.json({
    success: true,
    data: stats
  });
}));

export default router;

