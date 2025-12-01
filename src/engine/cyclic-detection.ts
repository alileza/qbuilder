import type { QuestionnaireDefinition, QuestionDefinition } from '../schemas/index.js';
import { CyclicDependencyError } from '../errors/index.js';

/**
 * Build a dependency graph from question visibleIf conditions
 * Returns a map of questionId -> Set of questionIds it depends on
 */
export function buildDependencyGraph(
  questions: QuestionDefinition[]
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const question of questions) {
    const dependencies = new Set<string>();

    if (question.visibleIf) {
      const { all = [], any = [] } = question.visibleIf;
      const allConditions = [...all, ...any];

      for (const condition of allConditions) {
        dependencies.add(condition.questionId);
      }
    }

    graph.set(question.id, dependencies);
  }

  return graph;
}

/**
 * Detect cycles in the dependency graph using DFS
 */
export function detectCycles(
  graph: Map<string, Set<string>>
): { hasCycle: boolean; path?: string[] } {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const dependencies = graph.get(nodeId);
    if (dependencies) {
      for (const depId of dependencies) {
        // Skip if dependency doesn't exist in graph (will be caught by schema validation)
        if (!graph.has(depId)) continue;

        if (!visited.has(depId)) {
          if (dfs(depId)) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          // Found a cycle
          path.push(depId);
          return true;
        }
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return false;
  }

  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) {
        return { hasCycle: true, path };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Validate that a questionnaire has no cyclic dependencies
 * Throws an error if a cycle is detected
 */
export function validateNoCyclicDependencies(
  questionnaire: QuestionnaireDefinition
): void {
  const graph = buildDependencyGraph(questionnaire.questions);
  const result = detectCycles(graph);

  if (result.hasCycle) {
    throw new CyclicDependencyError(
      'Cyclic dependency detected in visibleIf conditions',
      result.path
    );
  }
}
