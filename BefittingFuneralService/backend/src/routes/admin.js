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
import {
  logCaseEvent,
  logStaffEvent,
  insertAnnouncement,
  listAnnouncements,
  fetchQuietThresholds,
  persistQuietThresholds,
  defaultQuietThresholds
} from '../services/supabaseService.js';
import {
  listDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate
} from '../services/documentTemplateService.js';
import { requireAnyRole, requireRole, requireStaffOrApiKey } from '../middleware/auth.js';

const router = express.Router();
const analyticsService = new AnalyticsService();

// Dashboard overview
router.get('/dashboard', requireStaffOrApiKey, asyncHandler(async (req, res) => {
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

// Lightweight status endpoint for the React dashboard (no auth)
router.get('/dashboard/status', asyncHandler(async (req, res) => {
  const [caseCountResult, messageCountResult] = await Promise.all([
    pool.query('SELECT COUNT(*)::integer as total FROM cases'),
    pool.query('SELECT COUNT(*)::integer as total FROM messages')
  ]);

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    data: {
      activeCases: caseCountResult.rows[0].total,
      messagesProcessed: messageCountResult.rows[0].total
    }
  });
}));

// Get all cases
router.get('/cases', requireStaffOrApiKey, asyncHandler(async (req, res) => {
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
    filteredCases = allCases.filter(c => (c.stage || c.status) === status);
  }
  
  // Sort and paginate
  filteredCases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const paginated = filteredCases.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  // Enrich with contact info
  const enriched = await Promise.all(paginated.map(async (c) => {
    const contact = await Contact.findById(c.contact_id);
    return {
      ...c,
      stage: c.stage || c.status,
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
router.get('/cases/:caseId', requireStaffOrApiKey, asyncHandler(async (req, res) => {
  const caseId = req.params.caseId;
  const activeCase = await Case.findById(caseId);
  
  if (!activeCase) {
    return res.status(404).json({
      success: false,
      error: 'Case not found'
    });
  }
  
  const contact = await Contact.findById(activeCase.contact_id);
  const staff = req.staff; // { id, name, role }
  await logCaseEvent({
    case_id: activeCase.id,
    event_type: 'CASE_VIEW',
    data: {
      staffId: staff?.staffId,
      name: staff?.name,
      role: staff?.role,
      caseId: activeCase.id
    }
  });
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
router.get('/contacts', requireStaffOrApiKey, asyncHandler(async (req, res) => {
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
router.get('/referrals', requireStaffOrApiKey, asyncHandler(async (req, res) => {
  const performance = await analyticsService.getReferralPerformance();
  
  res.json({
    success: true,
    data: performance
  });
}));

// Leads summary
router.get('/leads', requireStaffOrApiKey, asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  const result = await pool.query(
    `SELECT contacts.name, contacts.phone_number, referrals.referral_code, referrals.status, referrals.created_at
       FROM referrals
       JOIN contacts ON contacts.id = referrals.referrer_contact_id
       ORDER BY referrals.created_at DESC
       LIMIT $1`,
    [Number(limit) || 20]
  );

  res.json({
    success: true,
    data: result.rows
  });
}));

// Case events for timeline
router.get(
  '/case-events',
  requireStaffOrApiKey,
  requireAnyRole(['admin', 'coordinator', 'director', 'agent']),
  asyncHandler(async (req, res) => {
    const { caseId, limit = 30 } = req.query;
    if (!caseId) {
      return res.status(400).json({ success: false, error: 'caseId is required' });
    }
    const result = await pool.query(
      'SELECT * FROM case_events WHERE case_id = $1 ORDER BY created_at DESC LIMIT $2',
      [Number(caseId), Number(limit) || 30]
    );

    res.json({
      success: true,
      data: result.rows
    });
  })
);

// Announcement builder (GET + POST)
router.get(
  '/announcements',
  requireStaffOrApiKey,
  requireAnyRole(['admin', 'coordinator', 'director', 'agent']),
  asyncHandler(async (req, res) => {
    const announcements = await listAnnouncements(20);
    res.json({
      success: true,
      data: announcements
    });
  })
);

router.post(
  '/announcements',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { title, body, channel, scheduledAt } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Title and body are required'
      });
    }

    const announcement = await insertAnnouncement({
      title,
      body,
      channel: channel || 'whatsapp',
      scheduledAt
    });

    res.json({
      success: true,
      data: announcement
    });
  })
);

router.get(
  '/document-templates',
  requireStaffOrApiKey,
  requireAnyRole(STAFF_ROLES),
  asyncHandler(async (_req, res) => {
    const templates = await listDocumentTemplates({ includeInactive: true });
    res.json({ success: true, data: templates });
  })
);

router.post(
  '/document-templates',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = sanitizeTemplatePayload(req.body || {});
    const template = await createDocumentTemplate(payload, req.staff?.staffId || null);
    res.status(201).json({ success: true, data: template });
  })
);

router.put(
  '/document-templates/:templateId',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = sanitizeTemplatePayload(req.body || {}, true);
    const template = await updateDocumentTemplate(req.params.templateId, payload);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, data: template });
  })
);

router.delete(
  '/document-templates/:templateId',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    await deleteDocumentTemplate(req.params.templateId);
    res.json({ success: true });
  })
);

router.get(
  '/settings/quiet',
  requireStaffOrApiKey,
  requireAnyRole(STAFF_ROLES),
  asyncHandler(async (_req, res) => {
    const result = await fetchQuietThresholds();
    res.json({
      success: true,
      data: result
    });
  })
);

router.put(
  '/settings/quiet',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    let sanitized;
    try {
      const current = await fetchQuietThresholds();
      sanitized = sanitizeQuietConfig(req.body || {}, current.config);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message || 'Invalid quiet threshold payload'
      });
    }

    const saved = await persistQuietThresholds(sanitized);
    await logQuietSettingsUpdate(req);

    res.json({
      success: true,
      data: saved
    });
  })
);

const STAFF_ROLES = ['admin', 'coordinator', 'director', 'agent'];
const ALLOWED_TEMPLATE_TYPES = [
  'estimate',
  'invoice',
  'statutory',
  'cremation',
  'letter',
  'schedule',
  'minister_sheet',
  'order_of_service'
];
const QUIET_KEYS = [
  'businessWarningHours',
  'businessAlertHours',
  'offHoursWarningHours',
  'offHoursAlertHours'
];
async function fetchStaffEvents(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [countResult, eventsResult] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM staff_events'),
    pool.query(
      `
        SELECT
          e.id,
          e.event_type as action,
          e.metadata,
          e.created_at,
          actor.id   AS actor_id,
          actor.name AS actor_name,
          actor.email AS actor_email,
          target.id   AS target_id,
          target.name AS target_name,
          target.email AS target_email
        FROM staff_events e
        LEFT JOIN staff actor ON actor.id = e.actor_id
        LEFT JOIN staff target ON target.id = e.staff_id
        ORDER BY e.created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    )
  ]);

  const total = countResult.rows[0].count;

  return {
    data: eventsResult.rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

function serializeStaff(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || null,
    role: row.role,
    isActive: row.is_active !== false,
    lastLogin: row.last_login || null,
    createdAt: row.created_at
  };
}

async function recordStaffEventSafe(req, staffId, eventType, metadata = {}) {
  if (!staffId) {
    return;
  }
  try {
    await logStaffEvent({
      staff_id: staffId,
      actor_id: req.staff?.staffId || null,
      actor_name: req.staff?.name || 'System',
      event_type: eventType,
      metadata
    });
  } catch (error) {
    logger.warn('Failed to log staff event', error);
  }
}

function sanitizeQuietConfig(input = {}, baseConfig = defaultQuietThresholds) {
  const result = { ...baseConfig };
  for (const key of QUIET_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = Number(input[key]);
      if (!Number.isFinite(value) || value < 1 || value > 200) {
        throw new Error('Quiet settings must be between 1 and 200 hours.');
      }
      result[key] = value;
    }
  }
  return result;
}

async function logQuietSettingsUpdate(req) {
  try {
    await logStaffEvent({
      staff_id: null,
      actor_id: req.staff?.staffId || null,
      actor_name: req.staff?.name || 'System',
      event_type: 'SETTINGS_UPDATE',
      metadata: { scope: 'QUIET_THRESHOLDS' }
    });
  } catch (error) {
    logger.warn('Failed to log quiet settings update', error);
  }
}

function sanitizeTemplatePayload(input, partial = false) {
  if (!partial) {
    if (!input.name || !input.documentType || !input.htmlTemplate) {
      throw new Error('name, documentType and htmlTemplate are required');
    }
  }

  const payload = {};
  if (input.name !== undefined) payload.name = String(input.name);
  if (input.documentType !== undefined) {
    const normalized = String(input.documentType).toLowerCase();
    if (!ALLOWED_TEMPLATE_TYPES.includes(normalized)) {
      throw new Error(`documentType must be one of: ${ALLOWED_TEMPLATE_TYPES.join(', ')}`);
    }
    payload.documentType = normalized;
  }
  if (input.description !== undefined) payload.description = input.description;
  if (input.htmlTemplate !== undefined) payload.htmlTemplate = input.htmlTemplate;
  if (input.isActive !== undefined) payload.isActive = Boolean(input.isActive);
  if (input.metadata !== undefined) payload.metadata = input.metadata;
  return payload;
}


// Staff management (admin-only)
router.get(
  '/staff',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      'SELECT id, name, phone, email, role, is_active, last_login, created_at FROM staff ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: result.rows.map(serializeStaff)
    });
  })
);

router.post(
  '/staff',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { name, phone, email, password, role = 'agent' } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'name, phone, and password are required'
      });
    }

    if (!STAFF_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `role must be one of: ${STAFF_ROLES.join(', ')}`
      });
    }

    const query = `
      INSERT INTO staff (name, phone, email, role, password_hash, is_active, created_at)
      VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf')), true, now())
      RETURNING id, name, phone, email, role, is_active, last_login, created_at
    `;
    const values = [name, phone, email || null, role, password];

    const { rows } = await pool.query(query, values);

    await recordStaffEventSafe(req, rows[0].id, 'STAFF_CREATE', {
      name: rows[0].name,
      role
    });

    res.status(201).json({
      success: true,
      data: serializeStaff(rows[0])
    });
  })
);

router.patch(
  '/staff/:staffId',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { staffId } = req.params;
    const { name, phone, email, role, isActive } = req.body;
    const roleToApply = role && STAFF_ROLES.includes(role) ? role : null;

    const existingResult = await pool.query(
      'SELECT id, name, phone, email, role, is_active, last_login, created_at FROM staff WHERE id = $1',
      [staffId]
    );

    if (!existingResult.rowCount) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    const existing = existingResult.rows[0];

    const result = await pool.query(
      `
        UPDATE staff
        SET
          name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          role = COALESCE($4, role),
          is_active = COALESCE($5, is_active)
        WHERE id = $6
        RETURNING id, name, phone, email, role, is_active, last_login, created_at
      `,
      [name || null, phone || null, email || null, roleToApply, isActive, staffId]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    const updated = result.rows[0];

    const events = [];
    if (roleToApply && roleToApply !== existing.role) {
      events.push({
        type: 'STAFF_ROLE_CHANGE',
        metadata: { from: existing.role, to: updated.role }
      });
    }

    if (typeof isActive === 'boolean' && isActive !== existing.is_active) {
      events.push({
        type: 'STAFF_STATUS_CHANGE',
        metadata: { from: existing.is_active, to: updated.is_active }
      });
    }

    const otherFields = [];
    if (name && name !== existing.name) otherFields.push('name');
    if (phone && phone !== existing.phone) otherFields.push('phone');
    if (email && email !== existing.email) otherFields.push('email');

    if (otherFields.length) {
      events.push({
        type: 'STAFF_UPDATE',
        metadata: { fields: otherFields }
      });
    }

    if (!events.length) {
      events.push({
        type: 'STAFF_UPDATE',
        metadata: { fields: [] }
      });
    }

    await Promise.all(
      events.map((event) => recordStaffEventSafe(req, updated.id, event.type, event.metadata))
    );

    res.json({
      success: true,
      data: serializeStaff(result.rows[0])
    });
  })
);

router.post(
  '/staff/:staffId/reset-password',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { staffId } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'password is required'
      });
    }

    const result = await pool.query(
      `
        UPDATE staff
        SET password_hash = crypt($1, gen_salt('bf'))
        WHERE id = $2
        RETURNING id, name
      `,
      [password, staffId]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    await recordStaffEventSafe(req, result.rows[0].id, 'STAFF_RESET_PASSWORD', {
      name: result.rows[0].name
    });

    res.json({
      success: true,
      message: 'Password reset'
    });
  })
);

router.get(
  '/staff/events',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const payload = await fetchStaffEvents(page, limit);
    res.json({
      success: true,
      data: payload.data,
      meta: payload.meta
    });
  })
);

// Fetch recent messages
router.get('/messages', requireStaffOrApiKey, asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const result = await pool.query(
    'SELECT * FROM messages ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [Number(limit) || 50, Number(offset) || 0]
  );

  res.json({
    success: true,
    data: result.rows
  });
}));

// System health
router.get('/health', requireStaffOrApiKey, asyncHandler(async (req, res) => {
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
router.get(
  '/export',
  requireStaffOrApiKey,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
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
  })
);

export default router;

