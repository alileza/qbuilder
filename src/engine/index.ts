// Cyclic dependency detection
export {
  buildDependencyGraph,
  detectCycles,
  validateNoCyclicDependencies,
} from './cyclic-detection.js';

// Visibility and branching logic
export {
  evaluateCondition,
  isQuestionVisible,
  getVisibleQuestions,
  getVisibleSections,
} from './visibility.js';

// Validation exports (will be added in Phase 5)
