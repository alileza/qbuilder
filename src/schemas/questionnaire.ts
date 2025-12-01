import { z } from 'zod';
import { QuestionDefinitionSchema } from './question.js';
import { SectionDefinitionSchema } from './section.js';

/**
 * Questionnaire definition schema
 */
export const QuestionnaireDefinitionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    sections: z.array(SectionDefinitionSchema).optional(),
    questions: z.array(QuestionDefinitionSchema).min(1),
  })
  .refine(
    (data) => {
      // Ensure question IDs are unique
      const questionIds = data.questions.map((q) => q.id);
      return questionIds.length === new Set(questionIds).size;
    },
    {
      message: 'Question IDs must be unique',
      path: ['questions'],
    }
  )
  .refine(
    (data) => {
      // Ensure section IDs are unique (if sections exist)
      if (!data.sections || data.sections.length === 0) return true;
      const sectionIds = data.sections.map((s) => s.id);
      return sectionIds.length === new Set(sectionIds).size;
    },
    {
      message: 'Section IDs must be unique',
      path: ['sections'],
    }
  )
  .refine(
    (data) => {
      // Ensure all questionIds in sections reference existing questions
      if (!data.sections || data.sections.length === 0) return true;

      const questionIds = new Set(data.questions.map((q) => q.id));
      const referencedIds = data.sections.flatMap((s) => s.questionIds);

      return referencedIds.every((id) => questionIds.has(id));
    },
    {
      message: 'All questionIds in sections must reference existing questions',
      path: ['sections'],
    }
  );

export type QuestionnaireDefinition = z.infer<typeof QuestionnaireDefinitionSchema>;
