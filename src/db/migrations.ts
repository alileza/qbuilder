/**
 * Database migration utilities
 *
 * Provides functions to run SQL migrations for qbuilder tables.
 * Uses a simple migration tracking table to ensure migrations only run once.
 */

import type { Pool } from 'pg';

/**
 * Default table prefix for all qbuilder tables
 */
export const DEFAULT_TABLE_PREFIX = 'qbuilder_';

/**
 * Options for running migrations
 */
export interface MigrationOptions {
  /**
   * Table name prefix (default: 'qbuilder_')
   * Tables will be named: {prefix}questionnaires, {prefix}submissions, etc.
   */
  tablePrefix?: string;
}

/**
 * Migration definition with dynamic SQL generation
 */
export interface Migration {
  name: string;
  up: (prefix: string) => string;
  down: (prefix: string) => string;
}

/**
 * Result of running migrations
 */
export interface MigrationResult {
  /**
   * Migrations that were executed
   */
  executed: string[];

  /**
   * Migrations that were skipped (already applied)
   */
  skipped: string[];
}

/**
 * Built-in migrations for qbuilder
 */
export const migrations: Migration[] = [
  {
    name: '001_create_questionnaires',
    up: (p) => `
CREATE TABLE IF NOT EXISTS ${p}questionnaires (
    id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ${p}questionnaire_versions (
    id SERIAL PRIMARY KEY,
    questionnaire_id VARCHAR(255) NOT NULL REFERENCES ${p}questionnaires(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(questionnaire_id, version)
);

CREATE INDEX IF NOT EXISTS idx_${p}qv_questionnaire_id ON ${p}questionnaire_versions(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_${p}qv_questionnaire_version ON ${p}questionnaire_versions(questionnaire_id, version);
`,
    down: (p) => `
DROP TABLE IF EXISTS ${p}questionnaire_versions;
DROP TABLE IF EXISTS ${p}questionnaires;
`,
  },
  {
    name: '002_create_submissions',
    up: (p) => `
CREATE TABLE IF NOT EXISTS ${p}submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id VARCHAR(255) NOT NULL REFERENCES ${p}questionnaires(id),
    questionnaire_version INTEGER NOT NULL,
    answers JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (questionnaire_id, questionnaire_version)
        REFERENCES ${p}questionnaire_versions(questionnaire_id, version)
);

CREATE INDEX IF NOT EXISTS idx_${p}submissions_questionnaire ON ${p}submissions(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_${p}submissions_questionnaire_version ON ${p}submissions(questionnaire_id, questionnaire_version);
CREATE INDEX IF NOT EXISTS idx_${p}submissions_created_at ON ${p}submissions(created_at);
`,
    down: (p) => `
DROP TABLE IF EXISTS ${p}submissions;
`,
  },
  {
    name: '003_add_metadata_column',
    up: (p) => `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '${p}questionnaire_versions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE ${p}questionnaire_versions ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '${p}submissions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE ${p}submissions ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}';
    END IF;
END $$;
`,
    down: (p) => `
ALTER TABLE ${p}questionnaire_versions DROP COLUMN IF EXISTS metadata;
ALTER TABLE ${p}submissions DROP COLUMN IF EXISTS metadata;
`,
  },
];

/**
 * Create the migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable(pool: Pool, prefix: string): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${prefix}migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

/**
 * Get list of already applied migrations
 */
async function getAppliedMigrations(pool: Pool, prefix: string): Promise<Set<string>> {
  const result = await pool.query<{ name: string }>(
    `SELECT name FROM ${prefix}migrations ORDER BY id`
  );
  return new Set(result.rows.map((row) => row.name));
}

/**
 * Mark a migration as applied
 */
async function markMigrationApplied(pool: Pool, prefix: string, name: string): Promise<void> {
  await pool.query(
    `INSERT INTO ${prefix}migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
    [name]
  );
}

/**
 * Run all pending migrations
 *
 * This function is idempotent - it will only run migrations that haven't been applied yet.
 * It tracks applied migrations in a `{prefix}migrations` table.
 *
 * @param pool - PostgreSQL connection pool
 * @param options - Migration options including table prefix
 * @returns Result containing executed and skipped migrations
 *
 * @example
 * ```typescript
 * import { Pool } from 'pg';
 * import { runMigrations } from 'qbuilder';
 *
 * const pool = new Pool({ connectionString: 'postgres://...' });
 *
 * // Uses default 'qbuilder_' prefix
 * const result = await runMigrations(pool);
 *
 * // Or with custom prefix
 * const result = await runMigrations(pool, { tablePrefix: 'myapp_' });
 *
 * console.log('Executed:', result.executed);
 * console.log('Skipped:', result.skipped);
 * ```
 */
export async function runMigrations(
  pool: Pool,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const prefix = options.tablePrefix ?? DEFAULT_TABLE_PREFIX;

  const result: MigrationResult = {
    executed: [],
    skipped: [],
  };

  // Ensure migrations table exists
  await ensureMigrationsTable(pool, prefix);

  // Get already applied migrations
  const applied = await getAppliedMigrations(pool, prefix);

  // Run each migration in order
  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      result.skipped.push(migration.name);
      continue;
    }

    // Run the migration with the prefix
    await pool.query(migration.up(prefix));

    // Mark as applied
    await markMigrationApplied(pool, prefix, migration.name);

    result.executed.push(migration.name);
  }

  return result;
}
