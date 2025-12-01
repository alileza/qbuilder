import { describe, it, expect } from 'vitest';
import {
  buildDependencyGraph,
  detectCycles,
  validateNoCyclicDependencies,
} from '../cyclic-detection.js';
import type { QuestionnaireDefinition } from '../../schemas/index.js';

describe('buildDependencyGraph', () => {
  it('should build graph with no dependencies', () => {
    const questions = [
      { id: 'q1', type: 'text' as const, label: 'Q1' },
      { id: 'q2', type: 'text' as const, label: 'Q2' },
    ];

    const graph = buildDependencyGraph(questions);

    expect(graph.size).toBe(2);
    expect(graph.get('q1')?.size).toBe(0);
    expect(graph.get('q2')?.size).toBe(0);
  });

  it('should extract dependencies from visibleIf.all', () => {
    const questions = [
      { id: 'q1', type: 'text' as const, label: 'Q1' },
      {
        id: 'q2',
        type: 'text' as const,
        label: 'Q2',
        visibleIf: {
          all: [{ questionId: 'q1', operator: 'equals' as const, value: 'yes' }],
        },
      },
    ];

    const graph = buildDependencyGraph(questions);

    expect(graph.get('q2')?.has('q1')).toBe(true);
  });

  it('should extract dependencies from visibleIf.any', () => {
    const questions = [
      { id: 'q1', type: 'text' as const, label: 'Q1' },
      { id: 'q2', type: 'text' as const, label: 'Q2' },
      {
        id: 'q3',
        type: 'text' as const,
        label: 'Q3',
        visibleIf: {
          any: [
            { questionId: 'q1', operator: 'isAnswered' as const },
            { questionId: 'q2', operator: 'isAnswered' as const },
          ],
        },
      },
    ];

    const graph = buildDependencyGraph(questions);

    expect(graph.get('q3')?.has('q1')).toBe(true);
    expect(graph.get('q3')?.has('q2')).toBe(true);
  });

  it('should extract dependencies from both all and any', () => {
    const questions = [
      { id: 'q1', type: 'text' as const, label: 'Q1' },
      { id: 'q2', type: 'text' as const, label: 'Q2' },
      {
        id: 'q3',
        type: 'text' as const,
        label: 'Q3',
        visibleIf: {
          all: [{ questionId: 'q1', operator: 'isAnswered' as const }],
          any: [{ questionId: 'q2', operator: 'isAnswered' as const }],
        },
      },
    ];

    const graph = buildDependencyGraph(questions);

    expect(graph.get('q3')?.size).toBe(2);
    expect(graph.get('q3')?.has('q1')).toBe(true);
    expect(graph.get('q3')?.has('q2')).toBe(true);
  });
});

describe('detectCycles', () => {
  it('should return false for graph with no cycles', () => {
    const graph = new Map([
      ['q1', new Set<string>()],
      ['q2', new Set(['q1'])],
      ['q3', new Set(['q2'])],
    ]);

    const result = detectCycles(graph);

    expect(result.hasCycle).toBe(false);
    expect(result.path).toBeUndefined();
  });

  it('should detect direct cycle (A -> B -> A)', () => {
    const graph = new Map([
      ['q1', new Set(['q2'])],
      ['q2', new Set(['q1'])],
    ]);

    const result = detectCycles(graph);

    expect(result.hasCycle).toBe(true);
    expect(result.path).toBeDefined();
    expect(result.path?.length).toBeGreaterThan(0);
  });

  it('should detect transitive cycle (A -> B -> C -> A)', () => {
    const graph = new Map([
      ['q1', new Set(['q2'])],
      ['q2', new Set(['q3'])],
      ['q3', new Set(['q1'])],
    ]);

    const result = detectCycles(graph);

    expect(result.hasCycle).toBe(true);
    expect(result.path).toBeDefined();
  });

  it('should detect self-reference cycle (A -> A)', () => {
    const graph = new Map([
      ['q1', new Set(['q1'])],
    ]);

    const result = detectCycles(graph);

    expect(result.hasCycle).toBe(true);
  });

  it('should handle disconnected graphs without cycles', () => {
    const graph = new Map([
      ['q1', new Set(['q2'])],
      ['q2', new Set<string>()],
      ['q3', new Set(['q4'])],
      ['q4', new Set<string>()],
    ]);

    const result = detectCycles(graph);

    expect(result.hasCycle).toBe(false);
  });

  it('should handle complex graph with one cycle', () => {
    const graph = new Map([
      ['q1', new Set(['q2'])],
      ['q2', new Set(['q3'])],
      ['q3', new Set<string>()],
      ['q4', new Set(['q5'])],
      ['q5', new Set(['q4'])], // Cycle here
    ]);

    const result = detectCycles(graph);

    expect(result.hasCycle).toBe(true);
  });
});

describe('validateNoCyclicDependencies', () => {
  it('should not throw for questionnaire without cycles', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [
        { id: 'q1', type: 'text', label: 'Q1' },
        {
          id: 'q2',
          type: 'text',
          label: 'Q2',
          visibleIf: {
            all: [{ questionId: 'q1', operator: 'isAnswered' }],
          },
        },
      ],
    };

    expect(() => validateNoCyclicDependencies(questionnaire)).not.toThrow();
  });

  it('should throw for questionnaire with direct cycle', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [
        {
          id: 'q1',
          type: 'text',
          label: 'Q1',
          visibleIf: {
            all: [{ questionId: 'q2', operator: 'isAnswered' }],
          },
        },
        {
          id: 'q2',
          type: 'text',
          label: 'Q2',
          visibleIf: {
            all: [{ questionId: 'q1', operator: 'isAnswered' }],
          },
        },
      ],
    };

    expect(() => validateNoCyclicDependencies(questionnaire)).toThrow('Cyclic dependency');
  });

  it('should throw for questionnaire with transitive cycle', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [
        {
          id: 'q1',
          type: 'text',
          label: 'Q1',
          visibleIf: {
            all: [{ questionId: 'q2', operator: 'isAnswered' }],
          },
        },
        {
          id: 'q2',
          type: 'text',
          label: 'Q2',
          visibleIf: {
            all: [{ questionId: 'q3', operator: 'isAnswered' }],
          },
        },
        {
          id: 'q3',
          type: 'text',
          label: 'Q3',
          visibleIf: {
            all: [{ questionId: 'q1', operator: 'isAnswered' }],
          },
        },
      ],
    };

    expect(() => validateNoCyclicDependencies(questionnaire)).toThrow();
  });

  it('should include cycle path in error message', () => {
    const questionnaire: QuestionnaireDefinition = {
      id: 'survey',
      title: 'Survey',
      questions: [
        {
          id: 'q1',
          type: 'text',
          label: 'Q1',
          visibleIf: {
            all: [{ questionId: 'q2', operator: 'isAnswered' }],
          },
        },
        {
          id: 'q2',
          type: 'text',
          label: 'Q2',
          visibleIf: {
            all: [{ questionId: 'q1', operator: 'isAnswered' }],
          },
        },
      ],
    };

    try {
      validateNoCyclicDependencies(questionnaire);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect((error as Error).message).toContain('Cyclic dependency');
      // Check that error has details with cycle path
      const errorWithDetails = error as any;
      if (errorWithDetails.details) {
        const detailMessage = errorWithDetails.details[0]?.message || '';
        expect(detailMessage).toContain('q1');
        expect(detailMessage).toContain('q2');
      }
    }
  });
});
