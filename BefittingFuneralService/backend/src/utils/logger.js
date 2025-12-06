/**
 * Comprehensive Logging System
 * Provides structured logging for production use
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logToFile = process.env.LOG_TO_FILE !== 'false';
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFile(type = 'app') {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${type}-${date}.log`);
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };
    return JSON.stringify(logEntry);
  }

  writeToFile(type, logEntry) {
    if (!this.logToFile) return;
    
    try {
      const logFile = this.getLogFile(type);
      fs.appendFileSync(logFile, logEntry + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.logLevel];
  }

  error(message, error = null) {
    if (!this.shouldLog('error')) return;
    
    const logEntry = this.formatMessage('ERROR', message, {
      error: error?.message,
      stack: error?.stack
    });
    
    console.error(`❌ [ERROR] ${message}`, error || '');
    this.writeToFile('error', logEntry);
  }

  warn(message, data = null) {
    if (!this.shouldLog('warn')) return;
    
    const logEntry = this.formatMessage('WARN', message, data);
    console.warn(`⚠️  [WARN] ${message}`, data || '');
    this.writeToFile('app', logEntry);
  }

  info(message, data = null) {
    if (!this.shouldLog('info')) return;
    
    const logEntry = this.formatMessage('INFO', message, data);
    console.log(`ℹ️  [INFO] ${message}`, data || '');
    this.writeToFile('app', logEntry);
  }

  debug(message, data = null) {
    if (!this.shouldLog('debug')) return;
    
    const logEntry = this.formatMessage('DEBUG', message, data);
    console.log(`🔍 [DEBUG] ${message}`, data || '');
    this.writeToFile('app', logEntry);
  }

  success(message, data = null) {
    const logEntry = this.formatMessage('SUCCESS', message, data);
    console.log(`✅ [SUCCESS] ${message}`, data || '');
    this.writeToFile('app', logEntry);
  }
}

export const logger = new Logger();
export default logger;

