/**
 * QBuilder - Modular questionnaire engine with branching logic, validation, and versioning
 *
 * @packageDocumentation
 * @module qbuilder
 *
 * @example
 * ```typescript
 * import { parseQuestionnaire, validateAnswers, getVisibleQuestions } from 'qbuilder';
 *
 * // Parse and validate a questionnaire definition
 * const questionnaire = parseQuestionnaire({
 *   id: 'onboarding',
 *   title: 'Employee Onboarding',
 *   questions: [
 *     { id: 'name', type: 'text', label: 'Full Name', required: true }
 *   ]
 * });
 *
 * // Validate answers
 * const result = validateAnswers(questionnaire, { name: 'John Doe' });
 *
 * // Get visible questions based on conditions
 * const visible = getVisibleQuestions(questionnaire, { name: 'John' });
 * ```
 */

// Export all schemas and types
export * from './schemas/index.js';

// Engine exports - Core functionality for questionnaire processing
export * from './engine/index.js';

// Registry exports - Extensible answer validation
export * from './registry/index.js';

// Error exports - Structured error handling
export * from './errors/index.js';

// Database exports - PostgreSQL persistence layer
export * from './db/index.js';

// API exports - REST API with Express and OpenAPI
export * from './api/index.js';
