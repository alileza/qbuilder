import type { Pool } from 'pg';
import type { AnswerPayload } from '../schemas/index.js';
import { NotFoundError } from '../errors/index.js';

/**
 * Submission data
 */
export interface Submission {
  id: string;
  questionnaireId: string;
  questionnaireVersion: number;
  answers: AnswerPayload;
  createdAt: Date;
}

/**
 * Submission list options
 */
export interface SubmissionListOptions {
  version?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated submission list result
 */
export interface SubmissionListResult {
  items: Submission[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Submission repository interface
 */
export interface SubmissionRepository {
  create(
    questionnaireId: string,
    version: number,
    answers: AnswerPayload
  ): Promise<Submission>;
  findById(submissionId: string): Promise<Submission | null>;
  listByQuestionnaire(
    questionnaireId: string,
    options?: SubmissionListOptions
  ): Promise<SubmissionListResult>;
}

/**
 * Create a submission repository
 */
export function createSubmissionRepository(pool: Pool): SubmissionRepository {
  return {
    async create(
      questionnaireId: string,
      version: number,
      answers: AnswerPayload
    ): Promise<Submission> {
      try {
        const result = await pool.query(
          `INSERT INTO submissions
           (questionnaire_id, questionnaire_version, answers, created_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, questionnaire_id, questionnaire_version, answers, created_at`,
          [questionnaireId, version, JSON.stringify(answers)]
        );

        const row = result.rows[0];
        return {
          id: row.id,
          questionnaireId: row.questionnaire_id,
          questionnaireVersion: row.questionnaire_version,
          answers: row.answers,
          createdAt: row.created_at,
        };
      } catch (error: any) {
        // Handle foreign key violation
        if (error.code === '23503') {
          throw new NotFoundError(
            `Questionnaire "${questionnaireId}" version ${version} not found`
          );
        }
        throw error;
      }
    },

    async findById(submissionId: string): Promise<Submission | null> {
      const result = await pool.query(
        `SELECT id, questionnaire_id, questionnaire_version, answers, created_at
         FROM submissions
         WHERE id = $1`,
        [submissionId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        questionnaireId: row.questionnaire_id,
        questionnaireVersion: row.questionnaire_version,
        answers: row.answers,
        createdAt: row.created_at,
      };
    },

    async listByQuestionnaire(
      questionnaireId: string,
      options: SubmissionListOptions = {}
    ): Promise<SubmissionListResult> {
      const { version, limit = 50, offset = 0 } = options;

      // Build WHERE clause
      const conditions = ['questionnaire_id = $1'];
      const params: any[] = [questionnaireId];

      if (version !== undefined) {
        conditions.push(`questionnaire_version = $${params.length + 1}`);
        params.push(version);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as total
         FROM submissions
         WHERE ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total, 10);

      // Get submissions
      const result = await pool.query(
        `SELECT id, questionnaire_id, questionnaire_version, answers, created_at
         FROM submissions
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      const items = result.rows.map((row) => ({
        id: row.id,
        questionnaireId: row.questionnaire_id,
        questionnaireVersion: row.questionnaire_version,
        answers: row.answers,
        createdAt: row.created_at,
      }));

      return {
        items,
        total,
        limit,
        offset,
      };
    },
  };
}
