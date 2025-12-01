import { z } from 'zod';
import { VisibleIfSchema } from './condition.js';

/**
 * Base question fields shared by all question types
 */
const BaseQuestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().optional().default(false),
  helpText: z.string().optional(),
  visibleIf: VisibleIfSchema.optional(),
});

/**
 * Text question configuration
 */
export const TextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('text'),
  multiline: z.boolean().optional().default(false),
  maxLength: z.number().int().positive().optional(),
});

export type TextQuestion = z.infer<typeof TextQuestionSchema>;

/**
 * Choice option for single/multiple choice questions
 */
export const ChoiceOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

export type ChoiceOption = z.infer<typeof ChoiceOptionSchema>;

/**
 * Choice question configuration (single or multiple selection)
 */
export const ChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('choice'),
  multiple: z.boolean().optional().default(false),
  options: z.array(ChoiceOptionSchema).min(1),
}).refine(
  (data) => {
    // Ensure option values are unique
    const values = data.options.map((opt) => opt.value);
    return values.length === new Set(values).size;
  },
  {
    message: 'Option values must be unique',
  }
);

export type ChoiceQuestion = z.infer<typeof ChoiceQuestionSchema>;

/**
 * Discriminated union of all question types
 */
export const QuestionDefinitionSchema = z.discriminatedUnion('type', [
  TextQuestionSchema,
  ChoiceQuestionSchema,
]);

export type QuestionDefinition = z.infer<typeof QuestionDefinitionSchema>;
