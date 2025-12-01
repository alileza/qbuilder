import { describe, it, expect, beforeEach } from 'vitest';
import {
  answerSchemaRegistry,
  getAnswerSchemaBuilder,
  registerAnswerBuilder,
  type AnswerSchemaBuilder,
} from '../index.js';
import { z } from 'zod';

describe('answerSchemaRegistry', () => {
  it('should have text question builder', () => {
    expect(answerSchemaRegistry.text).toBeDefined();
    expect(typeof answerSchemaRegistry.text).toBe('function');
  });

  it('should have choice question builder', () => {
    expect(answerSchemaRegistry.choice).toBeDefined();
    expect(typeof answerSchemaRegistry.choice).toBe('function');
  });

  it('should work with text question builder', () => {
    const question = {
      id: 'q1',
      type: 'text' as const,
      label: 'Name',
      required: true,
    };

    const schema = answerSchemaRegistry.text(question as any);
    expect(schema.safeParse('John').success).toBe(true);
  });

  it('should work with choice question builder', () => {
    const question = {
      id: 'q1',
      type: 'choice' as const,
      label: 'Pick',
      required: true,
      multiple: false,
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    };

    const schema = answerSchemaRegistry.choice(question as any);
    expect(schema.safeParse('a').success).toBe(true);
    expect(schema.safeParse('c').success).toBe(false);
  });
});

describe('getAnswerSchemaBuilder', () => {
  it('should return builder for text question type', () => {
    const builder = getAnswerSchemaBuilder('text');
    expect(builder).toBeDefined();
    expect(builder).toBe(answerSchemaRegistry.text);
  });

  it('should return builder for choice question type', () => {
    const builder = getAnswerSchemaBuilder('choice');
    expect(builder).toBeDefined();
    expect(builder).toBe(answerSchemaRegistry.choice);
  });

  it('should return undefined for unknown question type', () => {
    const builder = getAnswerSchemaBuilder('unknown-type');
    expect(builder).toBeUndefined();
  });
});

describe('registerAnswerBuilder', () => {
  // Create a custom question type for testing
  const customBuilder: AnswerSchemaBuilder = (question: any) => {
    if (question.required) {
      return z.number().min(1).max(5);
    }
    return z.number().min(1).max(5).optional();
  };

  beforeEach(() => {
    // Note: The custom registry is module-scoped, so tests may affect each other
    // In a real scenario, you might want to expose a clearCustomRegistry function for testing
  });

  it('should register a custom answer builder', () => {
    registerAnswerBuilder('rating', customBuilder);

    const builder = getAnswerSchemaBuilder('rating');
    expect(builder).toBeDefined();
    expect(builder).toBe(customBuilder);
  });

  it('should use custom builder over default registry', () => {
    // Register a custom text builder
    const customTextBuilder: AnswerSchemaBuilder = () => z.string().length(10);
    registerAnswerBuilder('text', customTextBuilder);

    const builder = getAnswerSchemaBuilder('text');
    expect(builder).toBe(customTextBuilder);
    expect(builder).not.toBe(answerSchemaRegistry.text);
  });

  it('should work with custom question type', () => {
    const ratingQuestion = {
      id: 'q1',
      type: 'rating',
      label: 'Rate us',
      required: true,
    };

    registerAnswerBuilder('rating', customBuilder);
    const builder = getAnswerSchemaBuilder('rating');

    if (!builder) {
      throw new Error('Builder not found');
    }

    const schema = builder(ratingQuestion as any);

    expect(schema.safeParse(3).success).toBe(true);
    expect(schema.safeParse(0).success).toBe(false);
    expect(schema.safeParse(6).success).toBe(false);
  });

  it('should support multiple custom types', () => {
    const dateBuilder: AnswerSchemaBuilder = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    const emailBuilder: AnswerSchemaBuilder = () => z.string().email();

    registerAnswerBuilder('date', dateBuilder);
    registerAnswerBuilder('email', emailBuilder);

    expect(getAnswerSchemaBuilder('date')).toBe(dateBuilder);
    expect(getAnswerSchemaBuilder('email')).toBe(emailBuilder);
  });

  it('should allow overwriting existing custom builders', () => {
    const builder1: AnswerSchemaBuilder = () => z.string();
    const builder2: AnswerSchemaBuilder = () => z.number();

    registerAnswerBuilder('custom', builder1);
    expect(getAnswerSchemaBuilder('custom')).toBe(builder1);

    registerAnswerBuilder('custom', builder2);
    expect(getAnswerSchemaBuilder('custom')).toBe(builder2);
  });
});

describe('extensibility example', () => {
  it('should demonstrate adding a rating question type', () => {
    // Define a rating question type
    interface RatingQuestion {
      id: string;
      type: 'rating';
      label: string;
      required?: boolean;
      min?: number;
      max?: number;
    }

    // Create a builder for rating questions
    const buildRatingAnswerSchema: AnswerSchemaBuilder = (question: any) => {
      const ratingQuestion = question as RatingQuestion;
      const min = ratingQuestion.min ?? 1;
      const max = ratingQuestion.max ?? 5;

      let schema = z.number().int().min(min).max(max);

      if (!ratingQuestion.required) {
        schema = schema.optional() as any;
      }

      return schema;
    };

    // Register the custom builder
    registerAnswerBuilder('rating', buildRatingAnswerSchema);

    // Use it
    const ratingQuestion: RatingQuestion = {
      id: 'q1',
      type: 'rating',
      label: 'How would you rate our service?',
      required: true,
      min: 1,
      max: 5,
    };

    const builder = getAnswerSchemaBuilder('rating');
    expect(builder).toBeDefined();

    const schema = builder!(ratingQuestion as any);

    // Valid ratings
    expect(schema.safeParse(1).success).toBe(true);
    expect(schema.safeParse(3).success).toBe(true);
    expect(schema.safeParse(5).success).toBe(true);

    // Invalid ratings
    expect(schema.safeParse(0).success).toBe(false);
    expect(schema.safeParse(6).success).toBe(false);
    expect(schema.safeParse(3.5).success).toBe(false);
    expect(schema.safeParse('3').success).toBe(false);
  });
});
