import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralized configuration for Befitting Funeral Service WhatsApp AI
 * All environment variables are loaded and organized here
 */

export const config = {
  whatsapp: {
    mode: process.env.WHATSAPP_MODE || 'web', // 'web' or 'webhook' or 'cloud'
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

// Validation
export function validateConfig() {
  const errors = [];
  const warnings = [];

  // AI configuration is required
  if (!config.ai.openAiApiKey) {
    errors.push('OPENAI_API_KEY is required');
  }

  // Database is recommended but not required (system can run without it)
  if (!config.database.url) {
    warnings.push('DATABASE_URL not set - some features will be limited');
  }

  // WhatsApp webhook/cloud mode requires specific config
  if (config.whatsapp.mode === 'webhook' || config.whatsapp.mode === 'cloud') {
    if (!config.whatsapp.accessToken) {
      errors.push('WHATSAPP_ACCESS_TOKEN is required for webhook/cloud mode');
    }
    if (!config.whatsapp.phoneNumberId) {
      errors.push('WHATSAPP_PHONE_NUMBER_ID is required for webhook/cloud mode');
    }
    if (!config.whatsapp.verifyToken) {
      errors.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN is required for webhook/cloud mode');
    }
  }

  // SendGrid is optional (only needed for B2B email features)
  if (!config.email.sendgridApiKey) {
    warnings.push('SENDGRID_API_KEY not set - B2B email features will be limited');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    return false;
  }

  return true;
}

export default config;

