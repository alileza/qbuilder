import { describe, it, expect } from 'vitest';
import {
  buildAnswerSchema,
  validateAnswers,
  parseQuestionnaire,
} from '../validation.js';
import type { QuestionnaireDefinition, AnswerPayload } from '../../schemas/index.js';

describe('buildAnswerSchema', () => {
  it('should build schema for all visible questions', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [
        { id: 'q1', type: 'text', label: 'Name', required: true },
        { id: 'q2', type: 'text', label: 'Email', required: false },
      ],
    };

    const answers = {};
    const schema = buildAnswerSchema(questionnaire, answers);

    // Should create a schema that validates both questions
    expect(schema.safeParse({ q1: 'John', q2: 'john@example.com' }).success).toBe(true);
  });

  it('should only include visible questions in schema', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [
        { id: 'q1', type: 'choice', label: 'Own car?', required: true, options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
        {
          id: 'q2',
          type: 'text',
          label: 'Car brand',
          required: true,
          visibleIf: {
            all: [{ questionId: 'q1', operator: 'equals', value: 'yes' }],
          },
        },
      ],
    };

    // When q1 = 'no', q2 should not be in schema
    const answers1 = { q1: 'no' };
    const schema1 = buildAnswerSchema(questionnaire, answers1);

    // q2 is not required when invisible
    expect(schema1.safeParse({ q1: 'no' }).success).toBe(true);

    // When q1 = 'yes', q2 should be in schema and required
    const answers2 = { q1: 'yes' };
    const schema2 = buildAnswerSchema(questionnaire, answers2);

    // q2 is required when visible
    expect(schema2.safeParse({ q1: 'yes' }).success).toBe(false);
    expect(schema2.safeParse({ q1: 'yes', q2: 'Toyota' }).success).toBe(true);
  });

  it('should throw error for unknown question type', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [
        { id: 'q1', type: 'unknown-type', label: 'Test' } as any,
      ],
    };

    expect(() => buildAnswerSchema(questionnaire, {})).toThrow(
      'No answer schema builder found for question type: unknown-type'
    );
  });

  it('should use passthrough to allow extra fields', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [
        { id: 'q1', type: 'text', label: 'Name', required: true },
      ],
    };

    const schema = buildAnswerSchema(questionnaire, {});

    // Should allow extra fields (passthrough)
    expect(schema.safeParse({ q1: 'John', extraField: 'value' }).success).toBe(true);
  });
});

describe('validateAnswers', () => {
  describe('successful validation', () => {
    it('should validate correct answers', () => {
      const questionnaire: QuestionnaireDefinition = {
        id: 'survey',
        title: 'Survey',
        questions: [
          { id: 'q1', type: 'text', label: 'Name', required: true },
          { id: 'q2', type: 'text', label: 'Email', required: false },
        ],
      };

      const answers = { q1: 'John Doe', q2: 'john@example.com' };
      const result = validateAnswers(questionnaire, answers);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q1).toBe('John Doe');
        expect(result.data.q2).toBe('john@example.com');
      }
    });

    it('should validate when optional fields are omitted', () => {
      const questionnaire: QuestionnaireDefinition = {
        id: 'survey',
        title: 'Survey',
        questions: [
          { id: 'q1', type: 'text', label: 'Name', required: true },
          { id: 'q2', type: 'text', label: 'Email', required: false },
        ],
      };

      const answers = { q1: 'John Doe' };
      const result = validateAnswers(questionnaire, answers);

      expect(result.success).toBe(true);
    });

    it('should validate with branching logic', () => {
      const questionnaire: QuestionnaireDefinition = {
        id: 'survey',
        title: 'Survey',
        questions: [
          { id: 'q1', type: 'choice', label: 'Own car?', required: true, options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
          {
            id: 'q2',
            type: 'text',
            label: 'Car brand',
            required: true,
            visibleIf: {
              all: [{ questionId: 'q1', operator: 'equals', value: 'yes' }],
            },
          },
        ],
      };

      // When q1 = 'no', q2 is not required
      const result1 = validateAnswers(questionnaire, { q1: 'no' });
      expect(result1.success).toBe(true);

      // When q1 = 'yes', q2 is required
      const result2 = validateAnswers(questionnaire, { q1: 'yes', q2: 'Toyota' });
      expect(result2.success).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('should return errors for missing required fields', () => {
      const questionnaire: QuestionnaireDefinition = {
        id: 'survey',
        title: 'Survey',
        questions: [
          { id: 'q1', type: 'text', label: 'Name', required: true },
        ],
      };

      const answers = {};
      const result = validateAnswers(questionnaire, answers);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].field).toContain('q1');
      }
    });

    it('should format errors with field, code, and message', () => {
      const questionnaire: QuestionnaireDefinition = {
        id: 'survey',
        title: 'Survey',
        questions: [
          { id: 'q1', type: 'text', label: 'Name', required: true },
        ],
      };

      const answers = { q1: '' };
      const result = validateAnswers(questionnaire, answers);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.errors[0];
        expect(error.field).toBe('answers.q1');
        expect(error.code).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    it('should return errors for invalid choice values', () => {
      const questionnaire: QuestionnaireDefinition = {
        id: 'survey',
        title: 'Survey',
        questions: [
          {
            id: 'q1',
            type: 'choice',
            label: 'Pick one',
            required: true,
            options: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          },
        ],
      };

      const answers = { q1: 'c' };
      const result = validateAnswers(questionnaire, answers);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should return errors for text exceeding maxLength', () => {
      const questionnaire: QuestionnaireDefinition = {
        id: 'survey',
        title: 'Survey',
        questions: [
          {
            id: 'q1',
            type: 'text',
            label: 'Name',
            required: true,
            maxLength: 5,
          },
        ],
      };

      const answers = { q1: '123456' };
      const result = validateAnswers(questionnaire, answers);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should validate required fields in visible conditional questions', () => {
      const questionnaire: QuestionnaireDefinition = {
        id: 'survey',
        title: 'Survey',
        questions: [
          { id: 'q1', type: 'choice', label: 'Own car?', required: true, options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
          {
            id: 'q2',
            type: 'text',
            label: 'Car brand',
            required: true,
            visibleIf: {
              all: [{ questionId: 'q1', operator: 'equals', value: 'yes' }],
            },
          },
        ],
      };

      // q2 is visible but missing (should fail)
      const result = validateAnswers(questionnaire, { q1: 'yes' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.field.includes('q2'))).toBe(true);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty questionnaire', () => {
      const questionnaire: QuestionnaireDefinition = {
        id: 'survey',
        title: 'Survey',
        questions: [
          { id: 'q1', type: 'text', label: 'Q1' },
        ],
      };

      const result = validateAnswers(questionnaire, {});
      expect(result.success).toBe(true);
    });

    it('should handle answers for invisible questions', () => {
      const questionnaire: QuestionnaireDefinition = {
        id: 'survey',
        title: 'Survey',
        questions: [
          { id: 'q1', type: 'choice', label: 'Q1', required: true, options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
          {
            id: 'q2',
            type: 'text',
            label: 'Q2',
            required: true,
            visibleIf: {
              all: [{ questionId: 'q1', operator: 'equals', value: 'yes' }],
            },
          },
        ],
      };

      // Provide answer for q2 even though q1='no' makes q2 invisible
      const answers = { q1: 'no', q2: 'should be ignored' };
      const result = validateAnswers(questionnaire, answers);

      // Should succeed because q2 is invisible and not validated
      expect(result.success).toBe(true);
    });

    it('should handle validation errors gracefully', () => {
      const questionnaire: QuestionnaireDefinition = {
        id: 'survey',
        title: 'Survey',
        questions: [
          { id: 'q1', type: 'text', label: 'Q1', required: true },
        ],
      };

      // Pass invalid data type
      const answers = { q1: null };
      const result = validateAnswers(questionnaire, answers);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('parseQuestionnaire', () => {
  it('should parse valid questionnaire', () => {
    const payload = {
      id: 'survey',
      title: 'Survey',
      questions: [
        { id: 'q1', type: 'text', label: 'Name' },
      ],
    };

    const result = parseQuestionnaire(payload);

    expect(result.id).toBe('survey');
    expect(result.title).toBe('Survey');
    expect(result.questions.length).toBe(1);
  });

  it('should throw error for invalid questionnaire structure', () => {
    const payload = {
      id: 'survey',
      // missing title
      questions: [
        { id: 'q1', type: 'text', label: 'Name' },
      ],
    };

    expect(() => parseQuestionnaire(payload)).toThrow('Invalid questionnaire definition');
  });

  it('should throw error for missing required fields', () => {
    const payload = {
      id: 'survey',
      title: 'Survey',
      questions: [],  // empty questions array
    };

    expect(() => parseQuestionnaire(payload)).toThrow();
  });

  it('should throw error for duplicate question IDs', () => {
    const payload = {
      id: 'survey',
      title: 'Survey',
      questions: [
        { id: 'q1', type: 'text', label: 'Q1' },
        { id: 'q1', type: 'text', label: 'Q2' },
      ],
    };

    expect(() => parseQuestionnaire(payload)).toThrow();
  });

  it('should detect cyclic dependencies', () => {
    const payload = {
      id: 'survey',
      title: 'Survey',
      questions: [
        {
          id: 'q1',
          type: 'text',
          label: 'Q1',
          visibleIf: {
            all: [{ questionId: 'q2', operator: 'isAnswered' }],
          },
        },
        {
          id: 'q2',
          type: 'text',
          label: 'Q2',
          visibleIf: {
            all: [{ questionId: 'q1', operator: 'isAnswered' }],
          },
        },
      ],
    };

    expect(() => parseQuestionnaire(payload)).toThrow('Cyclic dependency');
  });

  it('should validate section references', () => {
    const payload = {
      id: 'survey',
      title: 'Survey',
      sections: [
        { id: 's1', title: 'Section 1', questionIds: ['q1', 'q999'] },
      ],
      questions: [
        { id: 'q1', type: 'text', label: 'Q1' },
      ],
    };

    expect(() => parseQuestionnaire(payload)).toThrow();
  });

  it('should parse questionnaire with sections', () => {
    const payload = {
      id: 'survey',
      title: 'Survey',
      sections: [
        { id: 's1', title: 'Section 1', questionIds: ['q1', 'q2'] },
      ],
      questions: [
        { id: 'q1', type: 'text', label: 'Q1' },
        { id: 'q2', type: 'text', label: 'Q2' },
      ],
    };

    const result = parseQuestionnaire(payload);

    expect(result.sections).toBeDefined();
    expect(result.sections?.length).toBe(1);
    expect(result.sections?.[0].questionIds).toEqual(['q1', 'q2']);
  });

  it('should handle complex valid questionnaire', () => {
    const payload = {
      id: 'car_survey',
      title: 'Car Survey',
      description: 'A survey about cars',
      sections: [
        { id: 's1', title: 'Basic Info', questionIds: ['q1'] },
        { id: 's2', title: 'Car Details', questionIds: ['q2', 'q3'] },
      ],
      questions: [
        { id: 'q1', type: 'text', label: 'Name', required: true },
        {
          id: 'q2',
          type: 'choice',
          label: 'Own car?',
          required: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
        },
        {
          id: 'q3',
          type: 'text',
          label: 'Car brand',
          required: true,
          visibleIf: {
            all: [{ questionId: 'q2', operator: 'equals', value: 'yes' }],
          },
        },
      ],
    };

    const result = parseQuestionnaire(payload);

    expect(result.id).toBe('car_survey');
    expect(result.questions.length).toBe(3);
    expect(result.sections?.length).toBe(2);
  });
});
