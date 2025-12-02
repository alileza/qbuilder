/**
 * Database migration utilities
 *
 * Provides functions to run SQL migrations for qbuilder tables.
 * Uses a simple migration tracking table to ensure migrations only run once.
 */

import type { Pool } from 'pg';

/**
 * Migration definition
 */
export interface Migration {
  name: string;
  up: string;
  down: string;
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
    up: `
CREATE TABLE IF NOT EXISTS questionnaires (
    id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionnaire_versions (
    id SERIAL PRIMARY KEY,
    questionnaire_id VARCHAR(255) NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(questionnaire_id, version)
);

CREATE INDEX IF NOT EXISTS idx_qv_questionnaire_id ON questionnaire_versions(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_qv_questionnaire_version ON questionnaire_versions(questionnaire_id, version);
`,
    down: `
DROP TABLE IF EXISTS questionnaire_versions;
DROP TABLE IF EXISTS questionnaires;
`,
  },
  {
    name: '002_create_submissions',
    up: `
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id VARCHAR(255) NOT NULL REFERENCES questionnaires(id),
    questionnaire_version INTEGER NOT NULL,
    answers JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (questionnaire_id, questionnaire_version)
        REFERENCES questionnaire_versions(questionnaire_id, version)
);

CREATE INDEX IF NOT EXISTS idx_submissions_questionnaire ON submissions(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_submissions_questionnaire_version ON submissions(questionnaire_id, questionnaire_version);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
`,
    down: `
DROP TABLE IF EXISTS submissions;
`,
  },
  {
    name: '003_add_metadata_column',
    up: `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'questionnaire_versions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE questionnaire_versions ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'submissions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE submissions ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}';
    END IF;
END $$;
`,
    down: `
ALTER TABLE questionnaire_versions DROP COLUMN IF EXISTS metadata;
ALTER TABLE submissions DROP COLUMN IF EXISTS metadata;
`,
  },
];

/**
 * Create the migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS qbuilder_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

/**
 * Get list of already applied migrations
 */
async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<{ name: string }>(
    'SELECT name FROM qbuilder_migrations ORDER BY id'
  );
  return new Set(result.rows.map((row) => row.name));
}

/**
 * Mark a migration as applied
 */
async function markMigrationApplied(pool: Pool, name: string): Promise<void> {
  await pool.query(
    'INSERT INTO qbuilder_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
    [name]
  );
}

/**
 * Run all pending migrations
 *
 * This function is idempotent - it will only run migrations that haven't been applied yet.
 * It tracks applied migrations in a `qbuilder_migrations` table.
 *
 * @param pool - PostgreSQL connection pool
 * @returns Result containing executed and skipped migrations
 *
 * @example
 * ```typescript
 * import { Pool } from 'pg';
 * import { runMigrations } from 'qbuilder';
 *
 * const pool = new Pool({ connectionString: 'postgres://...' });
 * const result = await runMigrations(pool);
 * console.log('Executed:', result.executed);
 * console.log('Skipped:', result.skipped);
 * ```
 */
export async function runMigrations(pool: Pool): Promise<MigrationResult> {
  const result: MigrationResult = {
    executed: [],
    skipped: [],
  };

  // Ensure migrations table exists
  await ensureMigrationsTable(pool);

  // Get already applied migrations
  const applied = await getAppliedMigrations(pool);

  // Run each migration in order
  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      result.skipped.push(migration.name);
      continue;
    }

    // Run the migration
    await pool.query(migration.up);

    // Mark as applied
    await markMigrationApplied(pool, migration.name);

    result.executed.push(migration.name);
  }

  return result;
}
