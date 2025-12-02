/**
 * Database migration script (standalone)
 *
 * This script runs migrations independently from the application.
 * Useful for CI/CD pipelines or manual migration runs.
 *
 * Note: Migrations also run automatically when using initializeQuestionnaires
 * with the runMigrations option.
 */

import { Pool } from 'pg';
import { runMigrations } from 'qbuilder';

const pool = new Pool({
  host: 'localhost',
  port: 5437,
  database: 'qbuilder',
  user: 'qbuilder',
  password: 'qbuilder123',
});

async function main() {
  try {
    console.log('Starting database migrations...\n');

    const result = await runMigrations(pool);

    console.log('Migration results:');
    console.log(`  ✅ Executed: ${result.executed.length}`);
    result.executed.forEach((name) => console.log(`     - ${name}`));

    console.log(`  ⏭️  Skipped: ${result.skipped.length}`);
    result.skipped.forEach((name) => console.log(`     - ${name}`));

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
