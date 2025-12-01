import { z } from 'zod';

/**
 * Condition operators for branching logic
 */
export const ConditionOperatorSchema = z.enum([
  'equals',
  'notEquals',
  'in',
  'notIn',
  'gt',
  'gte',
  'lt',
  'lte',
  'isAnswered',
  'notAnswered',
]);

export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>;

/**
 * Base condition structure
 */
const BaseConditionSchema = z.object({
  questionId: z.string().min(1),
  operator: ConditionOperatorSchema,
});

/**
 * Conditions with value (equals, notEquals, in, notIn, gt, gte, lt, lte)
 */
const ValueConditionSchema = BaseConditionSchema.extend({
  operator: z.enum(['equals', 'notEquals', 'in', 'notIn', 'gt', 'gte', 'lt', 'lte']),
  value: z.unknown(),
});

/**
 * Conditions without value (isAnswered, notAnswered)
 */
const NoValueConditionSchema = BaseConditionSchema.extend({
  operator: z.enum(['isAnswered', 'notAnswered']),
  value: z.unknown().optional(),
});

/**
 * Condition schema - discriminated by whether value is required
 */
export const ConditionSchema = z.union([
  ValueConditionSchema,
  NoValueConditionSchema,
]);

export type Condition = z.infer<typeof ConditionSchema>;

/**
 * Visibility rules for conditional question display
 */
export const VisibleIfSchema = z
  .object({
    all: z.array(ConditionSchema).optional(),
    any: z.array(ConditionSchema).optional(),
  })
  .strict();

export type VisibleIf = z.infer<typeof VisibleIfSchema>;
