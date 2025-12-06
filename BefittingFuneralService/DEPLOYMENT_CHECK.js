/**
 * Comprehensive Deployment Check
 * Verifies system is ready for plug-and-play deployment
 */

import { SystemCheck } from './src/utils/systemCheck.js';
import { logger } from './src/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runDeploymentCheck() {
  console.log('\n🚀 DEPLOYMENT READINESS CHECK\n');
  console.log('='.repeat(60));
  
  const issues = [];
  const warnings = [];
  const passed = [];

  // 1. Check .env file exists
  console.log('\n📋 Checking configuration files...');
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    issues.push('❌ .env file not found. Copy .env.example to .env and configure.');
  } else {
    passed.push('✅ .env file exists');
  }

  // 2. Check package.json dependencies
  console.log('\n📦 Checking dependencies...');
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const requiredDeps = [
    'express',
    'whatsapp-web.js',
    'openai',
    'dotenv',
    'axios',
    'pg',
    '@sendgrid/mail',
    'cheerio',
    'puppeteer',
    'node-cron'
  ];

  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  if (missingDeps.length > 0) {
    issues.push(`❌ Missing dependencies: ${missingDeps.join(', ')}. Run: npm install`);
  } else {
    passed.push('✅ All required dependencies in package.json');
  }

  // 3. Check critical files exist
  console.log('\n📁 Checking critical files...');
  const criticalFiles = [
    'src/index.js',
    'src/config/config.js',
    'src/services/messageHandler.js',
    'src/services/aiService.js',
    'src/whatsapp/whatsappService.js',
    'db/schema.sql'
  ];

  criticalFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      issues.push(`❌ Missing critical file: ${file}`);
    } else {
      passed.push(`✅ ${file} exists`);
    }
  });

  // 4. Run system check
  console.log('\n🔍 Running system checks...');
  try {
    const systemCheck = new SystemCheck();
    const result = await systemCheck.runAllChecks();
    
    passed.push(...result.checks);
    warnings.push(...result.warnings);
    issues.push(...result.errors);
  } catch (error) {
    warnings.push(`⚠️  System check error: ${error.message}`);
  }

  // 5. Check directory structure
  console.log('\n📂 Checking directory structure...');
  const requiredDirs = [
    'src',
    'src/services',
    'src/models',
    'src/routes',
    'src/utils',
    'src/middleware',
    'db'
  ];

  requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      issues.push(`❌ Missing directory: ${dir}`);
    } else {
      passed.push(`✅ ${dir}/ directory exists`);
    }
  });

  // 6. Check logs directory (will be created automatically)
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    warnings.push('⚠️  logs/ directory will be created automatically');
  } else {
    passed.push('✅ logs/ directory exists');
  }

  // Print report
  console.log('\n' + '='.repeat(60));
  console.log('📊 DEPLOYMENT CHECK REPORT');
  console.log('='.repeat(60));

  console.log('\n✅ Passed Checks:');
  passed.forEach(check => console.log(`  ${check}`));

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  ${warning}`));
  }

  if (issues.length > 0) {
    console.log('\n❌ Issues Found:');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('\n⚠️  Please fix issues before deployment');
    process.exit(1);
  } else {
    console.log('\n✅ All checks passed! System is ready for deployment.');
    console.log('\n📝 Next Steps:');
    console.log('  1. Ensure .env file is configured');
    console.log('  2. Run: npm install');
    console.log('  3. Run: npm start');
    console.log('  4. System will auto-initialize\n');
    process.exit(0);
  }
}

runDeploymentCheck().catch(error => {
  console.error('❌ Deployment check failed:', error);
  process.exit(1);
});

