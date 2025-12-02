/**
 * QBuilder Example Application
 *
 * This example demonstrates:
 * 1. Database setup with PostgreSQL (with auto-migrations)
 * 2. Loading questionnaires from JSON files
 * 3. Creating a REST API with Express
 * 4. Submitting and validating answers
 */

import express from 'express';
import { Pool } from 'pg';
import {
  createQuestionnaireRepository,
  createSubmissionRepository,
  createQuestionnaireRouter,
  initializeQuestionnaires,
} from 'qbuilder';

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5437,
  database: 'qbuilder',
  user: 'qbuilder',
  password: 'qbuilder123',
});

// Create repositories
const questionnaireRepo = createQuestionnaireRepository(pool);
const submissionRepo = createSubmissionRepository(pool);

async function initializeApp() {
  console.log('🚀 Initializing QBuilder Example Application...\n');

  // Combined: Run migrations and load questionnaires from files
  console.log('📦 Running migrations and loading questionnaires...');
  const initResult = await initializeQuestionnaires(questionnaireRepo, {
    pool, // Pass pool for migrations
    runMigrations: true, // Run DB migrations automatically
    directory: './questionnaires',
    updateExisting: true, // Update if content changed
  });

  // Show migration results
  if (initResult.migrations) {
    console.log(`\n🗄️  Migrations:`);
    console.log(`   ✅ Executed: ${initResult.migrations.executed.length}`);
    console.log(`   ⏭️  Skipped: ${initResult.migrations.skipped.length}`);
  }

  console.log(`\n📂 Questionnaires:`);
  console.log(`   ✅ Initialized: ${initResult.initialized}`);
  console.log(`   ⏭️  Skipped: ${initResult.skipped}`);
  console.log(`   ❌ Errors: ${initResult.errors.length}`);

  if (initResult.errors.length > 0) {
    console.error('\n❌ Initialization errors:');
    initResult.errors.forEach((err) => {
      console.error(`   - ${err.source}: ${err.error.message}`);
    });
  }

  console.log('\n📋 Available questionnaires:');
  const questionnaires = await questionnaireRepo.list();
  questionnaires.forEach((q) => {
    console.log(`   - ${q.id} (v${q.latestVersion}): ${q.title}`);
  });

  // Step 2: Set up Express app with QBuilder router
  const app = express();

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'QBuilder Example API is running' });
  });

  // Mount QBuilder API routes
  app.use(
    '/api',
    createQuestionnaireRouter({
      questionnaireRepository: questionnaireRepo,
      submissionRepository: submissionRepo,
    })
  );

  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🎉 Server is running!`);
    console.log(`   🔗 API: http://localhost:${PORT}/api`);
    console.log(`   📖 OpenAPI: http://localhost:${PORT}/api/openapi.json`);
    console.log(`   💚 Health: http://localhost:${PORT}/health`);
    console.log('\n📚 Try these commands:');
    console.log(`   curl http://localhost:${PORT}/api/questionnaires`);
    console.log(`   curl http://localhost:${PORT}/api/questionnaires/employee-onboarding`);
    console.log('\n💡 Example submission:');
    console.log(`   curl -X POST http://localhost:${PORT}/api/questionnaires/employee-onboarding/submissions \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"answers": {"fullName": "John Doe", "email": "john@example.com", "hasExperience": "yes", "yearsOfExperience": "5", "department": "engineering", "startDate": "2025-01-15"}}'`);
  });
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\n\n👋 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Start the application
initializeApp().catch((error) => {
  console.error('❌ Failed to initialize application:', error);
  process.exit(1);
});
