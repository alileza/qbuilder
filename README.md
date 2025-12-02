# QBuilder

A modular, type-safe questionnaire engine for Node.js with branching logic, validation, and versioning support.

[![Tests](https://img.shields.io/badge/tests-298%20passing-brightgreen)](https://github.com/alileza/qbuilder)
[![Coverage](https://img.shields.io/badge/coverage-88%25-green)](https://github.com/alileza/qbuilder)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Features

- 🔀 **Branching Logic**: Show/hide questions based on previous answers with powerful condition operators
- ✅ **Runtime Validation**: Type-safe validation using Zod with custom error messages
- 📦 **Extensible**: Easy to add custom question types and validation rules
- 🗄️ **Versioning**: Immutable questionnaire versions with PostgreSQL storage
- 📂 **File-Based Init**: Load questionnaires from JSON files with smart versioning
- 🔄 **Auto Migrations**: Run database migrations automatically on startup
- 🏷️ **Table Prefix**: Configurable table prefix (default: `qbuilder_`) to avoid naming conflicts
- 📋 **Metadata Support**: Store arbitrary metadata with questionnaires and submissions
- 🚀 **REST API**: Ready-to-use Express router with OpenAPI specification
- 📝 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Well Tested**: 298 tests with 88% coverage

## Installation

### From npm (when published)

```bash
npm install qbuilder
```

### From GitHub Packages

```bash
# Configure npm to use GitHub Packages
npm config set @alileza:registry https://npm.pkg.github.com

# Install from GitHub Packages
npm install @alileza/qbuilder
```

See [Installing from GitHub Packages](.github/INSTALLING_FROM_GITHUB_PACKAGES.md) for detailed instructions.

### Peer Dependencies

```bash
# Required for database functionality
npm install pg

# Required for REST API (optional)
npm install express
```

## Quick Start

### 1. Define a Questionnaire

```typescript
import { parseQuestionnaire } from 'qbuilder';

const questionnaire = parseQuestionnaire({
  id: 'employee-onboarding',
  title: 'Employee Onboarding Form',
  description: 'Collect new employee information',
  questions: [
    {
      id: 'fullName',
      type: 'text',
      label: 'Full Name',
      required: true,
    },
    {
      id: 'hasJob',
      type: 'choice',
      label: 'Do you have a current job?',
      required: true,
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
    },
    {
      id: 'currentCompany',
      type: 'text',
      label: 'Current Company Name',
      required: true,
      // Only show if hasJob is 'yes'
      visibleIf: {
        all: [
          { questionId: 'hasJob', operator: 'equals', value: 'yes' }
        ],
      },
    },
  ],
});
```

### 2. Validate Answers

```typescript
import { validateAnswers } from 'qbuilder';

const answers = {
  fullName: 'John Doe',
  hasJob: 'yes',
  currentCompany: 'Acme Corp',
};

const result = validateAnswers(questionnaire, answers);

if (result.success) {
  console.log('Valid!', result.data);
} else {
  console.log('Validation errors:', result.errors);
}
```

### 3. Get Visible Questions

```typescript
import { getVisibleQuestions } from 'qbuilder';

// User answers hasJob = 'no'
const partialAnswers = { hasJob: 'no' };

// currentCompany won't be in visible questions
const visibleQuestions = getVisibleQuestions(questionnaire, partialAnswers);
console.log(visibleQuestions.map(q => q.id)); // ['fullName', 'hasJob']
```

## Database Integration

### Setup

```typescript
import { Pool } from 'pg';
import {
  createQuestionnaireRepository,
  createSubmissionRepository,
  runMigrations,
} from 'qbuilder';

const pool = new Pool({
  host: 'localhost',
  database: 'myapp',
  user: 'postgres',
  password: 'password',
});

// Create repositories (uses default 'qbuilder_' table prefix)
const questionnaireRepo = createQuestionnaireRepository(pool);
const submissionRepo = createSubmissionRepository(pool);

// Or with custom table prefix
const questionnaireRepo = createQuestionnaireRepository(pool, { tablePrefix: 'myapp_' });
const submissionRepo = createSubmissionRepository(pool, { tablePrefix: 'myapp_' });
```

### Run Migrations

QBuilder provides automatic migrations. Tables are prefixed with `qbuilder_` by default:
- `qbuilder_questionnaires`
- `qbuilder_questionnaire_versions`
- `qbuilder_submissions`
- `qbuilder_migrations`

**Option 1: Run migrations separately**

```typescript
import { runMigrations } from 'qbuilder';

// Run with default prefix
await runMigrations(pool);

// Or with custom prefix
await runMigrations(pool, { tablePrefix: 'myapp_' });
```

**Option 2: Run migrations with initialization (recommended)**

```typescript
import { initializeQuestionnaires } from 'qbuilder';

// Combined: run migrations + load questionnaires
const result = await initializeQuestionnaires(questionnaireRepo, {
  pool,
  runMigrations: true,
  directory: './questionnaires',
});

console.log('Migrations:', result.migrations);
// { executed: ['001_create_questionnaires', ...], skipped: [] }
```

### Store Questionnaires

```typescript
// Create a new questionnaire (version 1)
const created = await questionnaireRepo.create(questionnaire);
console.log(created.version); // 1

// Create with metadata
const created = await questionnaireRepo.create(questionnaire, {
  metadata: { category: 'onboarding', createdBy: 'admin' }
});

// Update creates a new version
const updated = await questionnaireRepo.update('employee-onboarding', updatedDefinition);
console.log(updated.version); // 2

// Retrieve specific version
const v1 = await questionnaireRepo.findByIdAndVersion('employee-onboarding', 1);

// Get latest version (includes metadata)
const latest = await questionnaireRepo.findById('employee-onboarding');
console.log(latest.metadata); // { category: 'onboarding', ... }
```

### Store Submissions

```typescript
// Submit answers
const submission = await submissionRepo.create(
  'employee-onboarding',
  1, // version
  answers
);

// Submit with metadata
const submission = await submissionRepo.create(
  'employee-onboarding',
  1,
  answers,
  { metadata: { source: 'mobile-app', sessionId: 'abc123' } }
);

// List submissions with pagination
const results = await submissionRepo.listByQuestionnaire('employee-onboarding', {
  version: 1, // optional filter
  limit: 20,
  offset: 0,
});

console.log(results.items); // Array of submissions (includes metadata)
console.log(results.total); // Total count
```

### Initialize from Files

Load and register questionnaires from JSON files during application startup:

```typescript
import { initializeQuestionnaires } from 'qbuilder';

// Recommended: Combined migrations + file loading
const result = await initializeQuestionnaires(questionnaireRepo, {
  pool,                    // Required for migrations
  runMigrations: true,     // Run DB migrations automatically
  tablePrefix: 'qbuilder_', // Optional, this is the default
  directory: './questionnaires',
  updateExisting: true,    // Update if content changed
});

console.log('Migrations:', result.migrations?.executed);
console.log(`Initialized: ${result.initialized}`);
console.log(`Skipped: ${result.skipped}`);

// Option 1: Load from specific files (without migrations)
const result = await initializeQuestionnaires(questionnaireRepo, {
  files: [
    './questionnaires/onboarding.json',
    './questionnaires/survey.json',
  ],
});

// Option 2: Load all questionnaires from a directory
const result = await initializeQuestionnaires(questionnaireRepo, {
  directory: './questionnaires',
});

// Option 3: Load from inline definitions
const result = await initializeQuestionnaires(questionnaireRepo, {
  definitions: [
    { id: 'onboarding', title: 'Onboarding', questions: [...] },
  ],
});

// Option 4: Combine multiple sources
const result = await initializeQuestionnaires(questionnaireRepo, {
  pool,
  runMigrations: true,
  files: ['./questionnaires/main.json'],
  directory: './questionnaires/templates',
  definitions: [{ id: 'custom', title: 'Custom', questions: [...] }],
  continueOnError: true,   // Don't fail fast on errors
  updateExisting: true,    // Update if content changed
});

console.log(`Initialized: ${result.initialized}`);
console.log(`Skipped: ${result.skipped}`);
console.log(`Errors: ${result.errors.length}`);
```

**How versioning works during initialization:**

- **New questionnaires**: Created as version 1
- **Existing questionnaires with `updateExisting: false`** (default): Skipped entirely
- **Existing questionnaires with `updateExisting: true`**:
  - If content is **identical** to existing version: Skipped (prevents unnecessary versions)
  - If content has **changed**: Creates a new version (v2, v3, etc.)

This prevents creating duplicate versions on every app restart while still allowing updates when needed:

```typescript
// First run: Creates version 1
await initializeQuestionnaires(repo, {
  files: ['./onboarding.json'],
  updateExisting: true,
});
// Result: initialized=1, skipped=0

// Second run (no changes): Skips because content is identical
await initializeQuestionnaires(repo, {
  files: ['./onboarding.json'],
  updateExisting: true,
});
// Result: initialized=0, skipped=1

// Third run (after editing onboarding.json): Creates version 2
await initializeQuestionnaires(repo, {
  files: ['./onboarding.json'],
  updateExisting: true,
});
// Result: initialized=1, skipped=0
```

**Questionnaire JSON file format:**

```json
{
  "id": "employee-onboarding",
  "title": "Employee Onboarding",
  "description": "New employee onboarding form",
  "questions": [
    {
      "id": "fullName",
      "type": "text",
      "label": "Full Name",
      "required": true
    },
    {
      "id": "department",
      "type": "choice",
      "label": "Department",
      "required": true,
      "options": [
        { "value": "engineering", "label": "Engineering" },
        { "value": "sales", "label": "Sales" }
      ]
    }
  ]
}
```

## REST API

### Create Express Router

```typescript
import express from 'express';
import { createQuestionnaireRouter } from 'qbuilder';
import { pool } from './db';

const app = express();

const router = createQuestionnaireRouter({
  questionnaireRepository: createQuestionnaireRepository(pool),
  submissionRepository: createSubmissionRepository(pool),
});

app.use('/api', router);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('OpenAPI spec: http://localhost:3000/api/openapi.json');
});
```

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/questionnaires` | List all questionnaires |
| `POST` | `/questionnaires` | Create a new questionnaire |
| `GET` | `/questionnaires/:id` | Get latest version |
| `PUT` | `/questionnaires/:id` | Update (creates new version) |
| `GET` | `/questionnaires/:id/versions` | List all versions |
| `GET` | `/questionnaires/:id/versions/:version` | Get specific version |
| `POST` | `/questionnaires/:id/validate` | Validate answers |
| `POST` | `/questionnaires/:id/visible-questions` | Get visible questions |
| `POST` | `/questionnaires/:id/submissions` | Submit answers |
| `GET` | `/questionnaires/:id/submissions` | List submissions |
| `GET` | `/submissions/:submissionId` | Get a submission |
| `GET` | `/openapi.json` | Get OpenAPI 3.0 specification |

### OpenAPI/Swagger

The router automatically exposes an OpenAPI 3.0 specification at `/openapi.json`. You can use this with Swagger UI or any OpenAPI-compatible tool:

```typescript
import { openApiSpec } from 'qbuilder';

// Use the spec programmatically
console.log(openApiSpec.info.version);
```

## Branching Logic

### Condition Operators

QBuilder supports powerful conditional logic:

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match | `{ questionId: 'age', operator: 'equals', value: 18 }` |
| `notEquals` | Not equal | `{ questionId: 'country', operator: 'notEquals', value: 'US' }` |
| `in` | Value in array | `{ questionId: 'role', operator: 'in', value: ['admin', 'editor'] }` |
| `notIn` | Value not in array | `{ questionId: 'status', operator: 'notIn', value: ['banned'] }` |
| `gt` | Greater than | `{ questionId: 'age', operator: 'gt', value: 18 }` |
| `gte` | Greater than or equal | `{ questionId: 'score', operator: 'gte', value: 70 }` |
| `lt` | Less than | `{ questionId: 'price', operator: 'lt', value: 100 }` |
| `lte` | Less than or equal | `{ questionId: 'items', operator: 'lte', value: 10 }` |
| `isAnswered` | Question has any answer | `{ questionId: 'email', operator: 'isAnswered' }` |
| `notAnswered` | Question has no answer | `{ questionId: 'phone', operator: 'notAnswered' }` |

### Combining Conditions

Use `all` (AND) and `any` (OR) to combine conditions:

```typescript
{
  id: 'discount',
  type: 'text',
  label: 'Discount Code',
  visibleIf: {
    all: [
      // Must be a member
      { questionId: 'membership', operator: 'equals', value: 'premium' }
    ],
    any: [
      // AND (purchased more than 5 items OR total over $100)
      { questionId: 'itemCount', operator: 'gt', value: 5 },
      { questionId: 'totalAmount', operator: 'gte', value: 100 }
    ]
  }
}
```

## Sections

Group questions into sections:

```typescript
{
  id: 'onboarding',
  title: 'Employee Onboarding',
  sections: [
    {
      id: 'personal',
      title: 'Personal Information',
      description: 'Tell us about yourself',
      questionIds: ['fullName', 'email', 'phone']
    },
    {
      id: 'employment',
      title: 'Employment Details',
      questionIds: ['startDate', 'department', 'role']
    }
  ],
  questions: [/* ... */]
}
```

Get visible sections:

```typescript
import { getVisibleSections } from 'qbuilder';

const sections = getVisibleSections(questionnaire, answers);
// Returns sections with only visible questions
```

## Extensibility

### Custom Question Types

Add your own question types:

```typescript
import { registerAnswerBuilder } from 'qbuilder';
import { z } from 'zod';

// Register a custom 'rating' question type
registerAnswerBuilder('rating', (question: any) => {
  const schema = z.number().min(1).max(5);
  return question.required ? schema : schema.optional();
});

// Now you can use it in your questionnaires
const questionnaire = {
  questions: [
    {
      id: 'satisfaction',
      type: 'rating', // Custom type!
      label: 'How satisfied are you?',
      required: true,
    }
  ]
};
```

### Custom Validation

Build your own answer validation:

```typescript
import { buildAnswerSchema } from 'qbuilder';

// Create a custom schema with your registry
const schema = buildAnswerSchema(questionnaire, answers, myCustomRegistry);
```

## Error Handling

QBuilder provides structured error classes:

```typescript
import {
  QBuilderError,
  ValidationError,
  NotFoundError,
  ConflictError,
  CyclicDependencyError,
  ErrorCodes
} from 'qbuilder';

try {
  await questionnaireRepo.create(questionnaire);
} catch (error) {
  if (error instanceof ConflictError) {
    console.log('Questionnaire already exists');
  } else if (error instanceof ValidationError) {
    console.log('Invalid data:', error.details);
  }

  // Get structured error response
  const errorResponse = error.toJSON();
  // { error: { code: 'CONFLICT', message: '...', details: [...] } }
}
```

## TypeScript Support

QBuilder is written in TypeScript and provides full type safety:

```typescript
import type {
  // Questionnaire types
  QuestionnaireDefinition,
  QuestionDefinition,
  TextQuestion,
  ChoiceQuestion,
  Condition,
  VisibleIf,
  ValidationResult,

  // Database types
  QuestionnaireRepository,
  SubmissionRepository,
  QuestionnaireWithVersion,
  Submission,
  Metadata,
  RepositoryOptions,

  // Migration types
  MigrationResult,
  MigrationOptions,

  // Init types
  InitializeOptions,
  InitializeResult,
} from 'qbuilder';

// All types are exported and fully documented
const question: TextQuestion = {
  id: 'name',
  type: 'text',
  label: 'Your Name',
  required: true,
  maxLength: 100,
};

// Metadata is a simple object type
const metadata: Metadata = {
  category: 'onboarding',
  priority: 1,
  tags: ['new-hire', 'required'],
};
```

## API Reference

### Core Functions

#### `parseQuestionnaire(payload: unknown): QuestionnaireDefinition`

Validates and parses a questionnaire definition. Throws `ValidationError` or `CyclicDependencyError` if invalid.

#### `validateAnswers(questionnaire, answers, registry?): ValidationResult`

Validates answers against visible questions. Returns `{ success: true, data }` or `{ success: false, errors }`.

#### `getVisibleQuestions(questionnaire, answers): QuestionDefinition[]`

Returns array of questions that should be visible based on current answers.

#### `getVisibleSections(questionnaire, answers): SectionDefinition[]`

Returns sections with their visible questions.

### Database Functions

#### `runMigrations(pool: Pool, options?): Promise<MigrationResult>`

Runs database migrations. Idempotent - only runs migrations that haven't been applied.

**Options:**
```typescript
{
  tablePrefix?: string;  // default: 'qbuilder_'
}
```

**Returns:** `{ executed: string[], skipped: string[] }`

#### `createQuestionnaireRepository(pool: Pool, options?): QuestionnaireRepository`

Creates a repository for managing questionnaires.

**Options:**
```typescript
{
  tablePrefix?: string;  // default: 'qbuilder_'
}
```

**Methods:**
- `create(definition, options?)` - Create version 1 (options: `{ metadata?: object }`)
- `update(id, definition, options?)` - Create new version (options: `{ metadata?: object }`)
- `findById(id)` - Get latest version (includes metadata)
- `findByIdAndVersion(id, version)` - Get specific version
- `listVersions(id)` - Get version metadata
- `list()` - List all questionnaires

#### `createSubmissionRepository(pool: Pool, options?): SubmissionRepository`

Creates a repository for managing submissions.

**Options:**
```typescript
{
  tablePrefix?: string;  // default: 'qbuilder_'
}
```

**Methods:**
- `create(questionnaireId, version, answers, options?)` - Store submission (options: `{ metadata?: object }`)
- `findById(submissionId)` - Get submission (includes metadata)
- `listByQuestionnaire(id, options)` - List with pagination

### API Functions

#### `createQuestionnaireRouter(options): Router`

Creates an Express router with all endpoints.

**Options:**
```typescript
{
  questionnaireRepository: QuestionnaireRepository;
  submissionRepository: SubmissionRepository;
  enableJsonParser?: boolean; // default: true
}
```

## Examples

See the [examples](./examples) directory for complete working examples:

- Basic questionnaire with branching
- Multi-step form with sections
- Custom question types
- REST API integration
- React integration example

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © Ali Reza Yahya

## Links

- [GitHub Repository](https://github.com/alileza/qbuilder)
- [NPM Package](https://www.npmjs.com/package/qbuilder)
- [Issues](https://github.com/alileza/qbuilder/issues)
- [Changelog](CHANGELOG.md)
