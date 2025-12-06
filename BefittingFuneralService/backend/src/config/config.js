import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

/**
 * Centralized configuration for Befitting Funeral Service WhatsApp AI
 * All environment variables are loaded and organized here
 */

export const config = {
  whatsapp: {
    mode: (process.env.WHATSAPP_MODE || 'web').toLowerCase(), // 'web', 'webhook', or 'cloud'
    verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    wabaId: process.env.WHATSAPP_WABA_ID, // WhatsApp Business Account ID
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
    sessionPath: process.env.WHATSAPP_SESSION_PATH || './sessions',
    phoneNumber: process.env.WHATSAPP_PHONE_NUMBER
  },
  ai: {
    openAiApiKey: process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4',
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7
  },
  database: {
    url: process.env.DATABASE_URL
  },
  app: {
    port: parseInt(process.env.PORT) || 3000,
    baseUrl: process.env.BASE_URL || process.env.WEBHOOK_URL || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },
  featureFlags: {
    supabaseMessageStoreOnly: process.env.SUPABASE_MESSAGE_STORE_ONLY === 'true'
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET
  },
  service: {
    name: process.env.SERVICE_NAME || 'Befitting Funeral Service',
    phone: process.env.SERVICE_PHONE,
    email: process.env.SERVICE_EMAIL || 'befittingfuneralhome1@gmail.com',
    website: process.env.SERVICE_WEBSITE || 'www.befittingfuneralservices.com',
    address: process.env.SERVICE_ADDRESS || 'Accra, Ghana',
    businessHours: process.env.BUSINESS_HOURS || 'Monday - Friday: 9 AM - 5 PM\nSaturday: 10 AM - 2 PM\nSunday: Closed',
    momoNumber: process.env.MOMO_NUMBER || '0593240314',
    momoName: process.env.MOMO_NAME || 'Befitting Funeral Home / Louisa Manyah',
    bankName: process.env.BANK_NAME || 'Zenith Bank',
    bankAccount: process.env.BANK_ACCOUNT || '6010820758',
    bankAccountName: process.env.BANK_ACCOUNT_NAME || 'Befitting Funeral Home',
    bankBranch: process.env.BANK_BRANCH || 'Graphic Road Accra'
  },
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.EMAIL_FROM || 'noreply@befittingfuneralservices.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Befitting Funeral Services'
  }
};

// Validation helpers
function logIssue(issue) {
  const message = `[CONFIG] ${issue.area} ${issue.severity === 'error' ? 'disabled' : 'limited'} – missing ${issue.key}`;
  if (issue.severity === 'error') {
    logger.error(message);
  } else {
    logger.warn(message);
  }
}

/**
 * Validates required environment variables and reports missing pieces.
 * @returns {{ ok: boolean, issues: Array<{area:string,key:string,severity:'error'|'warning'}> }}
 */
export function validateConfig() {
  const issues = [];
  const whatsappMode = config.whatsapp.mode;

  if (!config.ai.openAiApiKey) {
    issues.push({ area: 'AI', key: 'OPENAI_API_KEY', severity: 'error' });
  }

  if (!config.database.url) {
    issues.push({ area: 'Database', key: 'DATABASE_URL', severity: 'warning' });
  }

  if (whatsappMode === 'webhook' || whatsappMode === 'cloud') {
    if (!config.whatsapp.accessToken) {
      issues.push({
        area: 'WhatsApp',
        key: 'WHATSAPP_ACCESS_TOKEN',
        severity: 'error'
      });
    }
    if (!config.whatsapp.phoneNumberId) {
      issues.push({
        area: 'WhatsApp',
        key: 'WHATSAPP_PHONE_NUMBER_ID',
        severity: 'error'
      });
    }
    if (!config.whatsapp.verifyToken) {
      issues.push({
        area: 'WhatsApp',
        key: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
        severity: 'error'
      });
    }
  }

  if (!config.email.sendgridApiKey) {
    issues.push({
      area: 'SendGrid',
      key: 'SENDGRID_API_KEY',
      severity: 'warning'
    });
  }

  if (!config.supabase.url || !config.supabase.serviceKey) {
    issues.push({
      area: 'Supabase',
      key: 'SUPABASE_URL or SUPABASE_SERVICE_KEY',
      severity: 'warning'
    });
  }

  if (!config.auth.jwtSecret) {
    issues.push({
      area: 'Auth',
      key: 'JWT_SECRET',
      severity: 'warning'
    });
  }

  issues.forEach(logIssue);

  const ok = !issues.some(issue => issue.severity === 'error');
  return { ok, issues };
}

export default config;

