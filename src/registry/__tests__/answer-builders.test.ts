import { describe, it, expect } from 'vitest';
import { buildTextAnswerSchema, buildChoiceAnswerSchema } from '../answer-builders.js';
import type { TextQuestion, ChoiceQuestion } from '../../schemas/index.js';

describe('buildTextAnswerSchema', () => {
  describe('required text questions', () => {
    it('should accept non-empty string for required question', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Name',
        required: true,
      };

      const schema = buildTextAnswerSchema(question);
      const result = schema.safeParse('John Doe');

      expect(result.success).toBe(true);
    });

    it('should reject empty string for required question', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Name',
        required: true,
      };

      const schema = buildTextAnswerSchema(question);
      const result = schema.safeParse('');

      expect(result.success).toBe(false);
    });

    it('should reject undefined for required question', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Name',
        required: true,
      };

      const schema = buildTextAnswerSchema(question);
      const result = schema.safeParse(undefined);

      expect(result.success).toBe(false);
    });

    it('should reject null for required question', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Name',
        required: true,
      };

      const schema = buildTextAnswerSchema(question);
      const result = schema.safeParse(null);

      expect(result.success).toBe(false);
    });
  });

  describe('optional text questions', () => {
    it('should accept non-empty string for optional question', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Middle name',
        required: false,
      };

      const schema = buildTextAnswerSchema(question);
      const result = schema.safeParse('Marie');

      expect(result.success).toBe(true);
    });

    it('should accept empty string for optional question', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Middle name',
        required: false,
      };

      const schema = buildTextAnswerSchema(question);
      const result = schema.safeParse('');

      expect(result.success).toBe(true);
    });

    it('should accept undefined for optional question', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Middle name',
        required: false,
      };

      const schema = buildTextAnswerSchema(question);
      const result = schema.safeParse(undefined);

      expect(result.success).toBe(true);
    });

    it('should accept null for optional question', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Middle name',
        required: false,
      };

      const schema = buildTextAnswerSchema(question);
      const result = schema.safeParse(null);

      expect(result.success).toBe(true);
    });
  });

  describe('maxLength constraint', () => {
    it('should accept string within maxLength', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Name',
        required: true,
        maxLength: 10,
      };

      const schema = buildTextAnswerSchema(question);
      const result = schema.safeParse('John');

      expect(result.success).toBe(true);
    });

    it('should accept string exactly at maxLength', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Name',
        required: true,
        maxLength: 10,
      };

      const schema = buildTextAnswerSchema(question);
      const result = schema.safeParse('1234567890');

      expect(result.success).toBe(true);
    });

    it('should reject string exceeding maxLength', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Name',
        required: true,
        maxLength: 10,
      };

      const schema = buildTextAnswerSchema(question);
      const result = schema.safeParse('12345678901');

      expect(result.success).toBe(false);
    });

    it('should apply maxLength to optional questions', () => {
      const question: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Note',
        required: false,
        maxLength: 5,
      };

      const schema = buildTextAnswerSchema(question);

      expect(schema.safeParse('abc').success).toBe(true);
      expect(schema.safeParse('abcdef').success).toBe(false);
    });
  });

  describe('multiline flag', () => {
    it('should not affect validation (only UI hint)', () => {
      const singleLine: TextQuestion = {
        id: 'q1',
        type: 'text',
        label: 'Name',
        required: true,
        multiline: false,
      };

      const multiLine: TextQuestion = {
        id: 'q2',
        type: 'text',
        label: 'Bio',
        required: true,
        multiline: true,
      };

      const schema1 = buildTextAnswerSchema(singleLine);
      const schema2 = buildTextAnswerSchema(multiLine);

      const multilineText = 'Line 1\nLine 2\nLine 3';

      expect(schema1.safeParse(multilineText).success).toBe(true);
      expect(schema2.safeParse(multilineText).success).toBe(true);
    });
  });
});

describe('buildChoiceAnswerSchema', () => {
  describe('required single choice questions', () => {
    it('should accept valid option value', () => {
      const question: ChoiceQuestion = {
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

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse('a');

      expect(result.success).toBe(true);
    });

    it('should reject invalid option value', () => {
      const question: ChoiceQuestion = {
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

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse('c');

      expect(result.success).toBe(false);
    });

    it('should reject undefined for required question', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick one',
        required: true,
        multiple: false,
        options: [{ value: 'a', label: 'A' }],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse(undefined);

      expect(result.success).toBe(false);
    });

    it('should reject empty string for required question', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick one',
        required: true,
        multiple: false,
        options: [{ value: 'a', label: 'A' }],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse('');

      expect(result.success).toBe(false);
    });
  });

  describe('optional single choice questions', () => {
    it('should accept valid option value', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick one',
        required: false,
        multiple: false,
        options: [{ value: 'a', label: 'A' }],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse('a');

      expect(result.success).toBe(true);
    });

    it('should accept undefined for optional question', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick one',
        required: false,
        multiple: false,
        options: [{ value: 'a', label: 'A' }],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse(undefined);

      expect(result.success).toBe(true);
    });

    it('should accept null for optional question', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick one',
        required: false,
        multiple: false,
        options: [{ value: 'a', label: 'A' }],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse(null);

      expect(result.success).toBe(true);
    });

    it('should accept empty string for optional question', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick one',
        required: false,
        multiple: false,
        options: [{ value: 'a', label: 'A' }],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse('');

      expect(result.success).toBe(true);
    });
  });

  describe('required multiple choice questions', () => {
    it('should accept array with valid option values', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick any',
        required: true,
        multiple: true,
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'c', label: 'C' },
        ],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse(['a', 'c']);

      expect(result.success).toBe(true);
    });

    it('should reject array with invalid option value', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick any',
        required: true,
        multiple: true,
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse(['a', 'z']);

      expect(result.success).toBe(false);
    });

    it('should reject empty array for required question', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick any',
        required: true,
        multiple: true,
        options: [{ value: 'a', label: 'A' }],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse([]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one');
      }
    });

    it('should accept single item array', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick any',
        required: true,
        multiple: true,
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse(['a']);

      expect(result.success).toBe(true);
    });
  });

  describe('optional multiple choice questions', () => {
    it('should accept array with valid values', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick any',
        required: false,
        multiple: true,
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse(['a', 'b']);

      expect(result.success).toBe(true);
    });

    it('should accept empty array for optional question', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick any',
        required: false,
        multiple: true,
        options: [{ value: 'a', label: 'A' }],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse([]);

      expect(result.success).toBe(true);
    });

    it('should accept undefined for optional question', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick any',
        required: false,
        multiple: true,
        options: [{ value: 'a', label: 'A' }],
      };

      const schema = buildChoiceAnswerSchema(question);
      const result = schema.safeParse(undefined);

      expect(result.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should throw error for question with no options', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick one',
        required: true,
        multiple: false,
        options: [],
      };

      expect(() => buildChoiceAnswerSchema(question)).toThrow('has no options');
    });

    it('should handle options with special characters', () => {
      const question: ChoiceQuestion = {
        id: 'q1',
        type: 'choice',
        label: 'Pick one',
        required: true,
        multiple: false,
        options: [
          { value: 'a-b', label: 'A-B' },
          { value: 'c_d', label: 'C_D' },
          { value: 'e.f', label: 'E.F' },
        ],
      };

      const schema = buildChoiceAnswerSchema(question);

      expect(schema.safeParse('a-b').success).toBe(true);
      expect(schema.safeParse('c_d').success).toBe(true);
      expect(schema.safeParse('e.f').success).toBe(true);
    });
  });
});
