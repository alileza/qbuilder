import type {
  QuestionnaireDefinition,
  QuestionDefinition,
  SectionDefinition,
  Condition,
  AnswerPayload,
} from '../schemas/index.js';

/**
 * Evaluate a single condition against the current answers
 */
export function evaluateCondition(
  condition: Condition,
  answers: AnswerPayload
): boolean {
  const { questionId, operator } = condition;
  const answer = answers[questionId];

  switch (operator) {
    case 'isAnswered':
      return answer !== undefined && answer !== null && answer !== '';

    case 'notAnswered':
      return answer === undefined || answer === null || answer === '';

    case 'equals':
      // 'value' is guaranteed to exist for this operator type
      return answer === (condition as { value: unknown }).value;

    case 'notEquals':
      return answer !== (condition as { value: unknown }).value;

    case 'in': {
      const values = (condition as { value: unknown }).value;
      if (!Array.isArray(values)) return false;
      if (Array.isArray(answer)) {
        // If answer is array, check if any element is in values
        return answer.some((item) => values.includes(item));
      }
      return values.includes(answer);
    }

    case 'notIn': {
      const values = (condition as { value: unknown }).value;
      if (!Array.isArray(values)) return false;
      if (Array.isArray(answer)) {
        // If answer is array, check if no element is in values
        return !answer.some((item) => values.includes(item));
      }
      return !values.includes(answer);
    }

    case 'gt':
      if (typeof answer !== 'number') return false;
      return answer > Number((condition as { value: unknown }).value);

    case 'gte':
      if (typeof answer !== 'number') return false;
      return answer >= Number((condition as { value: unknown }).value);

    case 'lt':
      if (typeof answer !== 'number') return false;
      return answer < Number((condition as { value: unknown }).value);

    case 'lte':
      if (typeof answer !== 'number') return false;
      return answer <= Number((condition as { value: unknown }).value);

    default:
      return false;
  }
}

/**
 * Check if a question is visible based on its visibleIf conditions
 */
export function isQuestionVisible(
  question: QuestionDefinition,
  answers: AnswerPayload
): boolean {
  // If no visibleIf, question is always visible
  if (!question.visibleIf) {
    return true;
  }

  const { all = [], any = [] } = question.visibleIf;

  // Evaluate 'all' conditions (AND logic)
  const allConditionsMet = all.length === 0 || all.every((condition) => evaluateCondition(condition, answers));

  // Evaluate 'any' conditions (OR logic)
  const anyConditionMet = any.length === 0 || any.some((condition) => evaluateCondition(condition, answers));

  // Both must be true
  return allConditionsMet && anyConditionMet;
}

/**
 * Get all visible questions from a questionnaire based on current answers
 */
export function getVisibleQuestions(
  questionnaire: QuestionnaireDefinition,
  answers: AnswerPayload
): QuestionDefinition[] {
  return questionnaire.questions.filter((question) =>
    isQuestionVisible(question, answers)
  );
}

/**
 * Get sections that contain at least one visible question
 * Returns sections with filtered questionIds containing only visible questions
 */
export function getVisibleSections(
  questionnaire: QuestionnaireDefinition,
  answers: AnswerPayload
): SectionDefinition[] {
  if (!questionnaire.sections || questionnaire.sections.length === 0) {
    return [];
  }

  const visibleQuestionIds = new Set(
    getVisibleQuestions(questionnaire, answers).map((q) => q.id)
  );

  return questionnaire.sections
    .map((section) => ({
      ...section,
      questionIds: section.questionIds.filter((qId) => visibleQuestionIds.has(qId)),
    }))
    .filter((section) => section.questionIds.length > 0);
}
