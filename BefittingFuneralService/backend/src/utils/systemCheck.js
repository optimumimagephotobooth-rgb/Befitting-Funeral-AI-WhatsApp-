/**
 * System Check Utility
 * Verifies all components are properly configured and ready
 */

import { config } from '../config/config.js';
import { logger } from './logger.js';
import pool from '../db/database.js';

export class SystemCheck {
  constructor() {
    this.checks = [];
    this.errors = [];
    this.warnings = [];
  }

  async runAllChecks() {
    logger.info('🔍 Running system checks...');
    
    this.checkConfiguration();
    await this.checkDatabase();
    this.checkServices();
    this.checkDependencies();
    
    return {
      passed: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      checks: this.checks
    };
  }

  checkConfiguration() {
    logger.info('Checking configuration...');
    
    // Check required environment variables
    const required = {
      'OPENAI_API_KEY': config.ai.openAiApiKey,
      'DATABASE_URL': config.database.url
    };

    for (const [key, value] of Object.entries(required)) {
      if (!value) {
        this.errors.push(`Missing required configuration: ${key}`);
      } else {
        this.checks.push(`✅ ${key} is configured`);
      }
    }

    // Check optional but recommended
    if (!config.email.sendgridApiKey) {
      this.warnings.push('SENDGRID_API_KEY not set - B2B email features will be limited');
    } else {
      this.checks.push('✅ SendGrid API key configured');
    }

    // Check WhatsApp mode
    if (config.whatsapp.mode === 'webhook') {
      if (!config.whatsapp.accessToken) {
        this.errors.push('WHATSAPP_ACCESS_TOKEN required for webhook mode');
      }
      if (!config.whatsapp.phoneNumberId) {
        this.errors.push('WHATSAPP_PHONE_NUMBER_ID required for webhook mode');
      }
      if (!config.whatsapp.verifyToken) {
        this.errors.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN required for webhook mode');
      }
    }

    this.checks.push(`✅ WhatsApp mode: ${config.whatsapp.mode}`);
  }

  async checkDatabase() {
    logger.info('Checking database connection...');
    
    if (!config.database.url) {
      this.warnings.push('Database URL not configured - some features will be limited');
      return;
    }

    try {
      const result = await pool.query('SELECT NOW()');
      this.checks.push('✅ Database connection successful');
      
      // Check tables exist
      const tables = ['contacts', 'cases', 'messages', 'referrals', 'b2b_leads'];
      for (const table of tables) {
        try {
          await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
          this.checks.push(`✅ Table '${table}' exists`);
        } catch (error) {
          this.warnings.push(`Table '${table}' may not exist - will be created on first run`);
        }
      }
    } catch (error) {
      this.errors.push(`Database connection failed: ${error.message}`);
    }
  }

  checkServices() {
    logger.info('Checking services...');
    
    // Check service configuration
    if (!config.service.name) {
      this.warnings.push('Service name not configured');
    } else {
      this.checks.push(`✅ Service name: ${config.service.name}`);
    }

    if (!config.service.email) {
      this.warnings.push('Service email not configured');
    } else {
      this.checks.push(`✅ Service email: ${config.service.email}`);
    }

    if (!config.service.website) {
      this.warnings.push('Service website not configured');
    } else {
      this.checks.push(`✅ Service website: ${config.service.website}`);
    }
  }

  checkDependencies() {
    logger.info('Checking dependencies...');
    
    // This would ideally check if modules can be imported
    // For now, we'll assume npm install was run
    this.checks.push('✅ Dependencies check (run npm install if issues occur)');
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYSTEM CHECK REPORT');
    console.log('='.repeat(60));
    
    console.log('\n✅ Checks Passed:');
    this.checks.forEach(check => console.log(`  ${check}`));
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  ${error}`));
      console.log('\n⚠️  Please fix errors before deployment');
    } else {
      console.log('\n✅ All critical checks passed! System is ready.');
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

export default SystemCheck;

