import type { Condition, VisibleIf, QuestionDefinition, AnswerPayload } from '../types/questionnaire';

/**
 * Evaluate a single condition against the current answers
 */
function evaluateCondition(condition: Condition, answers: AnswerPayload): boolean {
  const { questionId, operator, value } = condition;
  const answer = answers[questionId];

  switch (operator) {
    case 'equals':
      return answer === value;

    case 'notEquals':
      return answer !== value;

    case 'in':
      if (Array.isArray(value)) {
        if (Array.isArray(answer)) {
          return answer.some((a) => value.includes(a));
        }
        return value.includes(answer);
      }
      return false;

    case 'notIn':
      if (Array.isArray(value)) {
        if (Array.isArray(answer)) {
          return !answer.some((a) => value.includes(a));
        }
        return !value.includes(answer);
      }
      return true;

    case 'gt':
      return typeof answer === 'number' && typeof value === 'number' && answer > value;

    case 'gte':
      return typeof answer === 'number' && typeof value === 'number' && answer >= value;

    case 'lt':
      return typeof answer === 'number' && typeof value === 'number' && answer < value;

    case 'lte':
      return typeof answer === 'number' && typeof value === 'number' && answer <= value;

    case 'isAnswered':
      return answer !== undefined && answer !== null && answer !== '';

    case 'notAnswered':
      return answer === undefined || answer === null || answer === '';

    default:
      return true;
  }
}

/**
 * Evaluate visibility conditions for a question
 */
function evaluateVisibleIf(visibleIf: VisibleIf, answers: AnswerPayload): boolean {
  const { all, any } = visibleIf;

  // If both are empty or not present, question is visible
  if ((!all || all.length === 0) && (!any || any.length === 0)) {
    return true;
  }

  // Evaluate 'all' conditions (AND logic)
  const allPass = !all || all.length === 0 || all.every((c) => evaluateCondition(c, answers));

  // Evaluate 'any' conditions (OR logic)
  const anyPass = !any || any.length === 0 || any.some((c) => evaluateCondition(c, answers));

  // Both must pass if present
  return allPass && anyPass;
}

/**
 * Check if a question should be visible based on hidden flag and visibleIf conditions
 */
export function isQuestionVisible(question: QuestionDefinition, answers: AnswerPayload): boolean {
  // Hidden questions are never visible
  if (question.hidden) {
    return false;
  }

  // Check visibleIf conditions
  if (question.visibleIf) {
    return evaluateVisibleIf(question.visibleIf, answers);
  }

  // Default to visible
  return true;
}

/**
 * Get all visible questions based on current answers
 */
export function getVisibleQuestions(
  questions: QuestionDefinition[],
  answers: AnswerPayload
): QuestionDefinition[] {
  return questions.filter((q) => isQuestionVisible(q, answers));
}

/**
 * Validate required questions and return errors
 */
export function validateAnswers(
  questions: QuestionDefinition[],
  answers: AnswerPayload
): { questionId: string; message: string }[] {
  const errors: { questionId: string; message: string }[] = [];
  const visibleQuestions = getVisibleQuestions(questions, answers);

  for (const question of visibleQuestions) {
    if (question.required) {
      const answer = answers[question.id];

      if (answer === undefined || answer === null || answer === '') {
        errors.push({
          questionId: question.id,
          message: `${question.label} is required`,
        });
        continue;
      }

      // For multiple choice, check if array has items
      if (question.type === 'choice' && question.multiple && Array.isArray(answer)) {
        if (answer.length === 0) {
          errors.push({
            questionId: question.id,
            message: `${question.label} requires at least one selection`,
          });
        }
      }
    }

    // Validate maxLength for text questions
    if (question.type === 'text' && question.maxLength) {
      const answer = answers[question.id];
      if (typeof answer === 'string' && answer.length > question.maxLength) {
        errors.push({
          questionId: question.id,
          message: `${question.label} exceeds maximum length of ${question.maxLength}`,
        });
      }
    }

    // Validate choice options
    if (question.type === 'choice') {
      const answer = answers[question.id];
      const validValues = question.options.map((o) => o.value);

      if (question.multiple && Array.isArray(answer)) {
        const invalidValues = answer.filter((v) => !validValues.includes(v));
        if (invalidValues.length > 0) {
          errors.push({
            questionId: question.id,
            message: `${question.label} contains invalid selections`,
          });
        }
      } else if (answer && !validValues.includes(answer as string)) {
        errors.push({
          questionId: question.id,
          message: `${question.label} has an invalid selection`,
        });
      }
    }
  }

  return errors;
}
