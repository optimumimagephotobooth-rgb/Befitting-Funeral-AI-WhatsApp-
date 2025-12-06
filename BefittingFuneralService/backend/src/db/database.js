import pkg from 'pg';
const { Pool } = pkg;
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.app.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Initialize database schema
export async function initializeDatabase() {
  try {
    if (!config.database.url) {
      throw new Error('DATABASE_URL not configured');
    }

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = path;
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    
    // Check if schema file exists
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await pool.query(schema);
    logger.success('Database schema initialized successfully');
  } catch (error) {
    logger.error('Error initializing database schema:', error);
    throw error;
  }
}

export default pool;



