import { z } from 'zod';
import type {
  QuestionnaireDefinition,
  QuestionDefinition,
  AnswerPayload,
} from '../schemas/index.js';
import { QuestionnaireDefinitionSchema } from '../schemas/index.js';
import { getVisibleQuestions } from './visibility.js';
import { validateNoCyclicDependencies } from './cyclic-detection.js';
import {
  answerSchemaRegistry,
  getAnswerSchemaBuilder,
  type AnswerSchemaRegistry,
} from '../registry/index.js';

/**
 * Validation result for successful validation
 */
export interface ValidationSuccess {
  success: true;
  data: AnswerPayload;
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  code: string;
  message: string;
}

/**
 * Validation result for failed validation
 */
export interface ValidationError {
  success: false;
  errors: ValidationErrorDetail[];
}

/**
 * Validation result type
 */
export type ValidationResult = ValidationSuccess | ValidationError;

/**
 * Build a dynamic answer validation schema based on visible questions
 */
export function buildAnswerSchema(
  questionnaire: QuestionnaireDefinition,
  answers: AnswerPayload,
  registry: AnswerSchemaRegistry = answerSchemaRegistry
): z.ZodObject<any> {
  // Get visible questions based on current answers
  const visibleQuestions = getVisibleQuestions(questionnaire, answers);

  // Build schema shape for visible questions
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  for (const question of visibleQuestions) {
    const builder = getAnswerSchemaBuilder(question.type);

    if (!builder) {
      throw new Error(
        `No answer schema builder found for question type: ${question.type}`
      );
    }

    schemaShape[question.id] = builder(question);
  }

  // Return object schema with all visible question schemas
  return z.object(schemaShape).passthrough();
}

/**
 * Validate answers against a questionnaire
 */
export function validateAnswers(
  questionnaire: QuestionnaireDefinition,
  answers: AnswerPayload,
  registry?: AnswerSchemaRegistry
): ValidationResult {
  try {
    // Build dynamic schema based on visible questions
    const schema = buildAnswerSchema(questionnaire, answers, registry);

    // Validate answers
    const result = schema.safeParse(answers);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    // Format Zod errors to validation error details
    const errors: ValidationErrorDetail[] = result.error.issues.map((issue) => ({
      field: issue.path.length > 0 ? `answers.${issue.path.join('.')}` : 'answers',
      code: issue.code.toUpperCase(),
      message: issue.message,
    }));

    return {
      success: false,
      errors,
    };
  } catch (error) {
    // Handle unexpected errors
    return {
      success: false,
      errors: [
        {
          field: 'answers',
          code: 'VALIDATION_ERROR',
          message:
            error instanceof Error ? error.message : 'Unknown validation error',
        },
      ],
    };
  }
}

/**
 * Parse and validate a questionnaire definition
 * Includes cyclic dependency check
 */
export function parseQuestionnaire(payload: unknown): QuestionnaireDefinition {
  // Validate against questionnaire schema
  const result = QuestionnaireDefinitionSchema.safeParse(payload);

  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new Error(
      `Invalid questionnaire definition: ${firstError.message} at ${firstError.path.join('.')}`
    );
  }

  const questionnaire = result.data;

  // Check for cyclic dependencies
  validateNoCyclicDependencies(questionnaire);

  return questionnaire;
}
