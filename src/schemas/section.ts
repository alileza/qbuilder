import { z } from 'zod';

/**
 * Section definition for grouping related questions
 */
export const SectionDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  questionIds: z.array(z.string().min(1)).min(1),
}).refine(
  (data) => {
    // Ensure questionIds are unique within the section
    return data.questionIds.length === new Set(data.questionIds).size;
  },
  {
    message: 'Question IDs within a section must be unique',
  }
);

export type SectionDefinition = z.infer<typeof SectionDefinitionSchema>;
