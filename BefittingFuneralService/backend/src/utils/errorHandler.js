/**
 * Comprehensive Error Handling System
 * Centralized error handling and recovery
 */

import { logger } from './logger.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

export class AIServiceError extends AppError {
  constructor(message) {
    super(message, 503);
    this.name = 'AIServiceError';
  }
}

export class WhatsAppError extends AppError {
  constructor(message) {
    super(message, 503);
    this.name = 'WhatsAppError';
  }
}

export function handleError(error, req = null, res = null) {
  logger.error('Error occurred', error);

  // If it's an operational error, send user-friendly message
  if (error.isOperational) {
    if (res) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
    return { success: false, error: error.message };
  }

  // For programming errors, log but don't expose details
  logger.error('Unexpected error', error);
  
  if (res) {
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again later.'
    });
  }
  
  return { success: false, error: 'An unexpected error occurred' };
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorMiddleware(error, req, res, next) {
  handleError(error, req, res);
}

export default {
  AppError,
  ValidationError,
  DatabaseError,
  AIServiceError,
  WhatsAppError,
  handleError,
  asyncHandler,
  errorMiddleware
};

