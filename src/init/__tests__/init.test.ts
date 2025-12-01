import { describe, it, expect, beforeEach, vi } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  loadQuestionnaireFromFile,
  loadQuestionnairesFromDirectory,
  initializeQuestionnaires,
  type InitializeOptions,
} from '../index.js';
import type { QuestionnaireRepository } from '../../db/questionnaire-repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, 'fixtures');

describe('loadQuestionnaireFromFile', () => {
  it('should load a valid questionnaire from a JSON file', async () => {
    const filePath = join(fixturesDir, 'questionnaires', 'onboarding.json');
    const questionnaire = await loadQuestionnaireFromFile(filePath);

    expect(questionnaire.id).toBe('onboarding');
    expect(questionnaire.title).toBe('Employee Onboarding');
    expect(questionnaire.questions).toHaveLength(2);
  });

  it('should throw an error for invalid JSON', async () => {
    const filePath = join(fixturesDir, 'questionnaires', 'invalid.json');
    await expect(loadQuestionnaireFromFile(filePath)).rejects.toThrow();
  });

  it('should throw an error for non-existent file', async () => {
    const filePath = join(fixturesDir, 'questionnaires', 'nonexistent.json');
    await expect(loadQuestionnaireFromFile(filePath)).rejects.toThrow();
  });

  it('should parse and validate questionnaire definition', async () => {
    const filePath = join(fixturesDir, 'questionnaires', 'survey.json');
    const questionnaire = await loadQuestionnaireFromFile(filePath);

    expect(questionnaire.id).toBe('customer-satisfaction');
    expect(questionnaire.title).toBe('Customer Satisfaction Survey');
    expect(questionnaire.questions).toHaveLength(2);
    expect(questionnaire.questions[0].type).toBe('choice');
    expect(questionnaire.questions[1].type).toBe('text');
  });
});

describe('loadQuestionnairesFromDirectory', () => {
  it('should throw error when directory contains invalid files', async () => {
    const dirPath = join(fixturesDir, 'questionnaires');

    // Should throw because invalid.json has invalid JSON
    await expect(loadQuestionnairesFromDirectory(dirPath)).rejects.toThrow(/Failed to load questionnaire/);
  });

  it('should recursively load questionnaires from nested directories', async () => {
    const dirPath = join(fixturesDir, 'nested');
    const questionnaires = await loadQuestionnairesFromDirectory(dirPath);

    expect(questionnaires).toHaveLength(1);
    expect(questionnaires[0].id).toBe('feedback');
  });

  it('should return empty array for empty directory', async () => {
    const emptyDir = join(fixturesDir, 'empty');
    // Create empty directory
    const { mkdir } = await import('fs/promises');
    await mkdir(emptyDir, { recursive: true });

    const questionnaires = await loadQuestionnairesFromDirectory(emptyDir);
    expect(questionnaires).toHaveLength(0);
  });

  it('should throw error for non-existent directory', async () => {
    const dirPath = join(fixturesDir, 'nonexistent');
    await expect(loadQuestionnairesFromDirectory(dirPath)).rejects.toThrow();
  });
});

describe('initializeQuestionnaires', () => {
  let mockRepo: QuestionnaireRepository;
  let createSpy: any;
  let findByIdSpy: any;

  beforeEach(() => {
    createSpy = vi.fn().mockResolvedValue({ id: 'test', version: 1 });
    findByIdSpy = vi.fn().mockRejectedValue(new Error('Not found'));

    mockRepo = {
      create: createSpy,
      findById: findByIdSpy,
    } as any;
  });

  describe('loading from files', () => {
    it('should initialize questionnaires from file list', async () => {
      const files = [
        join(fixturesDir, 'questionnaires', 'onboarding.json'),
        join(fixturesDir, 'nested', 'feedback.json'),
      ];

      const result = await initializeQuestionnaires(mockRepo, { files });

      expect(result.initialized).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(createSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when loading invalid files', async () => {
      const files = [
        join(fixturesDir, 'questionnaires', 'onboarding.json'),
        join(fixturesDir, 'questionnaires', 'invalid.json'), // Invalid JSON
      ];

      const result = await initializeQuestionnaires(mockRepo, {
        files,
        continueOnError: true,
      });

      expect(result.initialized).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].source).toContain('invalid.json');
    });

    it('should fail fast by default when encountering errors', async () => {
      const files = [
        join(fixturesDir, 'questionnaires', 'invalid.json'),
        join(fixturesDir, 'questionnaires', 'onboarding.json'),
      ];

      const result = await initializeQuestionnaires(mockRepo, { files });

      expect(result.initialized).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe('loading from directory', () => {
    it('should initialize questionnaires from directory', async () => {
      const directory = join(fixturesDir, 'nested');

      const result = await initializeQuestionnaires(mockRepo, { directory });

      expect(result.initialized).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when loading from directory with invalid files', async () => {
      const directory = join(fixturesDir, 'questionnaires');

      const result = await initializeQuestionnaires(mockRepo, {
        directory,
        continueOnError: true,
      });

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('loading from inline definitions', () => {
    it('should initialize questionnaires from inline definitions', async () => {
      const definitions = [
        {
          id: 'inline-1',
          title: 'Inline Questionnaire 1',
          questions: [
            { id: 'q1', type: 'text', label: 'Question 1', required: true },
          ],
        },
        {
          id: 'inline-2',
          title: 'Inline Questionnaire 2',
          questions: [
            { id: 'q2', type: 'text', label: 'Question 2', required: true },
          ],
        },
      ];

      const result = await initializeQuestionnaires(mockRepo, { definitions });

      expect(result.initialized).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(createSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle validation errors in inline definitions', async () => {
      const definitions = [
        {
          id: 'valid',
          title: 'Valid',
          questions: [{ id: 'q1', type: 'text', label: 'Q1', required: true }],
        },
        {
          id: 'invalid',
          // Missing required fields
        },
      ];

      const result = await initializeQuestionnaires(mockRepo, {
        definitions,
        continueOnError: true,
      });

      expect(result.initialized).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].source).toBe('definition[1]');
    });
  });

  describe('skip existing questionnaires', () => {
    it('should skip questionnaires that already exist', async () => {
      findByIdSpy.mockResolvedValue({
        id: 'onboarding',
        version: 1,
        title: 'Existing',
        questions: [],
      });

      const files = [join(fixturesDir, 'questionnaires', 'onboarding.json')];

      const result = await initializeQuestionnaires(mockRepo, { files });

      expect(result.initialized).toBe(0);
      expect(result.skipped).toBe(1);
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe('error handling during repository operations', () => {
    it('should handle errors when creating questionnaires', async () => {
      createSpy.mockRejectedValue(new Error('Database error'));

      const files = [join(fixturesDir, 'nested', 'feedback.json')];

      const result = await initializeQuestionnaires(mockRepo, {
        files,
        continueOnError: true,
      });

      expect(result.initialized).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error.message).toBe('Database error');
    });

    it('should fail fast on repository errors by default', async () => {
      createSpy.mockRejectedValue(new Error('Database error'));

      const files = [
        join(fixturesDir, 'nested', 'feedback.json'),
        join(fixturesDir, 'questionnaires', 'onboarding.json'),
      ];

      const result = await initializeQuestionnaires(mockRepo, { files });

      expect(result.initialized).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('combining multiple sources', () => {
    it('should initialize from multiple sources', async () => {
      const options: InitializeOptions = {
        files: [join(fixturesDir, 'questionnaires', 'onboarding.json')],
        directory: join(fixturesDir, 'nested'),
        definitions: [
          {
            id: 'inline',
            title: 'Inline',
            questions: [{ id: 'q', type: 'text', label: 'Q', required: true }],
          },
        ],
      };

      const result = await initializeQuestionnaires(mockRepo, options);

      expect(result.initialized).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(createSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('versioning behavior', () => {
    let updateSpy: any;

    beforeEach(() => {
      updateSpy = vi.fn().mockResolvedValue({ id: 'test', version: 2 });
      mockRepo.update = updateSpy;
    });

    it('should call update() for existing questionnaires when updateExisting is true', async () => {
      findByIdSpy.mockResolvedValue({
        id: 'onboarding',
        version: 1,
        title: 'Existing',
        questions: [],
      });

      const files = [join(fixturesDir, 'questionnaires', 'onboarding.json')];

      const result = await initializeQuestionnaires(mockRepo, {
        files,
        updateExisting: true,
      });

      expect(result.initialized).toBe(1);
      expect(result.skipped).toBe(0);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith('onboarding', expect.objectContaining({
        id: 'onboarding',
        title: 'Employee Onboarding',
      }));
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should call create() for new questionnaires', async () => {
      findByIdSpy.mockRejectedValue(new Error('Not found'));

      const files = [join(fixturesDir, 'questionnaires', 'onboarding.json')];

      const result = await initializeQuestionnaires(mockRepo, { files });

      expect(result.initialized).toBe(1);
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('should increment versions when updating existing questionnaires', async () => {
      findByIdSpy.mockResolvedValue({
        id: 'onboarding',
        version: 3,
        title: 'Existing v3',
        questions: [],
      });

      updateSpy.mockResolvedValue({ id: 'onboarding', version: 4 });

      const files = [join(fixturesDir, 'questionnaires', 'onboarding.json')];

      await initializeQuestionnaires(mockRepo, {
        files,
        updateExisting: true,
      });

      // Verify update was called (which will create version 4 in real implementation)
      expect(updateSpy).toHaveBeenCalledWith('onboarding', expect.any(Object));
    });

    it('should handle mixed new and existing questionnaires', async () => {
      findByIdSpy
        .mockResolvedValueOnce({ id: 'onboarding', version: 1 }) // First exists
        .mockRejectedValueOnce(new Error('Not found')); // Second is new

      const files = [
        join(fixturesDir, 'questionnaires', 'onboarding.json'),
        join(fixturesDir, 'nested', 'feedback.json'),
      ];

      const result = await initializeQuestionnaires(mockRepo, {
        files,
        updateExisting: true,
      });

      expect(result.initialized).toBe(2);
      expect(updateSpy).toHaveBeenCalledTimes(1); // Update existing
      expect(createSpy).toHaveBeenCalledTimes(1); // Create new
    });

    it('should skip update if definition is identical to existing', async () => {
      const files = [join(fixturesDir, 'questionnaires', 'onboarding.json')];

      // Load and parse the file to get the exact structure
      const { loadQuestionnaireFromFile } = await import('../../index.js');
      const parsed = await loadQuestionnaireFromFile(files[0]);

      // Return exact same definition that will be loaded from file
      findByIdSpy.mockResolvedValue({
        ...parsed,
        version: 1,
        createdAt: new Date(),
      });

      const result = await initializeQuestionnaires(mockRepo, {
        files,
        updateExisting: true,
      });

      // Should skip because definition is identical
      expect(result.initialized).toBe(0);
      expect(result.skipped).toBe(1);
      expect(updateSpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should update if definition has changed', async () => {
      // Return different definition
      findByIdSpy.mockResolvedValue({
        id: 'onboarding',
        version: 1,
        title: 'OLD TITLE', // Different title
        description: 'New employee onboarding questionnaire',
        questions: [
          {
            id: 'name',
            type: 'text',
            label: 'Full Name',
            required: true,
            multiline: false,
          },
        ],
        createdAt: new Date(),
      });

      const files = [join(fixturesDir, 'questionnaires', 'onboarding.json')];

      const result = await initializeQuestionnaires(mockRepo, {
        files,
        updateExisting: true,
      });

      // Should update because definition has changed
      expect(result.initialized).toBe(1);
      expect(result.skipped).toBe(0);
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('result summary', () => {
    it('should provide accurate counts in result', async () => {
      findByIdSpy
        .mockResolvedValueOnce({ id: 'onboarding', version: 1 }) // First exists
        .mockRejectedValueOnce(new Error('Not found')); // Second doesn't exist

      const files = [
        join(fixturesDir, 'questionnaires', 'onboarding.json'),
        join(fixturesDir, 'nested', 'feedback.json'),
      ];

      const result = await initializeQuestionnaires(mockRepo, { files });

      expect(result.initialized).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });
});
