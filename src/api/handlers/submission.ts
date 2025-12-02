import type { QuestionnaireRepository } from '../../db/questionnaire-repository.js';
import type { SubmissionRepository } from '../../db/submission-repository.js';
import { validateAnswers } from '../../engine/index.js';
import { NotFoundError, ValidationError } from '../../errors/index.js';
import type { HandlerResult } from './questionnaire.js';

/**
 * Submit answers to a questionnaire
 */
export async function handleSubmitAnswers(
  questionnaireRepo: QuestionnaireRepository,
  submissionRepo: SubmissionRepository,
  id: string,
  body: { version?: number; answers: Record<string, unknown>; metadata?: Record<string, unknown> }
): Promise<HandlerResult<{ submission: any }>> {
  // Get the questionnaire
  const questionnaire = body.version
    ? await questionnaireRepo.findByIdAndVersion(id, body.version)
    : await questionnaireRepo.findById(id);

  if (!questionnaire) {
    throw new NotFoundError(
      body.version
        ? `Questionnaire with id "${id}" version ${body.version} not found`
        : `Questionnaire with id "${id}" not found`
    );
  }

  // Validate the answers
  const validationResult = validateAnswers(questionnaire, body.answers);

  if (!validationResult.success) {
    throw new ValidationError('Answer validation failed', validationResult.errors);
  }

  // Create the submission with optional metadata
  const submission = await submissionRepo.create(
    questionnaire.id,
    questionnaire.version,
    body.answers,
    { metadata: body.metadata }
  );

  return {
    status: 201,
    data: { submission },
  };
}

/**
 * Get a submission by ID
 */
export async function handleGetSubmission(
  repo: SubmissionRepository,
  submissionId: string
): Promise<HandlerResult<{ submission: any }>> {
  const submission = await repo.findById(submissionId);

  if (!submission) {
    throw new NotFoundError(`Submission with id "${submissionId}" not found`);
  }

  return {
    status: 200,
    data: { submission },
  };
}

/**
 * List submissions for a questionnaire
 */
export async function handleListSubmissions(
  repo: SubmissionRepository,
  questionnaireId: string,
  query: {
    version?: string;
    limit?: string;
    offset?: string;
  }
): Promise<HandlerResult<{ submissions: any[]; total: number; limit: number; offset: number }>> {
  // Parse query parameters
  const version = query.version ? parseInt(query.version, 10) : undefined;
  const limit = query.limit ? parseInt(query.limit, 10) : undefined;
  const offset = query.offset ? parseInt(query.offset, 10) : undefined;

  // Validate numeric parameters
  if (query.version && isNaN(version!)) {
    throw new ValidationError('Invalid version parameter', [
      { field: 'version', code: 'INVALID_TYPE', message: 'Version must be a number' },
    ]);
  }
  if (query.limit && isNaN(limit!)) {
    throw new ValidationError('Invalid limit parameter', [
      { field: 'limit', code: 'INVALID_TYPE', message: 'Limit must be a number' },
    ]);
  }
  if (query.offset && isNaN(offset!)) {
    throw new ValidationError('Invalid offset parameter', [
      { field: 'offset', code: 'INVALID_TYPE', message: 'Offset must be a number' },
    ]);
  }

  // Get submissions
  const result = await repo.listByQuestionnaire(questionnaireId, {
    version,
    limit,
    offset,
  });

  return {
    status: 200,
    data: {
      submissions: result.items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    },
  };
}
