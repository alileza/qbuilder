/**
 * Questionnaire initialization module
 *
 * Provides utilities for loading and registering questionnaires from files
 * during application startup, with optional automatic database migrations.
 *
 * @module init
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import type { Pool } from 'pg';
import { parseQuestionnaire } from '../engine/index.js';
import type { QuestionnaireRepository, QuestionnaireWithVersion } from '../db/questionnaire-repository.js';
import type { QuestionnaireDefinition } from '../schemas/questionnaire.js';
import { runMigrations, DEFAULT_TABLE_PREFIX, type MigrationResult } from '../db/migrations.js';

/**
 * Options for initializing questionnaires
 */
export interface InitializeOptions {
  /**
   * PostgreSQL connection pool
   * Required if runMigrations is true
   */
  pool?: Pool;

  /**
   * Table name prefix (default: 'qbuilder_')
   * Tables will be named: {prefix}questionnaires, {prefix}submissions, etc.
   */
  tablePrefix?: string;

  /**
   * If true, run database migrations before initializing questionnaires
   * Requires pool to be provided
   * Default: false
   */
  runMigrations?: boolean;

  /**
   * Array of file paths to load questionnaires from
   * Supports .json files
   */
  files?: string[];

  /**
   * Directory path to load all questionnaires from
   * Will recursively load all .json files
   */
  directory?: string;

  /**
   * Array of questionnaire definitions to initialize
   */
  definitions?: unknown[];

  /**
   * If true, continue initialization even if some questionnaires fail
   * Default: false (fail fast)
   */
  continueOnError?: boolean;

  /**
   * If true, update existing questionnaires with the same ID
   * If false, skip questionnaires that already exist
   * Default: false (skip existing)
   */
  updateExisting?: boolean;
}

/**
 * Result of questionnaire initialization
 */
export interface InitializeResult {
  /**
   * Migration results (if runMigrations was true)
   */
  migrations?: MigrationResult;

  /**
   * Number of questionnaires successfully initialized
   */
  initialized: number;

  /**
   * Number of questionnaires skipped (already exist)
   */
  skipped: number;

  /**
   * Array of errors that occurred during initialization
   */
  errors: Array<{
    source: string;
    error: Error;
  }>;
}

/**
 * Load a questionnaire definition from a JSON file
 *
 * @param filePath - Path to the JSON file
 * @returns Parsed questionnaire definition
 * @throws Error if file cannot be read or parsed
 */
export async function loadQuestionnaireFromFile(filePath: string): Promise<QuestionnaireDefinition> {
  const content = await readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  return parseQuestionnaire(data);
}

/**
 * Load all questionnaire definitions from a directory
 *
 * Recursively searches for .json files in the directory and loads them.
 *
 * @param dirPath - Path to the directory
 * @returns Array of parsed questionnaire definitions
 * @throws Error if directory cannot be read
 */
export async function loadQuestionnairesFromDirectory(dirPath: string): Promise<QuestionnaireDefinition[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const definitions: QuestionnaireDefinition[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Recursively load from subdirectories
      const subDefinitions = await loadQuestionnairesFromDirectory(fullPath);
      definitions.push(...subDefinitions);
    } else if (entry.isFile() && extname(entry.name) === '.json') {
      try {
        const definition = await loadQuestionnaireFromFile(fullPath);
        definitions.push(definition);
      } catch (error) {
        // Re-throw with more context
        throw new Error(`Failed to load questionnaire from ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return definitions;
}

/**
 * Compare two questionnaire definitions for equality
 *
 * Compares all fields except version and createdAt metadata.
 *
 * @param existing - Existing questionnaire with version metadata
 * @param newDef - New questionnaire definition
 * @returns true if definitions are identical
 */
function areDefinitionsEqual(
  existing: QuestionnaireWithVersion,
  newDef: QuestionnaireDefinition
): boolean {
  // Compare basic fields
  if (existing.id !== newDef.id) return false;
  if (existing.title !== newDef.title) return false;
  if (existing.description !== newDef.description) return false;

  // Deep comparison of questions and sections
  const existingStr = JSON.stringify({
    id: existing.id,
    title: existing.title,
    description: existing.description,
    questions: existing.questions,
    sections: existing.sections,
  });

  const newStr = JSON.stringify({
    id: newDef.id,
    title: newDef.title,
    description: newDef.description,
    questions: newDef.questions,
    sections: newDef.sections,
  });

  return existingStr === newStr;
}

/**
 * Initialize questionnaires from various sources
 *
 * Loads questionnaires from files, directories, or inline definitions and
 * registers them in the database.
 *
 * @param repository - QuestionnaireRepository instance
 * @param options - Initialization options
 * @returns Result summary with counts and errors
 *
 * @example
 * ```typescript
 * import { initializeQuestionnaires } from 'qbuilder';
 *
 * // Load from files
 * const result = await initializeQuestionnaires(repo, {
 *   files: ['./questionnaires/onboarding.json', './questionnaires/survey.json']
 * });
 *
 * // Load from directory
 * const result = await initializeQuestionnaires(repo, {
 *   directory: './questionnaires'
 * });
 *
 * // Load from inline definitions
 * const result = await initializeQuestionnaires(repo, {
 *   definitions: [
 *     { id: 'onboarding', title: 'Onboarding', questions: [...] }
 *   ]
 * });
 *
 * // Combined: run migrations and load questionnaires
 * const result = await initializeQuestionnaires(repo, {
 *   pool: pool,
 *   runMigrations: true,
 *   directory: './questionnaires'
 * });
 *
 * console.log(`Initialized: ${result.initialized}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);
 * ```
 */
export async function initializeQuestionnaires(
  repository: QuestionnaireRepository,
  options: InitializeOptions
): Promise<InitializeResult> {
  const result: InitializeResult = {
    initialized: 0,
    skipped: 0,
    errors: [],
  };

  // Run migrations if requested
  if (options.runMigrations) {
    if (!options.pool) {
      throw new Error('pool is required when runMigrations is true');
    }
    result.migrations = await runMigrations(options.pool, {
      tablePrefix: options.tablePrefix,
    });
  }

  const definitions: QuestionnaireDefinition[] = [];

  // Load from files
  if (options.files) {
    for (const filePath of options.files) {
      try {
        const definition = await loadQuestionnaireFromFile(filePath);
        definitions.push(definition);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        result.errors.push({ source: filePath, error: err });
        if (!options.continueOnError) {
          return result;
        }
      }
    }
  }

  // Load from directory
  if (options.directory) {
    try {
      const dirDefinitions = await loadQuestionnairesFromDirectory(options.directory);
      definitions.push(...dirDefinitions);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      result.errors.push({ source: options.directory, error: err });
      if (!options.continueOnError) {
        return result;
      }
    }
  }

  // Load from inline definitions
  if (options.definitions) {
    for (let i = 0; i < options.definitions.length; i++) {
      try {
        const definition = parseQuestionnaire(options.definitions[i]);
        definitions.push(definition);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        result.errors.push({ source: `definition[${i}]`, error: err });
        if (!options.continueOnError) {
          return result;
        }
      }
    }
  }

  // Register all loaded definitions
  for (const definition of definitions) {
    try {
      // Check if questionnaire already exists
      const existing = await repository.findById(definition.id).catch(() => null);

      if (existing) {
        if (!options.updateExisting) {
          // Skip if updateExisting is false
          result.skipped++;
          continue;
        }

        // Check if definition is identical to existing
        const isIdentical = areDefinitionsEqual(existing, definition);
        if (isIdentical) {
          // Skip if content hasn't changed
          result.skipped++;
          continue;
        }

        // Update existing questionnaire (creates new version)
        await repository.update(definition.id, definition);
      } else {
        // Create new questionnaire (version 1)
        await repository.create(definition);
      }
      result.initialized++;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      result.errors.push({ source: definition.id, error: err });
      if (!options.continueOnError) {
        return result;
      }
    }
  }

  return result;
}
