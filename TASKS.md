# Tasks: qbuilder NPM Package

This document outlines the implementation tasks to build `qbuilder` as an importable npm package.

## Package Overview

```ts
// Example usage in consuming app
import {
  parseQuestionnaire,
  validateAnswers,
  getVisibleQuestions,
  getVisibleSections,
  createQuestionnaireRepository,
  createSubmissionRepository,
  createQuestionnaireRouter,
} from 'qbuilder';
```

---

## Phase 1: Project Setup

### Task 1.1: Initialize npm package
- [x] Run `npm init` with package name `qbuilder`
- [x] Configure `package.json`:
  ```json
  {
    "name": "qbuilder",
    "version": "0.1.0",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "files": ["dist"],
    "exports": {
      ".": {
        "import": "./dist/index.mjs",
        "require": "./dist/index.js",
        "types": "./dist/index.d.ts"
      }
    }
  }
  ```

### Task 1.2: Configure TypeScript
- [x] Install TypeScript: `npm install -D typescript`
- [x] Create `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "lib": ["ES2022"],
      "outDir": "dist",
      "rootDir": "src",
      "strict": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true,
      "esModuleInterop": true,
      "skipLibCheck": true
    },
    "include": ["src"],
    "exclude": ["node_modules", "dist", "**/*.test.ts"]
  }
  ```

### Task 1.3: Install core dependencies
- [x] `npm install zod` - Runtime validation
- [x] `npm install pg` - PostgreSQL client
- [x] `npm install -D @types/pg`

### Task 1.4: Install dev dependencies
- [x] `npm install -D vitest` - Testing
- [x] `npm install -D tsup` - Build/bundling
- [x] `npm install -D @types/node`

### Task 1.5: Configure build tooling
- [x] Create `tsup.config.ts`:
  ```ts
  import { defineConfig } from 'tsup';
  export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
  });
  ```
- [x] Add scripts to `package.json`:
  ```json
  {
    "scripts": {
      "build": "tsup",
      "test": "vitest",
      "test:run": "vitest run",
      "lint": "tsc --noEmit",
      "prepublishOnly": "npm run build"
    }
  }
  ```

### Task 1.6: Create directory structure
- [x] Created directory structure and placeholder files
```
src/
├── index.ts              # Public exports
├── schemas/
│   ├── index.ts
│   ├── questionnaire.ts
│   ├── question.ts
│   ├── section.ts
│   ├── condition.ts
│   └── answer.ts
├── engine/
│   ├── index.ts
│   ├── visibility.ts
│   ├── validation.ts
│   └── cyclic-detection.ts
├── registry/
│   ├── index.ts
│   └── answer-builders.ts
├── db/
│   ├── index.ts
│   ├── questionnaire-repository.ts
│   ├── submission-repository.ts
│   └── migrations/
│       ├── 001_create_questionnaires.sql
│       └── 002_create_submissions.sql
├── api/
│   ├── index.ts
│   ├── router.ts
│   ├── handlers/
│   │   ├── questionnaire.ts
│   │   └── submission.ts
│   └── middleware/
│       └── error-handler.ts
├── errors/
│   ├── index.ts
│   └── codes.ts
└── types/
    └── index.ts
```

---

## Phase 2: Zod Schemas

### Task 2.1: Implement Condition schema
File: `src/schemas/condition.ts`
- [x] Define `ConditionOperator` enum/union:
  - `equals`, `notEquals`, `in`, `notIn`
  - `gt`, `gte`, `lt`, `lte`
  - `isAnswered`, `notAnswered`
- [x] Define `Condition` schema:
  ```ts
  {
    questionId: string,
    operator: ConditionOperator,
    value?: unknown  // not required for isAnswered/notAnswered
  }
  ```
- [x] Define `VisibleIf` schema:
  ```ts
  {
    all?: Condition[],
    any?: Condition[]
  }
  ```

### Task 2.2: Implement Question schemas
File: `src/schemas/question.ts`
- [x] Define `BaseQuestion` schema (shared fields):
  - `id`, `label`, `required?`, `helpText?`, `visibleIf?`
- [x] Define `TextQuestion` schema:
  - `type: 'text'`, `multiline?`, `maxLength?`
- [x] Define `ChoiceOption` schema: `{ value: string, label: string }`
- [x] Define `ChoiceQuestion` schema:
  - `type: 'choice'`, `multiple?`, `options: ChoiceOption[]`
- [x] Create discriminated union `QuestionDefinition`:
  ```ts
  z.discriminatedUnion('type', [TextQuestionSchema, ChoiceQuestionSchema])
  ```

### Task 2.3: Implement Section schema
File: `src/schemas/section.ts`
- [x] Define `SectionDefinition` schema:
  ```ts
  {
    id: string,
    title: string,
    description?: string,
    questionIds: string[]
  }
  ```

### Task 2.4: Implement Questionnaire schema
File: `src/schemas/questionnaire.ts`
- [x] Define `QuestionnaireDefinition` schema:
  ```ts
  {
    id: string,
    title: string,
    description?: string,
    sections?: SectionDefinition[],
    questions: QuestionDefinition[]
  }
  ```
- [x] Add refinement: validate that `questionIds` in sections reference existing questions
- [x] Add refinement: validate unique question IDs
- [x] Add refinement: validate unique section IDs

### Task 2.5: Implement Answer schemas
File: `src/schemas/answer.ts`
- [x] Define `AnswerPayload` schema: `Record<string, unknown>`
- [x] Define `SubmissionInput` schema:
  ```ts
  {
    version?: number,
    answers: Record<string, unknown>
  }
  ```

### Task 2.6: Export all schemas
File: `src/schemas/index.ts`
- [x] Re-export all schemas and inferred types

---

## Phase 3: Engine - Branching & Visibility

### Task 3.1: Implement cyclic dependency detection
File: `src/engine/cyclic-detection.ts`
- [x] Implement `buildDependencyGraph(questions)`:
  - Returns `Map<questionId, Set<dependsOnIds>>`
- [x] Implement `detectCycles(graph)`:
  - Use DFS with visited/recursion stack
  - Returns `{ hasCycle: boolean, path?: string[] }`
- [x] Implement `validateNoCyclicDependencies(questionnaire)`:
  - Throws `CyclicDependencyError` if cycle found

### Task 3.2: Implement condition evaluation
File: `src/engine/visibility.ts`
- [x] Implement `evaluateCondition(condition, answers)`:
  - Handle each operator type
  - Return `boolean`
- [x] Handle edge cases:
  - Missing answer for referenced question
  - Type coercion for comparisons

### Task 3.3: Implement visibility logic
File: `src/engine/visibility.ts`
- [x] Implement `isQuestionVisible(question, answers)`:
  - If no `visibleIf`, return `true`
  - Evaluate `all` conditions (AND)
  - Evaluate `any` conditions (OR)
  - Apply logic: `(all.every() || all.empty) && (any.some() || any.empty)`
- [x] Implement `getVisibleQuestions(questionnaire, answers)`:
  - Filter questions by visibility
  - Return ordered array
- [x] Implement `getVisibleSections(questionnaire, answers)`:
  - Return sections with at least one visible question
  - Include filtered `questionIds` for each section

### Task 3.4: Export engine functions
File: `src/engine/index.ts`
- [x] Re-export all engine functions

---

## Phase 4: Answer Schema Registry

### Task 4.1: Define registry types
File: `src/registry/index.ts`
- [x] Define `AnswerSchemaBuilder` type:
  ```ts
  type AnswerSchemaBuilder<T extends QuestionDefinition> = (question: T) => ZodTypeAny;
  ```
- [x] Define `AnswerSchemaRegistry` type

### Task 4.2: Implement answer builders
File: `src/registry/answer-builders.ts`
- [x] Implement `buildTextAnswerSchema(question)`:
  - Required: `z.string().min(1)`
  - Optional: `z.string().optional()`
  - Apply `maxLength` if defined
- [x] Implement `buildChoiceAnswerSchema(question)`:
  - Single: `z.enum([...optionValues])`
  - Multiple: `z.array(z.enum([...optionValues]))`
  - Handle required/optional

### Task 4.3: Create registry instance
File: `src/registry/index.ts`
- [x] Create default registry:
  ```ts
  const answerSchemaRegistry = {
    text: buildTextAnswerSchema,
    choice: buildChoiceAnswerSchema,
  };
  ```
- [x] Export `registerAnswerBuilder(type, builder)` for extensibility

---

## Phase 5: Dynamic Answer Validation

### Task 5.1: Implement schema builder
File: `src/engine/validation.ts`
- [x] Implement `buildAnswerSchema(questionnaire, answers, registry)`:
  - Get visible questions
  - For each visible question, get schema from registry
  - Combine into `z.object({ [questionId]: schema })`
  - Return combined schema

### Task 5.2: Implement validation function
File: `src/engine/validation.ts`
- [x] Implement `validateAnswers(questionnaire, answers, registry?)`:
  - Build dynamic schema
  - Parse answers
  - Return `{ success: true, data }` or `{ success: false, errors }`
- [x] Format errors to match API error structure

### Task 5.3: Implement parse function
File: `src/engine/validation.ts`
- [x] Implement `parseQuestionnaire(payload)`:
  - Validate against `QuestionnaireDefinition` schema
  - Run cyclic dependency check
  - Return typed questionnaire or throw

---

## Phase 6: Error Handling

### Task 6.1: Define error codes
File: `src/errors/codes.ts`
- [x] Define error code constants:
  ```ts
  export const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    CYCLIC_DEPENDENCY: 'CYCLIC_DEPENDENCY',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  } as const;
  ```

### Task 6.2: Define error classes
File: `src/errors/index.ts`
- [x] Implement `QBuilderError` base class
- [x] Implement `ValidationError` class
- [x] Implement `NotFoundError` class
- [x] Implement `CyclicDependencyError` class
- [x] Implement `ConflictError` class
- [x] Add `toJSON()` method matching API error format

---

## Phase 7: Database Layer

### Task 7.1: Create migration files
File: `src/db/migrations/001_create_questionnaires.sql`
- [x] Copy migration from PRD Section 5.2

File: `src/db/migrations/002_create_submissions.sql`
- [x] Copy migration from PRD Section 5.2

### Task 7.2: Implement questionnaire repository
File: `src/db/questionnaire-repository.ts`
- [x] Define `QuestionnaireRepository` interface
- [x] Implement `createQuestionnaireRepository(pool)`:
  - `create(definition)` - Insert with version 1
  - `update(id, definition)` - Insert new version
  - `findById(id)` - Get latest version
  - `findByIdAndVersion(id, version)` - Get specific version
  - `listVersions(id)` - Get all versions metadata
  - `list()` - Get all questionnaires (latest versions)

### Task 7.3: Implement submission repository
File: `src/db/submission-repository.ts`
- [x] Define `SubmissionRepository` interface
- [x] Implement `createSubmissionRepository(pool)`:
  - `create(questionnaireId, version, answers)` - Insert submission
  - `findById(submissionId)` - Get submission
  - `listByQuestionnaire(questionnaireId, options)` - Paginated list

### Task 7.4: Export database layer
File: `src/db/index.ts`
- [x] Re-export repositories
- [x] Export migration file paths for consumers

---

## Phase 8: REST API Layer

### Task 8.1: Implement questionnaire handlers
File: `src/api/handlers/questionnaire.ts`
- [ ] Implement handler functions (framework-agnostic):
  - `handleCreateQuestionnaire(repo, body)`
  - `handleGetQuestionnaire(repo, id)`
  - `handleGetQuestionnaireVersion(repo, id, version)`
  - `handleUpdateQuestionnaire(repo, id, body)`
  - `handleListQuestionnaires(repo)`
  - `handleListVersions(repo, id)`
  - `handleValidateAnswers(repo, id, body)`
  - `handleGetVisibleQuestions(repo, id, body)`

### Task 8.2: Implement submission handlers
File: `src/api/handlers/submission.ts`
- [ ] Implement handler functions:
  - `handleSubmitAnswers(questionnaireRepo, submissionRepo, id, body)`
  - `handleGetSubmission(repo, submissionId)`
  - `handleListSubmissions(repo, questionnaireId, query)`

### Task 8.3: Implement error handling middleware
File: `src/api/middleware/error-handler.ts`
- [ ] Implement `createErrorHandler()`:
  - Catch `QBuilderError` instances
  - Format to API error structure
  - Handle unknown errors as `INTERNAL_ERROR`

### Task 8.4: Create Express router factory
File: `src/api/router.ts`
- [ ] Implement `createQuestionnaireRouter(options)`:
  ```ts
  interface RouterOptions {
    questionnaireRepository: QuestionnaireRepository;
    submissionRepository: SubmissionRepository;
  }
  ```
  - Returns Express Router with all endpoints
  - Apply error handler middleware

### Task 8.5: Export API layer
File: `src/api/index.ts`
- [ ] Re-export router factory
- [ ] Re-export handlers for custom integrations
- [ ] Re-export error handler

---

## Phase 9: Public Exports

### Task 9.1: Define public API
File: `src/index.ts`
- [ ] Export schemas and types:
  ```ts
  export type {
    QuestionnaireDefinition,
    QuestionDefinition,
    SectionDefinition,
    Condition,
    VisibleIf,
    TextQuestion,
    ChoiceQuestion,
  } from './schemas';
  ```
- [ ] Export core functions:
  ```ts
  export {
    parseQuestionnaire,
    validateAnswers,
    getVisibleQuestions,
    getVisibleSections,
  } from './engine';
  ```
- [ ] Export registry:
  ```ts
  export {
    answerSchemaRegistry,
    registerAnswerBuilder,
  } from './registry';
  ```
- [ ] Export database layer:
  ```ts
  export {
    createQuestionnaireRepository,
    createSubmissionRepository,
  } from './db';
  ```
- [ ] Export API layer:
  ```ts
  export { createQuestionnaireRouter } from './api';
  ```
- [ ] Export errors:
  ```ts
  export {
    QBuilderError,
    ValidationError,
    NotFoundError,
    CyclicDependencyError,
    ErrorCodes,
  } from './errors';
  ```

---

## Phase 10: Testing

### Task 10.1: Schema tests
File: `src/schemas/__tests__/questionnaire.test.ts`
- [ ] Test valid questionnaire parsing
- [ ] Test invalid questionnaire rejection
- [ ] Test duplicate ID detection
- [ ] Test section-question reference validation

### Task 10.2: Visibility tests
File: `src/engine/__tests__/visibility.test.ts`
- [ ] Test each condition operator
- [ ] Test `all` conditions (AND logic)
- [ ] Test `any` conditions (OR logic)
- [ ] Test combined `all` + `any`
- [ ] Test missing answer handling

### Task 10.3: Cyclic dependency tests
File: `src/engine/__tests__/cyclic-detection.test.ts`
- [ ] Test direct cycle (A → B → A)
- [ ] Test transitive cycle (A → B → C → A)
- [ ] Test no cycle detection
- [ ] Test complex graph without cycles

### Task 10.4: Validation tests
File: `src/engine/__tests__/validation.test.ts`
- [ ] Test required field validation
- [ ] Test type-specific validation
- [ ] Test choice option membership
- [ ] Test invisible question answers ignored
- [ ] Test dynamic schema based on visibility

### Task 10.5: Registry tests
File: `src/registry/__tests__/registry.test.ts`
- [ ] Test text answer builder
- [ ] Test choice answer builder (single/multiple)
- [ ] Test custom type registration

### Task 10.6: Repository tests (integration)
File: `src/db/__tests__/repositories.test.ts`
- [ ] Test questionnaire CRUD with versioning
- [ ] Test submission CRUD
- [ ] Test pagination
- [ ] Requires test database setup

### Task 10.7: API tests (integration)
File: `src/api/__tests__/router.test.ts`
- [ ] Test all endpoints
- [ ] Test error responses
- [ ] Test validation errors
- [ ] Requires test database setup

---

## Phase 11: Documentation & Publishing

### Task 11.1: Create README
- [ ] Package description
- [ ] Installation instructions
- [ ] Quick start example
- [ ] API documentation
- [ ] Configuration options
- [ ] Extensibility guide (adding question types)

### Task 11.2: Add JSDoc comments
- [ ] Document all public exports
- [ ] Add usage examples in JSDoc

### Task 11.3: Configure npm publishing
- [ ] Add `.npmignore` or configure `files` in package.json
- [ ] Add `LICENSE` file
- [ ] Add `CHANGELOG.md`
- [ ] Test with `npm pack`

### Task 11.4: Set up CI (optional)
- [ ] GitHub Actions for tests
- [ ] Automated npm publish on release

---

## Dependency Summary

```
dependencies:
  zod: ^3.x
  pg: ^8.x

peerDependencies:
  express: ^4.x || ^5.x  (optional, for router)

devDependencies:
  typescript: ^5.x
  tsup: ^8.x
  vitest: ^1.x
  @types/node: ^20.x
  @types/pg: ^8.x
  @types/express: ^4.x
```

---

## Implementation Order

Recommended sequence:
1. Phase 1 (Setup) - Foundation
2. Phase 2 (Schemas) - Core types
3. Phase 6 (Errors) - Needed by other phases
4. Phase 3 (Visibility) - Core logic
5. Phase 4 (Registry) - Answer builders
6. Phase 5 (Validation) - Ties it together
7. Phase 10.1-10.5 (Unit tests) - Verify core logic
8. Phase 7 (Database) - Persistence
9. Phase 8 (API) - HTTP layer
10. Phase 9 (Exports) - Public API
11. Phase 10.6-10.7 (Integration tests)
12. Phase 11 (Docs & Publish)
