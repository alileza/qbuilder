/**
 * Database migration script
 *
 * Runs the SQL migrations to set up the database schema
 */

import { Pool } from 'pg';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  host: 'localhost',
  port: 5437,
  database: 'qbuilder',
  user: 'qbuilder',
  password: 'qbuilder123',
});

async function runMigration(name: string, sql: string): Promise<void> {
  console.log(`Running migration: ${name}...`);
  try {
    await pool.query(sql);
    console.log(`✅ ${name} completed`);
  } catch (error) {
    console.error(`❌ ${name} failed:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting database migrations...\n');

    // Read migration files from qbuilder package
    const migrationsPath = join(__dirname, '../../node_modules/qbuilder/src/db/migrations');

    const migration1 = await readFile(
      join(migrationsPath, '001_create_questionnaires.sql'),
      'utf-8'
    );
    const migration2 = await readFile(
      join(migrationsPath, '002_create_submissions.sql'),
      'utf-8'
    );

    await runMigration('001_create_questionnaires', migration1);
    await runMigration('002_create_submissions', migration2);

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
