import { describe, it, expect } from 'vitest';
import * as qbuilder from '../index.js';

describe('Public API Exports', () => {
  describe('Schema exports', () => {
    it('should export schema types', () => {
      // These should compile without errors
      const condition: qbuilder.Condition = {
        questionId: 'q1',
        operator: 'equals',
        value: 'test',
      };

      const visibleIf: qbuilder.VisibleIf = {
        all: [condition],
      };

      expect(condition).toBeDefined();
      expect(visibleIf).toBeDefined();
    });

    it('should export question types', () => {
      const textQuestion: qbuilder.TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Name',
        required: true,
      };

      const choiceQuestion: qbuilder.ChoiceQuestion = {
        id: 'q2',
        type: 'choice',
        label: 'Department',
        options: [
          { value: 'eng', label: 'Engineering' },
          { value: 'sales', label: 'Sales' },
        ],
      };

      expect(textQuestion.type).toBe('text');
      expect(choiceQuestion.type).toBe('choice');
    });
  });

  describe('Engine exports', () => {
    it('should export parseQuestionnaire', () => {
      expect(qbuilder.parseQuestionnaire).toBeDefined();
      expect(typeof qbuilder.parseQuestionnaire).toBe('function');
    });

    it('should export validateAnswers', () => {
      expect(qbuilder.validateAnswers).toBeDefined();
      expect(typeof qbuilder.validateAnswers).toBe('function');
    });

    it('should export getVisibleQuestions', () => {
      expect(qbuilder.getVisibleQuestions).toBeDefined();
      expect(typeof qbuilder.getVisibleQuestions).toBe('function');
    });

    it('should export getVisibleSections', () => {
      expect(qbuilder.getVisibleSections).toBeDefined();
      expect(typeof qbuilder.getVisibleSections).toBe('function');
    });
  });

  describe('Registry exports', () => {
    it('should export answerSchemaRegistry', () => {
      expect(qbuilder.answerSchemaRegistry).toBeDefined();
      expect(typeof qbuilder.answerSchemaRegistry).toBe('object');
      expect(qbuilder.answerSchemaRegistry).toHaveProperty('text');
      expect(qbuilder.answerSchemaRegistry).toHaveProperty('choice');
    });

    it('should export registerAnswerBuilder', () => {
      expect(qbuilder.registerAnswerBuilder).toBeDefined();
      expect(typeof qbuilder.registerAnswerBuilder).toBe('function');
    });
  });

  describe('Database exports', () => {
    it('should export createQuestionnaireRepository', () => {
      expect(qbuilder.createQuestionnaireRepository).toBeDefined();
      expect(typeof qbuilder.createQuestionnaireRepository).toBe('function');
    });

    it('should export createSubmissionRepository', () => {
      expect(qbuilder.createSubmissionRepository).toBeDefined();
      expect(typeof qbuilder.createSubmissionRepository).toBe('function');
    });
  });

  describe('API exports', () => {
    it('should export createQuestionnaireRouter', () => {
      expect(qbuilder.createQuestionnaireRouter).toBeDefined();
      expect(typeof qbuilder.createQuestionnaireRouter).toBe('function');
    });

    it('should export handler functions', () => {
      expect(qbuilder.handleCreateQuestionnaire).toBeDefined();
      expect(qbuilder.handleGetQuestionnaire).toBeDefined();
      expect(qbuilder.handleUpdateQuestionnaire).toBeDefined();
      expect(qbuilder.handleListQuestionnaires).toBeDefined();
      expect(qbuilder.handleSubmitAnswers).toBeDefined();
      expect(qbuilder.handleGetSubmission).toBeDefined();
      expect(qbuilder.handleListSubmissions).toBeDefined();
    });

    it('should export createErrorHandler', () => {
      expect(qbuilder.createErrorHandler).toBeDefined();
      expect(typeof qbuilder.createErrorHandler).toBe('function');
    });
  });

  describe('Error exports', () => {
    it('should export ErrorCodes', () => {
      expect(qbuilder.ErrorCodes).toBeDefined();
      expect(qbuilder.ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(qbuilder.ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(qbuilder.ErrorCodes.CONFLICT).toBe('CONFLICT');
      expect(qbuilder.ErrorCodes.CYCLIC_DEPENDENCY).toBe('CYCLIC_DEPENDENCY');
      expect(qbuilder.ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('should export error classes', () => {
      expect(qbuilder.QBuilderError).toBeDefined();
      expect(qbuilder.ValidationError).toBeDefined();
      expect(qbuilder.NotFoundError).toBeDefined();
      expect(qbuilder.ConflictError).toBeDefined();
      expect(qbuilder.CyclicDependencyError).toBeDefined();
      expect(qbuilder.InternalError).toBeDefined();
    });

    it('should allow instantiating error classes', () => {
      const validationError = new qbuilder.ValidationError('Test error');
      expect(validationError).toBeInstanceOf(qbuilder.ValidationError);
      expect(validationError).toBeInstanceOf(qbuilder.QBuilderError);
      expect(validationError).toBeInstanceOf(Error);
      expect(validationError.message).toBe('Test error');
      expect(validationError.code).toBe(qbuilder.ErrorCodes.VALIDATION_ERROR);

      const notFoundError = new qbuilder.NotFoundError('Not found');
      expect(notFoundError).toBeInstanceOf(qbuilder.NotFoundError);
      expect(notFoundError.code).toBe(qbuilder.ErrorCodes.NOT_FOUND);

      const conflictError = new qbuilder.ConflictError('Conflict');
      expect(conflictError).toBeInstanceOf(qbuilder.ConflictError);
      expect(conflictError.code).toBe(qbuilder.ErrorCodes.CONFLICT);
    });
  });

  describe('Integration - full workflow', () => {
    it('should work together to parse, validate, and get visible questions', () => {
      const questionnaireData = {
        id: 'test',
        title: 'Test Questionnaire',
        questions: [
          {
            id: 'q1',
            type: 'choice',
            label: 'Have a job?',
            required: true,
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ],
          },
          {
            id: 'q2',
            type: 'text',
            label: 'Company name',
            required: true,
            visibleIf: {
              all: [{ questionId: 'q1', operator: 'equals', value: 'yes' }],
            },
          },
        ],
      };

      // Parse questionnaire
      const questionnaire = qbuilder.parseQuestionnaire(questionnaireData);
      expect(questionnaire.id).toBe('test');

      // Get visible questions with job = yes
      const visibleWithJob = qbuilder.getVisibleQuestions(questionnaire, {
        q1: 'yes',
      });
      expect(visibleWithJob).toHaveLength(2);

      // Get visible questions with job = no
      const visibleWithoutJob = qbuilder.getVisibleQuestions(questionnaire, {
        q1: 'no',
      });
      expect(visibleWithoutJob).toHaveLength(1);

      // Validate answers when q2 is visible
      const validResult = qbuilder.validateAnswers(questionnaire, {
        q1: 'yes',
        q2: 'Acme Corp',
      });
      expect(validResult.success).toBe(true);

      // Validate answers when q2 is not visible (should pass)
      const validWithoutQ2 = qbuilder.validateAnswers(questionnaire, {
        q1: 'no',
      });
      expect(validWithoutQ2.success).toBe(true);
    });
  });
});
