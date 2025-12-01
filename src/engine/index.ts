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

// Validation exports
export {
  buildAnswerSchema,
  validateAnswers,
  parseQuestionnaire,
  type ValidationSuccess,
  type ValidationFailure,
  type ValidationErrorDetail,
  type ValidationResult,
} from './validation.js';
