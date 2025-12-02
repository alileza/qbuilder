import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleCreateQuestionnaire,
  handleGetQuestionnaire,
  handleGetQuestionnaireVersion,
  handleUpdateQuestionnaire,
  handleListQuestionnaires,
  handleListVersions,
  handleValidateAnswers,
  handleGetVisibleQuestions,
} from '../questionnaire.js';
import type { QuestionnaireDefinition } from '../../../schemas/index.js';
import { NotFoundError, ValidationError } from '../../../errors/index.js';

describe('Questionnaire Handlers', () => {
  const mockRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndVersion: vi.fn(),
    update: vi.fn(),
    listVersions: vi.fn(),
    list: vi.fn(),
  };

  const sampleQuestionnaire: QuestionnaireDefinition = {
    id: 'onboarding',
    title: 'Employee Onboarding',
    description: 'Collect employee information',
    questions: [
      {
        id: 'name',
        type: 'text',
        label: 'Full Name',
        required: true,
      },
      {
        id: 'department',
        type: 'choice',
        label: 'Department',
        required: true,
        options: [
          { value: 'eng', label: 'Engineering' },
          { value: 'sales', label: 'Sales' },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleCreateQuestionnaire', () => {
    it('should create a questionnaire and return 201', async () => {
      const now = new Date();
      const created = { ...sampleQuestionnaire, version: 1, createdAt: now, metadata: {} };
      mockRepo.create.mockResolvedValue(created);

      const result = await handleCreateQuestionnaire(mockRepo as any, sampleQuestionnaire);

      expect(result.status).toBe(201);
      expect(result.data.questionnaire).toEqual(created);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: sampleQuestionnaire.id,
          title: sampleQuestionnaire.title,
          description: sampleQuestionnaire.description,
        }),
        { metadata: undefined }
      );
    });

    it('should validate questionnaire definition before creating', async () => {
      const invalidQuestionnaire = {
        id: 'test',
        title: 'Test',
        questions: [
          {
            id: 'q1',
            type: 'text',
            label: 'Question 1',
          },
          {
            id: 'q1', // Duplicate ID
            type: 'text',
            label: 'Question 2',
          },
        ],
      };

      await expect(
        handleCreateQuestionnaire(mockRepo as any, invalidQuestionnaire)
      ).rejects.toThrow();
    });
  });

  describe('handleGetQuestionnaire', () => {
    it('should return questionnaire with status 200', async () => {
      const now = new Date();
      const questionnaire = { ...sampleQuestionnaire, version: 2, createdAt: now };
      mockRepo.findById.mockResolvedValue(questionnaire);

      const result = await handleGetQuestionnaire(mockRepo as any, 'onboarding');

      expect(result.status).toBe(200);
      expect(result.data.questionnaire).toEqual(questionnaire);
      expect(mockRepo.findById).toHaveBeenCalledWith('onboarding');
    });

    it('should throw NotFoundError if questionnaire does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        handleGetQuestionnaire(mockRepo as any, 'nonexistent')
      ).rejects.toThrow(NotFoundError);
      await expect(
        handleGetQuestionnaire(mockRepo as any, 'nonexistent')
      ).rejects.toThrow('Questionnaire with id "nonexistent" not found');
    });
  });

  describe('handleGetQuestionnaireVersion', () => {
    it('should return specific version with status 200', async () => {
      const now = new Date();
      const questionnaire = { ...sampleQuestionnaire, version: 1, createdAt: now };
      mockRepo.findByIdAndVersion.mockResolvedValue(questionnaire);

      const result = await handleGetQuestionnaireVersion(
        mockRepo as any,
        'onboarding',
        1
      );

      expect(result.status).toBe(200);
      expect(result.data.questionnaire).toEqual(questionnaire);
      expect(mockRepo.findByIdAndVersion).toHaveBeenCalledWith('onboarding', 1);
    });

    it('should throw NotFoundError if version does not exist', async () => {
      mockRepo.findByIdAndVersion.mockResolvedValue(null);

      await expect(
        handleGetQuestionnaireVersion(mockRepo as any, 'onboarding', 99)
      ).rejects.toThrow(NotFoundError);
      await expect(
        handleGetQuestionnaireVersion(mockRepo as any, 'onboarding', 99)
      ).rejects.toThrow('Questionnaire with id "onboarding" version 99 not found');
    });
  });

  describe('handleUpdateQuestionnaire', () => {
    it('should update questionnaire and return 200', async () => {
      const now = new Date();
      const updated = { ...sampleQuestionnaire, version: 2, createdAt: now, metadata: {} };
      mockRepo.update.mockResolvedValue(updated);

      const result = await handleUpdateQuestionnaire(
        mockRepo as any,
        'onboarding',
        sampleQuestionnaire
      );

      expect(result.status).toBe(200);
      expect(result.data.questionnaire).toEqual(updated);
      expect(mockRepo.update).toHaveBeenCalledWith(
        'onboarding',
        expect.objectContaining({
          id: sampleQuestionnaire.id,
          title: sampleQuestionnaire.title,
          description: sampleQuestionnaire.description,
        }),
        { metadata: undefined }
      );
    });

    it('should override ID in body with URL parameter', async () => {
      const now = new Date();
      const bodyWithDifferentId = { ...sampleQuestionnaire, id: 'different' };
      const updated = { ...sampleQuestionnaire, version: 2, createdAt: now, metadata: {} };
      mockRepo.update.mockResolvedValue(updated);

      await handleUpdateQuestionnaire(mockRepo as any, 'onboarding', bodyWithDifferentId);

      expect(mockRepo.update).toHaveBeenCalledWith(
        'onboarding',
        expect.objectContaining({ id: 'onboarding' }),
        { metadata: undefined }
      );
    });

    it('should validate questionnaire definition before updating', async () => {
      const invalidQuestionnaire = {
        id: 'onboarding',
        title: 'Test',
        questions: [
          {
            id: 'q1',
            type: 'text',
            label: 'Question 1',
            visibleIf: { all: [{ questionId: 'q1', operator: 'equals', value: 'test' }] },
          },
        ],
      };

      await expect(
        handleUpdateQuestionnaire(mockRepo as any, 'onboarding', invalidQuestionnaire)
      ).rejects.toThrow();
    });
  });

  describe('handleListQuestionnaires', () => {
    it('should return list of questionnaires with status 200', async () => {
      const questionnaires = [
        { id: 'onboarding', title: 'Onboarding', latestVersion: 2, createdAt: new Date() },
        { id: 'feedback', title: 'Feedback', latestVersion: 1, createdAt: new Date() },
      ];
      mockRepo.list.mockResolvedValue(questionnaires);

      const result = await handleListQuestionnaires(mockRepo as any);

      expect(result.status).toBe(200);
      expect(result.data.questionnaires).toEqual(questionnaires);
      expect(mockRepo.list).toHaveBeenCalled();
    });

    it('should return empty array if no questionnaires exist', async () => {
      mockRepo.list.mockResolvedValue([]);

      const result = await handleListQuestionnaires(mockRepo as any);

      expect(result.status).toBe(200);
      expect(result.data.questionnaires).toEqual([]);
    });
  });

  describe('handleListVersions', () => {
    it('should return list of versions with status 200', async () => {
      const versions = [
        { version: 1, createdAt: new Date('2024-01-01') },
        { version: 2, createdAt: new Date('2024-01-02') },
      ];
      mockRepo.findById.mockResolvedValue({ ...sampleQuestionnaire, version: 2, createdAt: new Date() });
      mockRepo.listVersions.mockResolvedValue(versions);

      const result = await handleListVersions(mockRepo as any, 'onboarding');

      expect(result.status).toBe(200);
      expect(result.data.versions).toEqual(versions);
      expect(mockRepo.listVersions).toHaveBeenCalledWith('onboarding');
    });

    it('should throw NotFoundError if questionnaire does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        handleListVersions(mockRepo as any, 'nonexistent')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('handleValidateAnswers', () => {
    it('should return valid: true for valid answers', async () => {
      const now = new Date();
      const questionnaire = { ...sampleQuestionnaire, version: 1, createdAt: now };
      mockRepo.findById.mockResolvedValue(questionnaire);

      const result = await handleValidateAnswers(mockRepo as any, 'onboarding', {
        answers: {
          name: 'John Doe',
          department: 'eng',
        },
      });

      expect(result.status).toBe(200);
      expect(result.data.valid).toBe(true);
      expect(result.data.errors).toBeUndefined();
    });

    it('should return valid: false with errors for invalid answers', async () => {
      const now = new Date();
      const questionnaire = { ...sampleQuestionnaire, version: 1, createdAt: now };
      mockRepo.findById.mockResolvedValue(questionnaire);

      const result = await handleValidateAnswers(mockRepo as any, 'onboarding', {
        answers: {
          name: '',
          department: 'invalid',
        },
      });

      expect(result.status).toBe(200);
      expect(result.data.valid).toBe(false);
      expect(result.data.errors).toBeDefined();
      expect(result.data.errors).toHaveLength(2);
    });

    it('should validate against specific version when provided', async () => {
      const now = new Date();
      const questionnaire = { ...sampleQuestionnaire, version: 2, createdAt: now };
      mockRepo.findByIdAndVersion.mockResolvedValue(questionnaire);

      await handleValidateAnswers(mockRepo as any, 'onboarding', {
        version: 2,
        answers: { name: 'John Doe', department: 'eng' },
      });

      expect(mockRepo.findByIdAndVersion).toHaveBeenCalledWith('onboarding', 2);
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if questionnaire does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        handleValidateAnswers(mockRepo as any, 'nonexistent', {
          answers: {},
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if version does not exist', async () => {
      mockRepo.findByIdAndVersion.mockResolvedValue(null);

      await expect(
        handleValidateAnswers(mockRepo as any, 'onboarding', {
          version: 99,
          answers: {},
        })
      ).rejects.toThrow(NotFoundError);
      await expect(
        handleValidateAnswers(mockRepo as any, 'onboarding', {
          version: 99,
          answers: {},
        })
      ).rejects.toThrow('Questionnaire with id "onboarding" version 99 not found');
    });
  });

  describe('handleGetVisibleQuestions', () => {
    const questionnaireWithConditionals: QuestionnaireDefinition = {
      id: 'conditional',
      title: 'Conditional Form',
      questions: [
        {
          id: 'hasJob',
          type: 'choice',
          label: 'Do you have a job?',
          required: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
        },
        {
          id: 'company',
          type: 'text',
          label: 'Company Name',
          visibleIf: {
            all: [{ questionId: 'hasJob', operator: 'equals', value: 'yes' }],
          },
        },
      ],
    };

    it('should return visible questions based on answers', async () => {
      const now = new Date();
      const questionnaire = { ...questionnaireWithConditionals, version: 1, createdAt: now };
      mockRepo.findById.mockResolvedValue(questionnaire);

      const result = await handleGetVisibleQuestions(mockRepo as any, 'conditional', {
        answers: { hasJob: 'yes' },
      });

      expect(result.status).toBe(200);
      expect(result.data.questions).toHaveLength(2);
      expect(result.data.questions[0].id).toBe('hasJob');
      expect(result.data.questions[1].id).toBe('company');
    });

    it('should hide questions based on conditions', async () => {
      const now = new Date();
      const questionnaire = { ...questionnaireWithConditionals, version: 1, createdAt: now };
      mockRepo.findById.mockResolvedValue(questionnaire);

      const result = await handleGetVisibleQuestions(mockRepo as any, 'conditional', {
        answers: { hasJob: 'no' },
      });

      expect(result.status).toBe(200);
      expect(result.data.questions).toHaveLength(1);
      expect(result.data.questions[0].id).toBe('hasJob');
    });

    it('should work with specific version when provided', async () => {
      const now = new Date();
      const questionnaire = { ...questionnaireWithConditionals, version: 3, createdAt: now };
      mockRepo.findByIdAndVersion.mockResolvedValue(questionnaire);

      await handleGetVisibleQuestions(mockRepo as any, 'conditional', {
        version: 3,
        answers: { hasJob: 'yes' },
      });

      expect(mockRepo.findByIdAndVersion).toHaveBeenCalledWith('conditional', 3);
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if questionnaire does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        handleGetVisibleQuestions(mockRepo as any, 'nonexistent', {
          answers: {},
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
