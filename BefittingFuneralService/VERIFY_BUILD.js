#!/usr/bin/env node

/**
 * Build Verification Script
 * Checks that all required files and configurations are in place
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const errors = [];
const warnings = [];
const success = [];

// Check required files
const requiredFiles = [
  'package.json',
  '.gitignore',
  'src/index.js',
  'src/config/config.js',
  'src/whatsapp/webhook.js',
  'src/whatsapp/whatsappService.js',
  'src/whatsapp/messageRouter.js',
  'src/ai/aiService.js',
  'src/ai/prompts.js',
  'src/services/messageHandler.js',
  'src/services/stageLogic.js',
  'src/models/Contact.js',
  'src/models/Case.js',
  'src/models/Message.js',
  'src/models/Reminder.js',
  'src/db/database.js',
  'db/schema.sql',
  'README.md',
  'QUICK_START.md',
  'SETUP.md',
];

// Check optional but recommended files
const optionalFiles = [
  '.env.example',
];

// Check documentation files
const docFiles = [
  'DEPLOYMENT.md',
  'DATABASE.md',
  'WHATSAPP_SETUP.md',
  'FEATURES.md',
  'ROADMAP.md',
  'PROJECT_SUMMARY.md',
];

console.log('🔍 Verifying Build...\n');

// Check required files
console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    success.push(`✅ ${file}`);
  } else {
    errors.push(`❌ Missing: ${file}`);
  }
});

// Check optional files
console.log('\n📝 Checking optional files...');
optionalFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    success.push(`✅ ${file}`);
  } else {
    warnings.push(`⚠️  Missing (recommended): ${file}`);
  }
});

// Check documentation files
console.log('\n📚 Checking documentation...');
docFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    success.push(`✅ ${file}`);
  } else {
    warnings.push(`⚠️  Missing: ${file}`);
  }
});

// Check package.json
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  // Check required dependencies
  const requiredDeps = ['express', 'openai', 'pg', 'axios'];
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies?.[dep]) {
      success.push(`✅ Dependency: ${dep}`);
    } else {
      errors.push(`❌ Missing dependency: ${dep}`);
    }
  });
  
  // Check scripts
  if (packageJson.scripts?.start) {
    success.push('✅ Script: start');
  } else {
    errors.push('❌ Missing script: start');
  }
  
  if (packageJson.scripts?.dev) {
    success.push('✅ Script: dev');
  } else {
    warnings.push('⚠️  Missing script: dev (optional)');
  }
} catch (error) {
  errors.push(`❌ Error reading package.json: ${error.message}`);
}

// Check .env.example (if it exists)
console.log('\n⚙️  Checking .env.example...');
const envExamplePath = path.join(__dirname, '.env.example');
if (fs.existsSync(envExamplePath)) {
  try {
    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    const requiredVars = ['OPENAI_API_KEY', 'DATABASE_URL'];
    requiredVars.forEach(varName => {
      if (envExample.includes(varName)) {
        success.push(`✅ Environment variable: ${varName}`);
      } else {
        warnings.push(`⚠️  Missing env var example: ${varName}`);
      }
    });
  } catch (error) {
    warnings.push(`⚠️  Error reading .env.example: ${error.message}`);
  }
} else {
  warnings.push('⚠️  .env.example not found (create it from README or SETUP.md)');
}

// Check database schema
console.log('\n🗄️  Checking database schema...');
try {
  const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
  const requiredTables = ['contacts', 'cases', 'messages', 'reminders'];
  requiredTables.forEach(table => {
    if (schema.includes(`CREATE TABLE.*${table}`) || schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
      success.push(`✅ Table: ${table}`);
    } else {
      errors.push(`❌ Missing table: ${table}`);
    }
  });
  
  // Check for indexes
  if (schema.includes('CREATE INDEX')) {
    success.push('✅ Database indexes present');
  } else {
    warnings.push('⚠️  No database indexes found (performance may be affected)');
  }
} catch (error) {
  errors.push(`❌ Error reading schema.sql: ${error.message}`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(50));

if (success.length > 0) {
  console.log(`\n✅ Success: ${success.length} checks passed`);
}

if (warnings.length > 0) {
  console.log(`\n⚠️  Warnings: ${warnings.length}`);
  warnings.forEach(w => console.log(`   ${w}`));
}

if (errors.length > 0) {
  console.log(`\n❌ Errors: ${errors.length}`);
  errors.forEach(e => console.log(`   ${e}`));
  console.log('\n❌ BUILD VERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('\n✅ BUILD VERIFICATION PASSED');
  console.log('\n🎉 Project is ready to use!');
  console.log('\nNext steps:');
  console.log('1. Run: npm install');
  console.log('2. Copy .env.example to .env');
  console.log('3. Configure your environment variables');
  console.log('4. Run: npm start');
  console.log('\nSee QUICK_START.md for detailed instructions.');
  process.exit(0);
}

