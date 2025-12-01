import { describe, it, expect } from 'vitest';
import {
  QuestionnaireDefinitionSchema,
  TextQuestionSchema,
  ChoiceQuestionSchema,
} from '../index.js';

describe('QuestionnaireDefinitionSchema', () => {
  it('should validate a valid questionnaire', () => {
    const validQuestionnaire = {
      id: 'survey_1',
      title: 'My Survey',
      description: 'A test survey',
      questions: [
        {
          id: 'q1',
          type: 'text',
          label: 'What is your name?',
          required: true,
        },
      ],
    };

    const result = QuestionnaireDefinitionSchema.safeParse(validQuestionnaire);
    expect(result.success).toBe(true);
  });

  it('should validate questionnaire with sections', () => {
    const questionnaireWithSections = {
      id: 'survey_1',
      title: 'My Survey',
      sections: [
        {
          id: 'section_1',
          title: 'Personal Info',
          questionIds: ['q1', 'q2'],
        },
      ],
      questions: [
        {
          id: 'q1',
          type: 'text',
          label: 'Name',
        },
        {
          id: 'q2',
          type: 'text',
          label: 'Email',
        },
      ],
    };

    const result = QuestionnaireDefinitionSchema.safeParse(questionnaireWithSections);
    expect(result.success).toBe(true);
  });

  it('should reject questionnaire with duplicate question IDs', () => {
    const duplicateQuestionnaire = {
      id: 'survey_1',
      title: 'My Survey',
      questions: [
        { id: 'q1', type: 'text', label: 'Question 1' },
        { id: 'q1', type: 'text', label: 'Question 2' },
      ],
    };

    const result = QuestionnaireDefinitionSchema.safeParse(duplicateQuestionnaire);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('unique');
    }
  });

  it('should reject questionnaire with duplicate section IDs', () => {
    const duplicateSections = {
      id: 'survey_1',
      title: 'My Survey',
      sections: [
        { id: 'sec1', title: 'Section 1', questionIds: ['q1'] },
        { id: 'sec1', title: 'Section 2', questionIds: ['q2'] },
      ],
      questions: [
        { id: 'q1', type: 'text', label: 'Q1' },
        { id: 'q2', type: 'text', label: 'Q2' },
      ],
    };

    const result = QuestionnaireDefinitionSchema.safeParse(duplicateSections);
    expect(result.success).toBe(false);
  });

  it('should reject questionnaire with section referencing non-existent question', () => {
    const invalidReference = {
      id: 'survey_1',
      title: 'My Survey',
      sections: [
        { id: 'sec1', title: 'Section 1', questionIds: ['q1', 'q999'] },
      ],
      questions: [
        { id: 'q1', type: 'text', label: 'Q1' },
      ],
    };

    const result = QuestionnaireDefinitionSchema.safeParse(invalidReference);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('reference existing questions');
    }
  });

  it('should require at least one question', () => {
    const noQuestions = {
      id: 'survey_1',
      title: 'My Survey',
      questions: [],
    };

    const result = QuestionnaireDefinitionSchema.safeParse(noQuestions);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const missingFields = {
      title: 'My Survey',
      questions: [{ id: 'q1', type: 'text', label: 'Q1' }],
    };

    const result = QuestionnaireDefinitionSchema.safeParse(missingFields);
    expect(result.success).toBe(false);
  });
});

describe('TextQuestionSchema', () => {
  it('should validate a valid text question', () => {
    const validTextQuestion = {
      id: 'q1',
      type: 'text',
      label: 'What is your name?',
      required: true,
      multiline: false,
      maxLength: 100,
    };

    const result = TextQuestionSchema.safeParse(validTextQuestion);
    expect(result.success).toBe(true);
  });

  it('should apply default values', () => {
    const minimalTextQuestion = {
      id: 'q1',
      type: 'text',
      label: 'Name?',
    };

    const result = TextQuestionSchema.safeParse(minimalTextQuestion);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.required).toBe(false);
      expect(result.data.multiline).toBe(false);
    }
  });

  it('should accept visibleIf conditions', () => {
    const conditionalQuestion = {
      id: 'q2',
      type: 'text',
      label: 'Follow-up',
      visibleIf: {
        all: [
          { questionId: 'q1', operator: 'equals', value: 'yes' },
        ],
      },
    };

    const result = TextQuestionSchema.safeParse(conditionalQuestion);
    expect(result.success).toBe(true);
  });
});

describe('ChoiceQuestionSchema', () => {
  it('should validate a valid choice question', () => {
    const validChoiceQuestion = {
      id: 'q1',
      type: 'choice',
      label: 'Pick one',
      required: true,
      multiple: false,
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
    };

    const result = ChoiceQuestionSchema.safeParse(validChoiceQuestion);
    expect(result.success).toBe(true);
  });

  it('should require at least one option', () => {
    const noOptions = {
      id: 'q1',
      type: 'choice',
      label: 'Pick one',
      options: [],
    };

    const result = ChoiceQuestionSchema.safeParse(noOptions);
    expect(result.success).toBe(false);
  });

  it('should reject duplicate option values', () => {
    const duplicateValues = {
      id: 'q1',
      type: 'choice',
      label: 'Pick one',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'a', label: 'Option B' },
      ],
    };

    const result = ChoiceQuestionSchema.safeParse(duplicateValues);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('unique');
    }
  });

  it('should support multiple selection', () => {
    const multipleChoice = {
      id: 'q1',
      type: 'choice',
      label: 'Pick any',
      multiple: true,
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    };

    const result = ChoiceQuestionSchema.safeParse(multipleChoice);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.multiple).toBe(true);
    }
  });
});
