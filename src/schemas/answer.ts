import { z } from 'zod';

/**
 * Answer payload - map of question IDs to answer values
 */
export const AnswerPayloadSchema = z.record(z.string(), z.unknown());

export type AnswerPayload = z.infer<typeof AnswerPayloadSchema>;

/**
 * Submission input schema
 */
export const SubmissionInputSchema = z.object({
  version: z.number().int().positive().optional(),
  answers: AnswerPayloadSchema,
});

export type SubmissionInput = z.infer<typeof SubmissionInputSchema>;
