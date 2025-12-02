import type { QuestionnaireRepository } from '../../db/questionnaire-repository.js';
import type { QuestionnaireDefinition } from '../../schemas/index.js';
import { parseQuestionnaire, validateAnswers, getVisibleQuestions } from '../../engine/index.js';
import { NotFoundError } from '../../errors/index.js';

/**
 * Handler result for successful responses
 */
export interface HandlerResult<T> {
  status: number;
  data: T;
}

/**
 * Create questionnaire body
 */
interface CreateQuestionnaireBody {
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Create a new questionnaire
 */
export async function handleCreateQuestionnaire(
  repo: QuestionnaireRepository,
  body: unknown
): Promise<HandlerResult<{ questionnaire: any }>> {
  const typedBody = body as CreateQuestionnaireBody;
  const { metadata, ...definitionBody } = typedBody;

  // Validate and parse the questionnaire definition
  const definition = parseQuestionnaire(definitionBody);

  // Create the questionnaire with optional metadata
  const questionnaire = await repo.create(definition, { metadata });

  return {
    status: 201,
    data: { questionnaire },
  };
}

/**
 * Get the latest version of a questionnaire
 */
export async function handleGetQuestionnaire(
  repo: QuestionnaireRepository,
  id: string
): Promise<HandlerResult<{ questionnaire: any }>> {
  const questionnaire = await repo.findById(id);

  if (!questionnaire) {
    throw new NotFoundError(`Questionnaire with id "${id}" not found`);
  }

  return {
    status: 200,
    data: { questionnaire },
  };
}

/**
 * Get a specific version of a questionnaire
 */
export async function handleGetQuestionnaireVersion(
  repo: QuestionnaireRepository,
  id: string,
  version: number
): Promise<HandlerResult<{ questionnaire: any }>> {
  const questionnaire = await repo.findByIdAndVersion(id, version);

  if (!questionnaire) {
    throw new NotFoundError(
      `Questionnaire with id "${id}" version ${version} not found`
    );
  }

  return {
    status: 200,
    data: { questionnaire },
  };
}

/**
 * Update questionnaire body
 */
interface UpdateQuestionnaireBody {
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Update a questionnaire (creates a new version)
 */
export async function handleUpdateQuestionnaire(
  repo: QuestionnaireRepository,
  id: string,
  body: unknown
): Promise<HandlerResult<{ questionnaire: any }>> {
  const typedBody = body as UpdateQuestionnaireBody;
  const { metadata, ...definitionBody } = typedBody;

  // Validate and parse the questionnaire definition
  const definition = parseQuestionnaire(definitionBody);

  // Ensure the ID in the body matches the URL parameter
  if (definition.id !== id) {
    definition.id = id;
  }

  // Update the questionnaire (creates new version) with optional metadata
  const questionnaire = await repo.update(id, definition, { metadata });

  return {
    status: 200,
    data: { questionnaire },
  };
}

/**
 * List all questionnaires
 */
export async function handleListQuestionnaires(
  repo: QuestionnaireRepository
): Promise<HandlerResult<{ questionnaires: any[] }>> {
  const questionnaires = await repo.list();

  return {
    status: 200,
    data: { questionnaires },
  };
}

/**
 * List all versions of a questionnaire
 */
export async function handleListVersions(
  repo: QuestionnaireRepository,
  id: string
): Promise<HandlerResult<{ versions: any[] }>> {
  // First check if questionnaire exists
  const exists = await repo.findById(id);
  if (!exists) {
    throw new NotFoundError(`Questionnaire with id "${id}" not found`);
  }

  const versions = await repo.listVersions(id);

  return {
    status: 200,
    data: { versions },
  };
}

/**
 * Validate answers against a questionnaire
 */
export async function handleValidateAnswers(
  repo: QuestionnaireRepository,
  id: string,
  body: { version?: number; answers: Record<string, unknown> }
): Promise<HandlerResult<{ valid: boolean; errors?: any[] }>> {
  // Get the questionnaire
  const questionnaire = body.version
    ? await repo.findByIdAndVersion(id, body.version)
    : await repo.findById(id);

  if (!questionnaire) {
    throw new NotFoundError(
      body.version
        ? `Questionnaire with id "${id}" version ${body.version} not found`
        : `Questionnaire with id "${id}" not found`
    );
  }

  // Validate the answers
  const result = validateAnswers(questionnaire, body.answers);

  if (result.success) {
    return {
      status: 200,
      data: { valid: true },
    };
  }

  return {
    status: 200,
    data: { valid: false, errors: result.errors },
  };
}

/**
 * Get visible questions based on current answers
 */
export async function handleGetVisibleQuestions(
  repo: QuestionnaireRepository,
  id: string,
  body: { version?: number; answers: Record<string, unknown> }
): Promise<HandlerResult<{ questions: any[] }>> {
  // Get the questionnaire
  const questionnaire = body.version
    ? await repo.findByIdAndVersion(id, body.version)
    : await repo.findById(id);

  if (!questionnaire) {
    throw new NotFoundError(
      body.version
        ? `Questionnaire with id "${id}" version ${body.version} not found`
        : `Questionnaire with id "${id}" not found`
    );
  }

  // Get visible questions
  const questions = getVisibleQuestions(questionnaire, body.answers);

  return {
    status: 200,
    data: { questions },
  };
}
