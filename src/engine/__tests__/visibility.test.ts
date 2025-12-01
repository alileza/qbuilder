import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  isQuestionVisible,
  getVisibleQuestions,
  getVisibleSections,
} from '../visibility.js';
import type { Condition, QuestionnaireDefinition, AnswerPayload } from '../../schemas/index.js';

describe('evaluateCondition', () => {
  describe('isAnswered operator', () => {
    it('should return true when answer exists', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'isAnswered',
      };
      const answers = { q1: 'some value' };

      expect(evaluateCondition(condition, answers)).toBe(true);
    });

    it('should return false for undefined', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'isAnswered',
      };
      const answers = {};

      expect(evaluateCondition(condition, answers)).toBe(false);
    });

    it('should return false for null', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'isAnswered',
      };
      const answers = { q1: null };

      expect(evaluateCondition(condition, answers)).toBe(false);
    });

    it('should return false for empty string', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'isAnswered',
      };
      const answers = { q1: '' };

      expect(evaluateCondition(condition, answers)).toBe(false);
    });
  });

  describe('notAnswered operator', () => {
    it('should return true when answer is undefined', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'notAnswered',
      };
      const answers = {};

      expect(evaluateCondition(condition, answers)).toBe(true);
    });

    it('should return false when answer exists', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'notAnswered',
      };
      const answers = { q1: 'value' };

      expect(evaluateCondition(condition, answers)).toBe(false);
    });
  });

  describe('equals operator', () => {
    it('should return true for matching values', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'equals',
        value: 'yes',
      };
      const answers = { q1: 'yes' };

      expect(evaluateCondition(condition, answers)).toBe(true);
    });

    it('should return false for non-matching values', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'equals',
        value: 'yes',
      };
      const answers = { q1: 'no' };

      expect(evaluateCondition(condition, answers)).toBe(false);
    });

    it('should work with numbers', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'equals',
        value: 42,
      };
      const answers = { q1: 42 };

      expect(evaluateCondition(condition, answers)).toBe(true);
    });
  });

  describe('notEquals operator', () => {
    it('should return true for different values', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'notEquals',
        value: 'yes',
      };
      const answers = { q1: 'no' };

      expect(evaluateCondition(condition, answers)).toBe(true);
    });

    it('should return false for matching values', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'notEquals',
        value: 'yes',
      };
      const answers = { q1: 'yes' };

      expect(evaluateCondition(condition, answers)).toBe(false);
    });
  });

  describe('in operator', () => {
    it('should return true when value is in array', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'in',
        value: ['a', 'b', 'c'],
      };
      const answers = { q1: 'b' };

      expect(evaluateCondition(condition, answers)).toBe(true);
    });

    it('should return false when value is not in array', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'in',
        value: ['a', 'b', 'c'],
      };
      const answers = { q1: 'd' };

      expect(evaluateCondition(condition, answers)).toBe(false);
    });

    it('should handle array answers (any match)', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'in',
        value: ['a', 'b', 'c'],
      };
      const answers = { q1: ['b', 'x'] };

      expect(evaluateCondition(condition, answers)).toBe(true);
    });

    it('should return false if value is not an array', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'in',
        value: 'not-an-array',
      };
      const answers = { q1: 'value' };

      expect(evaluateCondition(condition, answers)).toBe(false);
    });
  });

  describe('notIn operator', () => {
    it('should return true when value is not in array', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'notIn',
        value: ['a', 'b', 'c'],
      };
      const answers = { q1: 'd' };

      expect(evaluateCondition(condition, answers)).toBe(true);
    });

    it('should return false when value is in array', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'notIn',
        value: ['a', 'b', 'c'],
      };
      const answers = { q1: 'b' };

      expect(evaluateCondition(condition, answers)).toBe(false);
    });
  });

  describe('gt operator', () => {
    it('should return true when answer is greater', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'gt',
        value: 10,
      };
      const answers = { q1: 15 };

      expect(evaluateCondition(condition, answers)).toBe(true);
    });

    it('should return false when answer is equal', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'gt',
        value: 10,
      };
      const answers = { q1: 10 };

      expect(evaluateCondition(condition, answers)).toBe(false);
    });

    it('should return false when answer is not a number', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'gt',
        value: 10,
      };
      const answers = { q1: 'not-a-number' };

      expect(evaluateCondition(condition, answers)).toBe(false);
    });
  });

  describe('gte operator', () => {
    it('should return true when answer is greater or equal', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'gte',
        value: 10,
      };

      expect(evaluateCondition(condition, { q1: 15 })).toBe(true);
      expect(evaluateCondition(condition, { q1: 10 })).toBe(true);
      expect(evaluateCondition(condition, { q1: 5 })).toBe(false);
    });
  });

  describe('lt operator', () => {
    it('should return true when answer is less', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'lt',
        value: 10,
      };
      const answers = { q1: 5 };

      expect(evaluateCondition(condition, answers)).toBe(true);
    });

    it('should return false when answer is equal', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'lt',
        value: 10,
      };
      const answers = { q1: 10 };

      expect(evaluateCondition(condition, answers)).toBe(false);
    });
  });

  describe('lte operator', () => {
    it('should return true when answer is less or equal', () => {
      const condition: Condition = {
        questionId: 'q1',
        operator: 'lte',
        value: 10,
      };

      expect(evaluateCondition(condition, { q1: 5 })).toBe(true);
      expect(evaluateCondition(condition, { q1: 10 })).toBe(true);
      expect(evaluateCondition(condition, { q1: 15 })).toBe(false);
    });
  });
});

describe('isQuestionVisible', () => {
  it('should return true when no visibleIf is defined', () => {
    const question = {
      id: 'q1',
      type: 'text' as const,
      label: 'Q1',
    };
    const answers = {};

    expect(isQuestionVisible(question, answers)).toBe(true);
  });

  it('should evaluate all conditions (AND logic)', () => {
    const question = {
      id: 'q2',
      type: 'text' as const,
      label: 'Q2',
      visibleIf: {
        all: [
          { questionId: 'q1', operator: 'equals' as const, value: 'yes' },
          { questionId: 'q1a', operator: 'isAnswered' as const },
        ],
      },
    };

    // Both conditions met
    expect(isQuestionVisible(question, { q1: 'yes', q1a: 'value' })).toBe(true);

    // Only first condition met
    expect(isQuestionVisible(question, { q1: 'yes' })).toBe(false);

    // Only second condition met
    expect(isQuestionVisible(question, { q1: 'no', q1a: 'value' })).toBe(false);
  });

  it('should evaluate any conditions (OR logic)', () => {
    const question = {
      id: 'q2',
      type: 'text' as const,
      label: 'Q2',
      visibleIf: {
        any: [
          { questionId: 'q1', operator: 'equals' as const, value: 'yes' },
          { questionId: 'q1a', operator: 'isAnswered' as const },
        ],
      },
    };

    // First condition met
    expect(isQuestionVisible(question, { q1: 'yes' })).toBe(true);

    // Second condition met
    expect(isQuestionVisible(question, { q1a: 'value' })).toBe(true);

    // Neither met
    expect(isQuestionVisible(question, { q1: 'no' })).toBe(false);
  });

  it('should combine all and any conditions', () => {
    const question = {
      id: 'q3',
      type: 'text' as const,
      label: 'Q3',
      visibleIf: {
        all: [{ questionId: 'q1', operator: 'isAnswered' as const }],
        any: [
          { questionId: 'q2', operator: 'equals' as const, value: 'a' },
          { questionId: 'q2', operator: 'equals' as const, value: 'b' },
        ],
      },
    };

    // All met + one any met
    expect(isQuestionVisible(question, { q1: 'yes', q2: 'a' })).toBe(true);

    // All met + no any met
    expect(isQuestionVisible(question, { q1: 'yes', q2: 'c' })).toBe(false);

    // All not met + any met
    expect(isQuestionVisible(question, { q2: 'a' })).toBe(false);
  });

  it('should return true for empty all and any arrays', () => {
    const question = {
      id: 'q1',
      type: 'text' as const,
      label: 'Q1',
      visibleIf: {
        all: [],
        any: [],
      },
    };

    expect(isQuestionVisible(question, {})).toBe(true);
  });
});

describe('getVisibleQuestions', () => {
  it('should return all questions when no conditions', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [
        { id: 'q1', type: 'text', label: 'Q1' },
        { id: 'q2', type: 'text', label: 'Q2' },
      ],
    };

    const visible = getVisibleQuestions(questionnaire, {});
    expect(visible.length).toBe(2);
  });

  it('should filter out invisible questions', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [
        { id: 'q1', type: 'choice', label: 'Own car?', options: [{ value: 'yes', label: 'Yes' }] },
        {
          id: 'q2',
          type: 'text',
          label: 'Car brand?',
          visibleIf: {
            all: [{ questionId: 'q1', operator: 'equals', value: 'yes' }],
          },
        },
      ],
    };

    // q2 should be visible
    let visible = getVisibleQuestions(questionnaire, { q1: 'yes' });
    expect(visible.length).toBe(2);
    expect(visible.map((q) => q.id)).toEqual(['q1', 'q2']);

    // q2 should be hidden
    visible = getVisibleQuestions(questionnaire, { q1: 'no' });
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe('q1');
  });

  it('should maintain question order', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [
        { id: 'q1', type: 'text', label: 'Q1' },
        { id: 'q2', type: 'text', label: 'Q2' },
        { id: 'q3', type: 'text', label: 'Q3' },
      ],
    };

    const visible = getVisibleQuestions(questionnaire, {});
    expect(visible.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
  });
});

describe('getVisibleSections', () => {
  it('should return empty array when no sections defined', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [{ id: 'q1', type: 'text', label: 'Q1' }],
    };

    const visible = getVisibleSections(questionnaire, {});
    expect(visible).toEqual([]);
  });

  it('should return all sections when all questions visible', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      sections: [
        { id: 's1', title: 'Section 1', questionIds: ['q1', 'q2'] },
        { id: 's2', title: 'Section 2', questionIds: ['q3'] },
      ],
      questions: [
        { id: 'q1', type: 'text', label: 'Q1' },
        { id: 'q2', type: 'text', label: 'Q2' },
        { id: 'q3', type: 'text', label: 'Q3' },
      ],
    };

    const visible = getVisibleSections(questionnaire, {});
    expect(visible.length).toBe(2);
    expect(visible[0].questionIds).toEqual(['q1', 'q2']);
    expect(visible[1].questionIds).toEqual(['q3']);
  });

  it('should filter out sections with no visible questions', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      sections: [
        { id: 's1', title: 'Section 1', questionIds: ['q1'] },
        { id: 's2', title: 'Section 2', questionIds: ['q2'] },
      ],
      questions: [
        { id: 'q1', type: 'text', label: 'Q1' },
        {
          id: 'q2',
          type: 'text',
          label: 'Q2',
          visibleIf: {
            all: [{ questionId: 'q1', operator: 'equals', value: 'show' }],
          },
        },
      ],
    };

    // q2 not visible, so s2 should be filtered out
    const visible = getVisibleSections(questionnaire, { q1: 'hide' });
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe('s1');
  });

  it('should filter questionIds within sections', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      sections: [
        { id: 's1', title: 'Section 1', questionIds: ['q1', 'q2', 'q3'] },
      ],
      questions: [
        { id: 'q1', type: 'text', label: 'Q1' },
        {
          id: 'q2',
          type: 'text',
          label: 'Q2',
          visibleIf: {
            all: [{ questionId: 'q1', operator: 'equals', value: 'show' }],
          },
        },
        { id: 'q3', type: 'text', label: 'Q3' },
      ],
    };

    // q2 hidden
    const visible = getVisibleSections(questionnaire, { q1: 'hide' });
    expect(visible[0].questionIds).toEqual(['q1', 'q3']);
  });
});
