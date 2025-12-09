/**
 * Input Validation Middleware
 * Validates incoming requests
 */

import { ValidationError } from '../utils/errorHandler.js';

export function validatePhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    throw new ValidationError('Phone number is required');
  }

  // Remove non-digits
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a valid length (10-15 digits)
  if (cleaned.length < 10 || cleaned.length > 15) {
    throw new ValidationError('Invalid phone number format');
  }

  return cleaned;
}

export function validateMessage(message) {
  if (!message || typeof message !== 'string') {
    throw new ValidationError('Message is required');
  }

  if (message.length > 4096) {
    throw new ValidationError('Message is too long (max 4096 characters)');
  }

  return message.trim();
}

export function validateCaseId(caseId) {
  if (!caseId) {
    throw new ValidationError('Case ID is required');
  }

  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(caseId)) {
    throw new ValidationError('Invalid case ID format');
  }

  return caseId;
}

export function validateWebhook(req, res, next) {
  try {
    if (!req.body) {
      throw new ValidationError('Request body is required');
    }

    // Basic webhook validation
    if (req.body.object && req.body.entry) {
      return next();
    }

    throw new ValidationError('Invalid webhook format');
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

export default {
  validatePhoneNumber,
  validateMessage,
  validateCaseId,
  validateWebhook
};

