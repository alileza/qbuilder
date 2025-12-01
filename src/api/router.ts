import { Router } from 'express';
import type { QuestionnaireRepository } from '../db/questionnaire-repository.js';
import type { SubmissionRepository } from '../db/submission-repository.js';
import {
  handleCreateQuestionnaire,
  handleGetQuestionnaire,
  handleGetQuestionnaireVersion,
  handleUpdateQuestionnaire,
  handleListQuestionnaires,
  handleListVersions,
  handleValidateAnswers,
  handleGetVisibleQuestions,
} from './handlers/questionnaire.js';
import {
  handleSubmitAnswers,
  handleGetSubmission,
  handleListSubmissions,
} from './handlers/submission.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { openApiSpec } from './openapi.js';

/**
 * Router configuration options
 */
export interface RouterOptions {
  questionnaireRepository: QuestionnaireRepository;
  submissionRepository: SubmissionRepository;
  /**
   * Enable Express JSON body parser (default: true)
   */
  enableJsonParser?: boolean;
}

/**
 * Async handler wrapper for Express
 */
function asyncHandler(
  fn: (req: any, res: any, next: any) => Promise<any>
) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create an Express router with all questionnaire endpoints
 */
export function createQuestionnaireRouter(options: RouterOptions): Router {
  const router = Router();
  const { questionnaireRepository, submissionRepository, enableJsonParser = true } = options;

  // Apply JSON body parser if enabled
  if (enableJsonParser) {
    const express = require('express');
    router.use(express.json());
  }

  // Questionnaire endpoints

  /**
   * POST /questionnaires
   * Create a new questionnaire
   */
  router.post(
    '/questionnaires',
    asyncHandler(async (req, res) => {
      const result = await handleCreateQuestionnaire(
        questionnaireRepository,
        req.body
      );
      res.status(result.status).json(result.data);
    })
  );

  /**
   * GET /questionnaires
   * List all questionnaires
   */
  router.get(
    '/questionnaires',
    asyncHandler(async (req, res) => {
      const result = await handleListQuestionnaires(questionnaireRepository);
      res.status(result.status).json(result.data);
    })
  );

  /**
   * GET /questionnaires/:id
   * Get the latest version of a questionnaire
   */
  router.get(
    '/questionnaires/:id',
    asyncHandler(async (req, res) => {
      const result = await handleGetQuestionnaire(
        questionnaireRepository,
        req.params.id
      );
      res.status(result.status).json(result.data);
    })
  );

  /**
   * PUT /questionnaires/:id
   * Update a questionnaire (creates a new version)
   */
  router.put(
    '/questionnaires/:id',
    asyncHandler(async (req, res) => {
      const result = await handleUpdateQuestionnaire(
        questionnaireRepository,
        req.params.id,
        req.body
      );
      res.status(result.status).json(result.data);
    })
  );

  /**
   * GET /questionnaires/:id/versions
   * List all versions of a questionnaire
   */
  router.get(
    '/questionnaires/:id/versions',
    asyncHandler(async (req, res) => {
      const result = await handleListVersions(
        questionnaireRepository,
        req.params.id
      );
      res.status(result.status).json(result.data);
    })
  );

  /**
   * GET /questionnaires/:id/versions/:version
   * Get a specific version of a questionnaire
   */
  router.get(
    '/questionnaires/:id/versions/:version',
    asyncHandler(async (req, res) => {
      const version = parseInt(req.params.version, 10);
      const result = await handleGetQuestionnaireVersion(
        questionnaireRepository,
        req.params.id,
        version
      );
      res.status(result.status).json(result.data);
    })
  );

  /**
   * POST /questionnaires/:id/validate
   * Validate answers against a questionnaire
   */
  router.post(
    '/questionnaires/:id/validate',
    asyncHandler(async (req, res) => {
      const result = await handleValidateAnswers(
        questionnaireRepository,
        req.params.id,
        req.body
      );
      res.status(result.status).json(result.data);
    })
  );

  /**
   * POST /questionnaires/:id/visible-questions
   * Get visible questions based on current answers
   */
  router.post(
    '/questionnaires/:id/visible-questions',
    asyncHandler(async (req, res) => {
      const result = await handleGetVisibleQuestions(
        questionnaireRepository,
        req.params.id,
        req.body
      );
      res.status(result.status).json(result.data);
    })
  );

  // Submission endpoints

  /**
   * POST /questionnaires/:id/submissions
   * Submit answers to a questionnaire
   */
  router.post(
    '/questionnaires/:id/submissions',
    asyncHandler(async (req, res) => {
      const result = await handleSubmitAnswers(
        questionnaireRepository,
        submissionRepository,
        req.params.id,
        req.body
      );
      res.status(result.status).json(result.data);
    })
  );

  /**
   * GET /questionnaires/:id/submissions
   * List submissions for a questionnaire
   */
  router.get(
    '/questionnaires/:id/submissions',
    asyncHandler(async (req, res) => {
      const result = await handleListSubmissions(
        submissionRepository,
        req.params.id,
        req.query as any
      );
      res.status(result.status).json(result.data);
    })
  );

  /**
   * GET /submissions/:submissionId
   * Get a specific submission
   */
  router.get(
    '/submissions/:submissionId',
    asyncHandler(async (req, res) => {
      const result = await handleGetSubmission(
        submissionRepository,
        req.params.submissionId
      );
      res.status(result.status).json(result.data);
    })
  );

  /**
   * GET /openapi.json
   * Get OpenAPI 3.0 specification
   */
  router.get('/openapi.json', (req, res) => {
    res.status(200).json(openApiSpec);
  });

  // Apply error handler middleware
  router.use(createErrorHandler());

  return router;
}
