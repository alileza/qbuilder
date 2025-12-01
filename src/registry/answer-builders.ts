import { z } from 'zod';
import type { TextQuestion, ChoiceQuestion } from '../schemas/index.js';

/**
 * Build answer validation schema for text questions
 */
export function buildTextAnswerSchema(question: TextQuestion): z.ZodTypeAny {
  let schema: z.ZodString = z.string();

  // Apply maxLength constraint if defined
  if (question.maxLength !== undefined) {
    schema = schema.max(question.maxLength);
  }

  // Handle required vs optional
  if (question.required) {
    // Required: must be non-empty string
    schema = schema.min(1, 'This field is required');
    return schema;
  } else {
    // Optional: can be empty string, undefined, or null
    return z.union([
      schema,
      z.literal(''),
      z.undefined(),
      z.null(),
    ]).optional();
  }
}

/**
 * Build answer validation schema for choice questions
 */
export function buildChoiceAnswerSchema(question: ChoiceQuestion): z.ZodTypeAny {
  // Extract option values
  const optionValues = question.options.map((opt) => opt.value);

  if (optionValues.length === 0) {
    throw new Error(`Choice question ${question.id} has no options`);
  }

  // Create base enum schema
  const enumSchema = z.enum(optionValues as [string, ...string[]]);

  if (question.multiple) {
    // Multiple selection: array of enum values
    const arraySchema = z.array(enumSchema);

    if (question.required) {
      // At least one selection required
      return arraySchema.min(1, 'At least one option must be selected');
    } else {
      // Optional: empty array or undefined
      return z.union([
        arraySchema,
        z.undefined(),
        z.null(),
      ]).optional();
    }
  } else {
    // Single selection: enum value
    if (question.required) {
      return enumSchema;
    } else {
      // Optional: enum value, empty string, undefined, or null
      return z.union([
        enumSchema,
        z.literal(''),
        z.undefined(),
        z.null(),
      ]).optional();
    }
  }
}
