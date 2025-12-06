/**
 * Database Migration System
 * Handles database schema updates and migrations
 */

import pool from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationManager {
  constructor() {
    this.migrationsTable = 'schema_migrations';
  }

  async ensureMigrationsTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      logger.info('Migrations table ensured');
    } catch (error) {
      logger.error('Failed to create migrations table', error);
      throw error;
    }
  }

  async getAppliedMigrations() {
    try {
      const result = await pool.query(
        `SELECT version FROM ${this.migrationsTable} ORDER BY applied_at ASC`
      );
      return result.rows.map(row => row.version);
    } catch (error) {
      logger.error('Failed to get applied migrations', error);
      return [];
    }
  }

  async applyMigration(version, name, sql) {
    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query(
        `INSERT INTO ${this.migrationsTable} (version, name) VALUES ($1, $2)`,
        [version, name]
      );
      await pool.query('COMMIT');
      logger.success(`Applied migration: ${version} - ${name}`);
      return true;
    } catch (error) {
      await pool.query('ROLLBACK');
      logger.error(`Failed to apply migration ${version}`, error);
      throw error;
    }
  }

  async runMigrations() {
    try {
      await this.ensureMigrationsTable();
      const applied = await this.getAppliedMigrations();
      
      // Read schema.sql as initial migratio      const schemaPath = path.join(__dirname, '../database/schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        const version = '001_initial_schema';
        
        if (!applied.includes(version)) {
          await this.applyMigration(version, 'Initial Schema', schema);
        }
      }

      logger.success('All migrations completed');
    } catch (error) {
      logger.error('Migration failed', error);
      throw error;
    }
  }
}

export const migrationManager = new MigrationManager();

export default migrationManager;

