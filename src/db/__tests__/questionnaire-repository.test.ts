import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQuestionnaireRepository } from '../questionnaire-repository.js';
import type { QuestionnaireDefinition } from '../../schemas/index.js';
import { NotFoundError, ConflictError } from '../../errors/index.js';

describe('QuestionnaireRepository', () => {
  const mockPool = {
    query: vi.fn(),
    connect: vi.fn(),
  };

  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
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
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new questionnaire with version 1', async () => {
      const now = new Date();
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // INSERT questionnaires
        .mockResolvedValueOnce({
          rows: [{ version: 1, created_at: now, metadata: {} }],
        }) // INSERT version
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const repo = createQuestionnaireRepository(mockPool as any);
      const result = await repo.create(sampleQuestionnaire);

      expect(result).toEqual({
        ...sampleQuestionnaire,
        version: 1,
        createdAt: now,
        metadata: {},
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO questionnaires (id, created_at, updated_at) VALUES ($1, NOW(), NOW())',
        ['onboarding']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw ConflictError if questionnaire already exists', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce({ code: '23505' }); // Duplicate key error

      const repo = createQuestionnaireRepository(mockPool as any);

      try {
        await repo.create(sampleQuestionnaire);
        expect.fail('Should have thrown ConflictError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ConflictError);
        expect(error.message).toBe('Questionnaire with id "onboarding" already exists');
      }

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback and rethrow on unexpected error', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(unexpectedError);

      const repo = createQuestionnaireRepository(mockPool as any);

      await expect(repo.create(sampleQuestionnaire)).rejects.toThrow(
        unexpectedError
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return the latest version of a questionnaire', async () => {
      const now = new Date();
      mockPool.query.mockResolvedValue({
        rows: [
          {
            definition: sampleQuestionnaire,
            version: 2,
            created_at: now,
            metadata: { source: 'test' },
          },
        ],
      });

      const repo = createQuestionnaireRepository(mockPool as any);
      const result = await repo.findById('onboarding');

      expect(result).toEqual({
        ...sampleQuestionnaire,
        version: 2,
        createdAt: now,
        metadata: { source: 'test' },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY version DESC'),
        ['onboarding']
      );
    });

    it('should return null if questionnaire not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const repo = createQuestionnaireRepository(mockPool as any);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByIdAndVersion', () => {
    it('should return a specific version of a questionnaire', async () => {
      const now = new Date();
      mockPool.query.mockResolvedValue({
        rows: [
          {
            definition: sampleQuestionnaire,
            version: 1,
            created_at: now,
            metadata: {},
          },
        ],
      });

      const repo = createQuestionnaireRepository(mockPool as any);
      const result = await repo.findByIdAndVersion('onboarding', 1);

      expect(result).toEqual({
        ...sampleQuestionnaire,
        version: 1,
        createdAt: now,
        metadata: {},
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE questionnaire_id = $1 AND version = $2'),
        ['onboarding', 1]
      );
    });

    it('should return null if version not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const repo = createQuestionnaireRepository(mockPool as any);
      const result = await repo.findByIdAndVersion('onboarding', 99);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should create a new version with incremented version number', async () => {
      const now = new Date();
      const updatedDefinition: QuestionnaireDefinition = {
        ...sampleQuestionnaire,
        title: 'Updated Title',
      };

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'onboarding' }] }) // Check exists
        .mockResolvedValueOnce({ rows: [{ max_version: 2 }] }) // Get max version
        .mockResolvedValueOnce({
          rows: [{ version: 3, created_at: now, metadata: {} }],
        }) // INSERT new version
        .mockResolvedValueOnce({ rows: [] }) // UPDATE updated_at
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const repo = createQuestionnaireRepository(mockPool as any);
      const result = await repo.update('onboarding', updatedDefinition);

      expect(result).toEqual({
        ...updatedDefinition,
        id: 'onboarding',
        version: 3,
        createdAt: now,
        metadata: {},
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw NotFoundError if questionnaire does not exist', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Check exists - returns empty

      const repo = createQuestionnaireRepository(mockPool as any);

      try {
        await repo.update('nonexistent', sampleQuestionnaire);
        expect.fail('Should have thrown NotFoundError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.message).toBe('Questionnaire with id "nonexistent" not found');
      }

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle first version update (max_version is null)', async () => {
      const now = new Date();
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'onboarding' }] }) // Check exists
        .mockResolvedValueOnce({ rows: [{ max_version: null }] }) // No versions yet
        .mockResolvedValueOnce({
          rows: [{ version: 1, created_at: now }],
        }) // INSERT version 1
        .mockResolvedValueOnce({ rows: [] }) // UPDATE updated_at
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const repo = createQuestionnaireRepository(mockPool as any);
      const result = await repo.update('onboarding', sampleQuestionnaire);

      expect(result.version).toBe(1);
    });
  });

  describe('listVersions', () => {
    it('should return all versions metadata for a questionnaire', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const date3 = new Date('2024-01-03');

      mockPool.query.mockResolvedValue({
        rows: [
          { version: 1, created_at: date1 },
          { version: 2, created_at: date2 },
          { version: 3, created_at: date3 },
        ],
      });

      const repo = createQuestionnaireRepository(mockPool as any);
      const result = await repo.listVersions('onboarding');

      expect(result).toEqual([
        { version: 1, createdAt: date1 },
        { version: 2, createdAt: date2 },
        { version: 3, createdAt: date3 },
      ]);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY version ASC'),
        ['onboarding']
      );
    });

    it('should return empty array if no versions found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const repo = createQuestionnaireRepository(mockPool as any);
      const result = await repo.listVersions('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('list', () => {
    it('should return all questionnaires with their latest versions', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 'onboarding',
            title: 'Employee Onboarding',
            latest_version: 3,
            created_at: date1,
          },
          {
            id: 'feedback',
            title: 'Feedback Form',
            latest_version: 1,
            created_at: date2,
          },
        ],
      });

      const repo = createQuestionnaireRepository(mockPool as any);
      const result = await repo.list();

      expect(result).toEqual([
        {
          id: 'onboarding',
          title: 'Employee Onboarding',
          latestVersion: 3,
          createdAt: date1,
        },
        {
          id: 'feedback',
          title: 'Feedback Form',
          latestVersion: 1,
          createdAt: date2,
        },
      ]);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY')
      );
    });

    it('should return empty array if no questionnaires exist', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const repo = createQuestionnaireRepository(mockPool as any);
      const result = await repo.list();

      expect(result).toEqual([]);
    });
  });
});
