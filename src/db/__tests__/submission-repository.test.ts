import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSubmissionRepository } from '../submission-repository.js';
import type { AnswerPayload } from '../../schemas/index.js';
import { NotFoundError } from '../../errors/index.js';

describe('SubmissionRepository', () => {
  const mockPool = {
    query: vi.fn(),
  };

  const sampleAnswers: AnswerPayload = {
    name: 'John Doe',
    age: '30',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new submission', async () => {
      const now = new Date();
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: submissionId,
            questionnaire_id: 'onboarding',
            questionnaire_version: 1,
            answers: sampleAnswers,
            metadata: {},
            created_at: now,
          },
        ],
      });

      const repo = createSubmissionRepository(mockPool as any);
      const result = await repo.create('onboarding', 1, sampleAnswers);

      expect(result).toEqual({
        id: submissionId,
        questionnaireId: 'onboarding',
        questionnaireVersion: 1,
        answers: sampleAnswers,
        metadata: {},
        createdAt: now,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO submissions'),
        ['onboarding', 1, JSON.stringify(sampleAnswers), '{}']
      );
    });

    it('should throw NotFoundError if questionnaire version does not exist', async () => {
      mockPool.query.mockRejectedValue({ code: '23503' }); // Foreign key violation

      const repo = createSubmissionRepository(mockPool as any);

      await expect(
        repo.create('nonexistent', 1, sampleAnswers)
      ).rejects.toThrow(NotFoundError);
      await expect(
        repo.create('nonexistent', 1, sampleAnswers)
      ).rejects.toThrow('Questionnaire "nonexistent" version 1 not found');
    });

    it('should rethrow other errors', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockPool.query.mockRejectedValue(unexpectedError);

      const repo = createSubmissionRepository(mockPool as any);

      await expect(
        repo.create('onboarding', 1, sampleAnswers)
      ).rejects.toThrow(unexpectedError);
    });

    it('should handle JSONB serialization of answers', async () => {
      const complexAnswers = {
        preferences: ['option1', 'option2'],
        extraData: { source: 'web', timestamp: 1234567890 },
      };

      const now = new Date();
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: submissionId,
            questionnaire_id: 'onboarding',
            questionnaire_version: 1,
            answers: complexAnswers,
            metadata: {},
            created_at: now,
          },
        ],
      });

      const repo = createSubmissionRepository(mockPool as any);
      const result = await repo.create('onboarding', 1, complexAnswers);

      expect(result.answers).toEqual(complexAnswers);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['onboarding', 1, JSON.stringify(complexAnswers), '{}']
      );
    });
  });

  describe('findById', () => {
    it('should return a submission by ID', async () => {
      const now = new Date();
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: submissionId,
            questionnaire_id: 'onboarding',
            questionnaire_version: 1,
            answers: sampleAnswers,
            metadata: { source: 'test' },
            created_at: now,
          },
        ],
      });

      const repo = createSubmissionRepository(mockPool as any);
      const result = await repo.findById(submissionId);

      expect(result).toEqual({
        id: submissionId,
        questionnaireId: 'onboarding',
        questionnaireVersion: 1,
        answers: sampleAnswers,
        metadata: { source: 'test' },
        createdAt: now,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [submissionId]
      );
    });

    it('should return null if submission not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const repo = createSubmissionRepository(mockPool as any);
      const result = await repo.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('listByQuestionnaire', () => {
    it('should return paginated submissions for a questionnaire', async () => {
      const date1 = new Date('2024-01-03');
      const date2 = new Date('2024-01-02');
      const date3 = new Date('2024-01-01');

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '15' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'sub-1',
              questionnaire_id: 'onboarding',
              questionnaire_version: 1,
              answers: { name: 'John' },
              metadata: {},
              created_at: date1,
            },
            {
              id: 'sub-2',
              questionnaire_id: 'onboarding',
              questionnaire_version: 1,
              answers: { name: 'Jane' },
              metadata: {},
              created_at: date2,
            },
            {
              id: 'sub-3',
              questionnaire_id: 'onboarding',
              questionnaire_version: 2,
              answers: { name: 'Bob' },
              metadata: {},
              created_at: date3,
            },
          ],
        });

      const repo = createSubmissionRepository(mockPool as any);
      const result = await repo.listByQuestionnaire('onboarding');

      expect(result).toEqual({
        items: [
          {
            id: 'sub-1',
            questionnaireId: 'onboarding',
            questionnaireVersion: 1,
            answers: { name: 'John' },
            metadata: {},
            createdAt: date1,
          },
          {
            id: 'sub-2',
            questionnaireId: 'onboarding',
            questionnaireVersion: 1,
            answers: { name: 'Jane' },
            metadata: {},
            createdAt: date2,
          },
          {
            id: 'sub-3',
            questionnaireId: 'onboarding',
            questionnaireVersion: 2,
            answers: { name: 'Bob' },
            metadata: {},
            createdAt: date3,
          },
        ],
        total: 15,
        limit: 50,
        offset: 0,
      });

      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT COUNT(*) as total'),
        ['onboarding']
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('ORDER BY created_at DESC'),
        ['onboarding', 50, 0]
      );
    });

    it('should filter by version when specified', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '5' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'sub-1',
              questionnaire_id: 'onboarding',
              questionnaire_version: 2,
              answers: { name: 'John' },
              created_at: new Date(),
            },
          ],
        });

      const repo = createSubmissionRepository(mockPool as any);
      const result = await repo.listByQuestionnaire('onboarding', {
        version: 2,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].questionnaireVersion).toBe(2);
      expect(result.total).toBe(5);

      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('questionnaire_version = $2'),
        ['onboarding', 2]
      );
    });

    it('should support custom limit and offset', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '100' }],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      const repo = createSubmissionRepository(mockPool as any);
      await repo.listByQuestionnaire('onboarding', {
        limit: 10,
        offset: 20,
      });

      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['onboarding', 10, 20]
      );
    });

    it('should use default limit of 50 and offset of 0', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '100' }],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      const repo = createSubmissionRepository(mockPool as any);
      const result = await repo.listByQuestionnaire('onboarding');

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should combine version filter with pagination', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '25' }],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      const repo = createSubmissionRepository(mockPool as any);
      await repo.listByQuestionnaire('onboarding', {
        version: 3,
        limit: 20,
        offset: 10,
      });

      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('questionnaire_version = $2'),
        ['onboarding', 3]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('questionnaire_version = $2'),
        ['onboarding', 3, 20, 10]
      );
    });

    it('should return empty items array when no submissions found', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '0' }],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      const repo = createSubmissionRepository(mockPool as any);
      const result = await repo.listByQuestionnaire('nonexistent');

      expect(result).toEqual({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });
    });

    it('should order submissions by created_at descending (newest first)', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const date3 = new Date('2024-01-03');

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '3' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'sub-3',
              questionnaire_id: 'onboarding',
              questionnaire_version: 1,
              answers: {},
              created_at: date3, // Newest
            },
            {
              id: 'sub-2',
              questionnaire_id: 'onboarding',
              questionnaire_version: 1,
              answers: {},
              created_at: date2,
            },
            {
              id: 'sub-1',
              questionnaire_id: 'onboarding',
              questionnaire_version: 1,
              answers: {},
              created_at: date1, // Oldest
            },
          ],
        });

      const repo = createSubmissionRepository(mockPool as any);
      const result = await repo.listByQuestionnaire('onboarding');

      expect(result.items[0].createdAt).toEqual(date3);
      expect(result.items[1].createdAt).toEqual(date2);
      expect(result.items[2].createdAt).toEqual(date1);

      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });
  });
});
