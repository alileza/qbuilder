// Router factory
export { createQuestionnaireRouter, type RouterOptions } from './router.js';

// Handlers for custom integrations
export {
  handleCreateQuestionnaire,
  handleGetQuestionnaire,
  handleGetQuestionnaireVersion,
  handleUpdateQuestionnaire,
  handleListQuestionnaires,
  handleListVersions,
  handleValidateAnswers,
  handleGetVisibleQuestions,
  type HandlerResult,
} from './handlers/questionnaire.js';

export {
  handleSubmitAnswers,
  handleGetSubmission,
  handleListSubmissions,
} from './handlers/submission.js';

// Middleware
export { createErrorHandler } from './middleware/error-handler.js';
