import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleSubmitAnswers,
  handleGetSubmission,
  handleListSubmissions,
  handleUpdateSubmission,
  handleDeleteSubmission,
} from '../submission.js';
import type { QuestionnaireDefinition } from '../../../schemas/index.js';
import { NotFoundError, ValidationError } from '../../../errors/index.js';

describe('Submission Handlers', () => {
  const mockQuestionnaireRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndVersion: vi.fn(),
    update: vi.fn(),
    listVersions: vi.fn(),
    list: vi.fn(),
  };

  const mockSubmissionRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    listByQuestionnaire: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  };

  const sampleQuestionnaire: QuestionnaireDefinition = {
    id: 'onboarding',
    title: 'Employee Onboarding',
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

  describe('handleSubmitAnswers', () => {
    it('should submit valid answers and return 201', async () => {
      const now = new Date();
      const questionnaire = { ...sampleQuestionnaire, version: 1, createdAt: now, metadata: {} };
      const answers = { name: 'John Doe', department: 'eng' };
      const submission = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        questionnaireId: 'onboarding',
        questionnaireVersion: 1,
        answers,
        metadata: {},
        createdAt: now,
      };

      mockQuestionnaireRepo.findById.mockResolvedValue(questionnaire);
      mockSubmissionRepo.create.mockResolvedValue(submission);

      const result = await handleSubmitAnswers(
        mockQuestionnaireRepo as any,
        mockSubmissionRepo as any,
        'onboarding',
        { answers }
      );

      expect(result.status).toBe(201);
      expect(result.data.submission).toEqual(submission);
      expect(mockSubmissionRepo.create).toHaveBeenCalledWith('onboarding', 1, answers, { metadata: undefined });
    });

    it('should submit to specific version when provided', async () => {
      const now = new Date();
      const questionnaire = { ...sampleQuestionnaire, version: 2, createdAt: now, metadata: {} };
      const answers = { name: 'John Doe', department: 'eng' };
      const submission = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        questionnaireId: 'onboarding',
        questionnaireVersion: 2,
        answers,
        metadata: {},
        createdAt: now,
      };

      mockQuestionnaireRepo.findByIdAndVersion.mockResolvedValue(questionnaire);
      mockSubmissionRepo.create.mockResolvedValue(submission);

      const result = await handleSubmitAnswers(
        mockQuestionnaireRepo as any,
        mockSubmissionRepo as any,
        'onboarding',
        { version: 2, answers }
      );

      expect(result.status).toBe(201);
      expect(mockQuestionnaireRepo.findByIdAndVersion).toHaveBeenCalledWith('onboarding', 2);
      expect(mockSubmissionRepo.create).toHaveBeenCalledWith('onboarding', 2, answers, { metadata: undefined });
    });

    it('should throw NotFoundError if questionnaire does not exist', async () => {
      mockQuestionnaireRepo.findById.mockResolvedValue(null);

      await expect(
        handleSubmitAnswers(
          mockQuestionnaireRepo as any,
          mockSubmissionRepo as any,
          'nonexistent',
          { answers: {} }
        )
      ).rejects.toThrow(NotFoundError);
      await expect(
        handleSubmitAnswers(
          mockQuestionnaireRepo as any,
          mockSubmissionRepo as any,
          'nonexistent',
          { answers: {} }
        )
      ).rejects.toThrow('Questionnaire with id "nonexistent" not found');
    });

    it('should throw NotFoundError if version does not exist', async () => {
      mockQuestionnaireRepo.findByIdAndVersion.mockResolvedValue(null);

      await expect(
        handleSubmitAnswers(
          mockQuestionnaireRepo as any,
          mockSubmissionRepo as any,
          'onboarding',
          { version: 99, answers: {} }
        )
      ).rejects.toThrow(NotFoundError);
      await expect(
        handleSubmitAnswers(
          mockQuestionnaireRepo as any,
          mockSubmissionRepo as any,
          'onboarding',
          { version: 99, answers: {} }
        )
      ).rejects.toThrow('Questionnaire with id "onboarding" version 99 not found');
    });

    it('should throw ValidationError for invalid answers', async () => {
      const now = new Date();
      const questionnaire = { ...sampleQuestionnaire, version: 1, createdAt: now };
      mockQuestionnaireRepo.findById.mockResolvedValue(questionnaire);

      await expect(
        handleSubmitAnswers(
          mockQuestionnaireRepo as any,
          mockSubmissionRepo as any,
          'onboarding',
          { answers: { name: '', department: 'invalid' } }
        )
      ).rejects.toThrow(ValidationError);
      await expect(
        handleSubmitAnswers(
          mockQuestionnaireRepo as any,
          mockSubmissionRepo as any,
          'onboarding',
          { answers: { name: '', department: 'invalid' } }
        )
      ).rejects.toThrow('Answer validation failed');

      expect(mockSubmissionRepo.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for missing required fields', async () => {
      const now = new Date();
      const questionnaire = { ...sampleQuestionnaire, version: 1, createdAt: now };
      mockQuestionnaireRepo.findById.mockResolvedValue(questionnaire);

      await expect(
        handleSubmitAnswers(
          mockQuestionnaireRepo as any,
          mockSubmissionRepo as any,
          'onboarding',
          { answers: {} }
        )
      ).rejects.toThrow(ValidationError);

      expect(mockSubmissionRepo.create).not.toHaveBeenCalled();
    });

    it('should validate against visible questions only', async () => {
      const conditionalQuestionnaire: QuestionnaireDefinition = {
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
            required: true,
            visibleIf: {
              all: [{ questionId: 'hasJob', operator: 'equals', value: 'yes' }],
            },
          },
        ],
      };

      const now = new Date();
      const questionnaire = { ...conditionalQuestionnaire, version: 1, createdAt: now };
      const answers = { hasJob: 'no' };
      const submission = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        questionnaireId: 'conditional',
        questionnaireVersion: 1,
        answers,
        createdAt: now,
      };

      mockQuestionnaireRepo.findById.mockResolvedValue(questionnaire);
      mockSubmissionRepo.create.mockResolvedValue(submission);

      // Should succeed even though 'company' is required but not visible
      const result = await handleSubmitAnswers(
        mockQuestionnaireRepo as any,
        mockSubmissionRepo as any,
        'conditional',
        { answers }
      );

      expect(result.status).toBe(201);
      expect(mockSubmissionRepo.create).toHaveBeenCalled();
    });
  });

  describe('handleGetSubmission', () => {
    it('should return submission with status 200', async () => {
      const submission = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        questionnaireId: 'onboarding',
        questionnaireVersion: 1,
        answers: { name: 'John Doe', department: 'eng' },
        createdAt: new Date(),
      };
      mockSubmissionRepo.findById.mockResolvedValue(submission);

      const result = await handleGetSubmission(
        mockSubmissionRepo as any,
        '123e4567-e89b-12d3-a456-426614174000'
      );

      expect(result.status).toBe(200);
      expect(result.data.submission).toEqual(submission);
      expect(mockSubmissionRepo.findById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000'
      );
    });

    it('should throw NotFoundError if submission does not exist', async () => {
      mockSubmissionRepo.findById.mockResolvedValue(null);

      await expect(
        handleGetSubmission(mockSubmissionRepo as any, 'nonexistent-id')
      ).rejects.toThrow(NotFoundError);
      await expect(
        handleGetSubmission(mockSubmissionRepo as any, 'nonexistent-id')
      ).rejects.toThrow('Submission with id "nonexistent-id" not found');
    });
  });

  describe('handleListSubmissions', () => {
    it('should return paginated submissions with default options', async () => {
      const submissions = [
        {
          id: 'sub-1',
          questionnaireId: 'onboarding',
          questionnaireVersion: 1,
          answers: { name: 'John' },
          createdAt: new Date(),
        },
        {
          id: 'sub-2',
          questionnaireId: 'onboarding',
          questionnaireVersion: 1,
          answers: { name: 'Jane' },
          createdAt: new Date(),
        },
      ];
      const result = {
        items: submissions,
        total: 15,
        limit: 50,
        offset: 0,
      };
      mockSubmissionRepo.listByQuestionnaire.mockResolvedValue(result);

      const response = await handleListSubmissions(
        mockSubmissionRepo as any,
        'onboarding',
        {}
      );

      expect(response.status).toBe(200);
      expect(response.data.submissions).toEqual(submissions);
      expect(response.data.total).toBe(15);
      expect(response.data.limit).toBe(50);
      expect(response.data.offset).toBe(0);
      expect(mockSubmissionRepo.listByQuestionnaire).toHaveBeenCalledWith('onboarding', {
        version: undefined,
        limit: undefined,
        offset: undefined,
      });
    });

    it('should filter by version when provided', async () => {
      const submissions = [
        {
          id: 'sub-1',
          questionnaireId: 'onboarding',
          questionnaireVersion: 2,
          answers: { name: 'John' },
          createdAt: new Date(),
        },
      ];
      const result = {
        items: submissions,
        total: 5,
        limit: 50,
        offset: 0,
      };
      mockSubmissionRepo.listByQuestionnaire.mockResolvedValue(result);

      const response = await handleListSubmissions(
        mockSubmissionRepo as any,
        'onboarding',
        { version: '2' }
      );

      expect(response.status).toBe(200);
      expect(mockSubmissionRepo.listByQuestionnaire).toHaveBeenCalledWith('onboarding', {
        version: 2,
        limit: undefined,
        offset: undefined,
      });
    });

    it('should support custom limit and offset', async () => {
      const result = {
        items: [],
        total: 100,
        limit: 10,
        offset: 20,
      };
      mockSubmissionRepo.listByQuestionnaire.mockResolvedValue(result);

      const response = await handleListSubmissions(
        mockSubmissionRepo as any,
        'onboarding',
        { limit: '10', offset: '20' }
      );

      expect(response.status).toBe(200);
      expect(response.data.limit).toBe(10);
      expect(response.data.offset).toBe(20);
      expect(mockSubmissionRepo.listByQuestionnaire).toHaveBeenCalledWith('onboarding', {
        version: undefined,
        limit: 10,
        offset: 20,
      });
    });

    it('should throw ValidationError for invalid version parameter', async () => {
      await expect(
        handleListSubmissions(mockSubmissionRepo as any, 'onboarding', {
          version: 'invalid',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        handleListSubmissions(mockSubmissionRepo as any, 'onboarding', {
          version: 'invalid',
        })
      ).rejects.toThrow('Invalid version parameter');
    });

    it('should throw ValidationError for invalid limit parameter', async () => {
      await expect(
        handleListSubmissions(mockSubmissionRepo as any, 'onboarding', {
          limit: 'invalid',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        handleListSubmissions(mockSubmissionRepo as any, 'onboarding', {
          limit: 'invalid',
        })
      ).rejects.toThrow('Invalid limit parameter');
    });

    it('should throw ValidationError for invalid offset parameter', async () => {
      await expect(
        handleListSubmissions(mockSubmissionRepo as any, 'onboarding', {
          offset: 'invalid',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        handleListSubmissions(mockSubmissionRepo as any, 'onboarding', {
          offset: 'invalid',
        })
      ).rejects.toThrow('Invalid offset parameter');
    });

    it('should combine version filter with pagination', async () => {
      const result = {
        items: [],
        total: 25,
        limit: 20,
        offset: 10,
      };
      mockSubmissionRepo.listByQuestionnaire.mockResolvedValue(result);

      await handleListSubmissions(mockSubmissionRepo as any, 'onboarding', {
        version: '3',
        limit: '20',
        offset: '10',
      });

      expect(mockSubmissionRepo.listByQuestionnaire).toHaveBeenCalledWith('onboarding', {
        version: 3,
        limit: 20,
        offset: 10,
      });
    });

    it('should return empty submissions array when none exist', async () => {
      const result = {
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      };
      mockSubmissionRepo.listByQuestionnaire.mockResolvedValue(result);

      const response = await handleListSubmissions(
        mockSubmissionRepo as any,
        'onboarding',
        {}
      );

      expect(response.status).toBe(200);
      expect(response.data.submissions).toEqual([]);
      expect(response.data.total).toBe(0);
    });
  });

  describe('handleUpdateSubmission', () => {
    it('should update submission answers and return 200', async () => {
      const now = new Date();
      const questionnaire = { ...sampleQuestionnaire, version: 1, createdAt: now, metadata: {} };
      const existingSubmission = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        questionnaireId: 'onboarding',
        questionnaireVersion: 1,
        answers: { name: 'John Doe', department: 'eng' },
        metadata: {},
        createdAt: now,
        updatedAt: null,
        deletedAt: null,
      };
      const updatedAnswers = { name: 'Jane Doe', department: 'sales' };
      const updatedSubmission = {
        ...existingSubmission,
        answers: updatedAnswers,
        updatedAt: now,
      };

      mockSubmissionRepo.findById.mockResolvedValue(existingSubmission);
      mockQuestionnaireRepo.findByIdAndVersion.mockResolvedValue(questionnaire);
      mockSubmissionRepo.update.mockResolvedValue(updatedSubmission);

      const result = await handleUpdateSubmission(
        mockQuestionnaireRepo as any,
        mockSubmissionRepo as any,
        '123e4567-e89b-12d3-a456-426614174000',
        { answers: updatedAnswers }
      );

      expect(result.status).toBe(200);
      expect(result.data.submission.answers).toEqual(updatedAnswers);
      expect(mockSubmissionRepo.update).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        { answers: updatedAnswers, metadata: undefined }
      );
    });

    it('should update submission metadata only', async () => {
      const now = new Date();
      const existingSubmission = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        questionnaireId: 'onboarding',
        questionnaireVersion: 1,
        answers: { name: 'John Doe', department: 'eng' },
        metadata: {},
        createdAt: now,
        updatedAt: null,
        deletedAt: null,
      };
      const updatedMetadata = { source: 'updated', tag: 'test' };
      const updatedSubmission = {
        ...existingSubmission,
        metadata: updatedMetadata,
        updatedAt: now,
      };

      mockSubmissionRepo.findById.mockResolvedValue(existingSubmission);
      mockSubmissionRepo.update.mockResolvedValue(updatedSubmission);

      const result = await handleUpdateSubmission(
        mockQuestionnaireRepo as any,
        mockSubmissionRepo as any,
        '123e4567-e89b-12d3-a456-426614174000',
        { metadata: updatedMetadata }
      );

      expect(result.status).toBe(200);
      expect(result.data.submission.metadata).toEqual(updatedMetadata);
      // Should not fetch questionnaire when only updating metadata
      expect(mockQuestionnaireRepo.findByIdAndVersion).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if submission does not exist', async () => {
      mockSubmissionRepo.findById.mockResolvedValue(null);

      await expect(
        handleUpdateSubmission(
          mockQuestionnaireRepo as any,
          mockSubmissionRepo as any,
          'nonexistent-id',
          { answers: {} }
        )
      ).rejects.toThrow(NotFoundError);
      await expect(
        handleUpdateSubmission(
          mockQuestionnaireRepo as any,
          mockSubmissionRepo as any,
          'nonexistent-id',
          { answers: {} }
        )
      ).rejects.toThrow('Submission with id "nonexistent-id" not found');
    });

    it('should throw ValidationError for invalid answers', async () => {
      const now = new Date();
      const questionnaire = { ...sampleQuestionnaire, version: 1, createdAt: now, metadata: {} };
      const existingSubmission = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        questionnaireId: 'onboarding',
        questionnaireVersion: 1,
        answers: { name: 'John Doe', department: 'eng' },
        metadata: {},
        createdAt: now,
        updatedAt: null,
        deletedAt: null,
      };

      mockSubmissionRepo.findById.mockResolvedValue(existingSubmission);
      mockQuestionnaireRepo.findByIdAndVersion.mockResolvedValue(questionnaire);

      await expect(
        handleUpdateSubmission(
          mockQuestionnaireRepo as any,
          mockSubmissionRepo as any,
          '123e4567-e89b-12d3-a456-426614174000',
          { answers: { name: '', department: 'invalid' } }
        )
      ).rejects.toThrow(ValidationError);

      expect(mockSubmissionRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteSubmission', () => {
    it('should soft delete submission and return 200', async () => {
      mockSubmissionRepo.softDelete.mockResolvedValue(undefined);

      const result = await handleDeleteSubmission(
        mockSubmissionRepo as any,
        '123e4567-e89b-12d3-a456-426614174000'
      );

      expect(result.status).toBe(200);
      expect(result.data.message).toBe('Submission deleted successfully');
      expect(mockSubmissionRepo.softDelete).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000'
      );
    });

    it('should throw NotFoundError if submission does not exist', async () => {
      mockSubmissionRepo.softDelete.mockRejectedValue(
        new NotFoundError('Submission "nonexistent-id" not found')
      );

      await expect(
        handleDeleteSubmission(mockSubmissionRepo as any, 'nonexistent-id')
      ).rejects.toThrow(NotFoundError);
      await expect(
        handleDeleteSubmission(mockSubmissionRepo as any, 'nonexistent-id')
      ).rejects.toThrow('Submission "nonexistent-id" not found');
    });
  });
});
