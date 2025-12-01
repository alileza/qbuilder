import { z } from 'zod';
import type { QuestionDefinition } from '../schemas/index.js';
import { buildTextAnswerSchema, buildChoiceAnswerSchema } from './answer-builders.js';

/**
 * Function type for building answer validation schemas
 */
export type AnswerSchemaBuilder<T extends QuestionDefinition = QuestionDefinition> = (
  question: T
) => z.ZodTypeAny;

/**
 * Registry mapping question types to their answer schema builders
 */
export type AnswerSchemaRegistry = Record<string, AnswerSchemaBuilder>;

/**
 * Default answer schema registry
 */
export const answerSchemaRegistry: AnswerSchemaRegistry = {
  text: buildTextAnswerSchema as AnswerSchemaBuilder,
  choice: buildChoiceAnswerSchema as AnswerSchemaBuilder,
};

/**
 * Custom registry for extensibility
 * Users can register additional question types here
 */
const customRegistry: Map<string, AnswerSchemaBuilder> = new Map();

/**
 * Register a custom answer schema builder for a question type
 * Allows extending the system with new question types
 */
export function registerAnswerBuilder(
  questionType: string,
  builder: AnswerSchemaBuilder
): void {
  customRegistry.set(questionType, builder);
}

/**
 * Get answer schema builder for a question type
 * Checks custom registry first, then falls back to default registry
 */
export function getAnswerSchemaBuilder(
  questionType: string
): AnswerSchemaBuilder | undefined {
  // Check custom registry first
  if (customRegistry.has(questionType)) {
    return customRegistry.get(questionType);
  }

  // Fall back to default registry
  return answerSchemaRegistry[questionType as keyof AnswerSchemaRegistry];
}

// Re-export builder functions for direct use
export { buildTextAnswerSchema, buildChoiceAnswerSchema };
