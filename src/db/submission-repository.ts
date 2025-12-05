import type { Pool } from 'pg';
import type { AnswerPayload } from '../schemas/index.js';
import { NotFoundError } from '../errors/index.js';
import type { Metadata, RepositoryOptions } from './questionnaire-repository.js';
import { DEFAULT_TABLE_PREFIX } from './migrations.js';

/**
 * Submission data
 */
export interface Submission {
  id: string;
  questionnaireId: string;
  questionnaireVersion: number;
  answers: AnswerPayload;
  metadata: Metadata;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
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
 * Options for creating a submission
 */
export interface CreateSubmissionOptions {
  metadata?: Metadata;
}

/**
 * Options for updating a submission
 */
export interface UpdateSubmissionOptions {
  answers?: AnswerPayload;
  metadata?: Metadata;
}

/**
 * Submission repository interface
 */
export interface SubmissionRepository {
  create(
    questionnaireId: string,
    version: number,
    answers: AnswerPayload,
    options?: CreateSubmissionOptions
  ): Promise<Submission>;
  findById(submissionId: string): Promise<Submission | null>;
  listByQuestionnaire(
    questionnaireId: string,
    options?: SubmissionListOptions
  ): Promise<SubmissionListResult>;
  update(
    submissionId: string,
    options: UpdateSubmissionOptions
  ): Promise<Submission>;
  softDelete(submissionId: string): Promise<void>;
}

/**
 * Create a submission repository
 *
 * @param pool - PostgreSQL connection pool
 * @param options - Repository options including table prefix
 */
export function createSubmissionRepository(
  pool: Pool,
  options: RepositoryOptions = {}
): SubmissionRepository {
  const prefix = options.tablePrefix ?? DEFAULT_TABLE_PREFIX;
  const submissionsTable = `${prefix}submissions`;

  return {
    async create(
      questionnaireId: string,
      version: number,
      answers: AnswerPayload,
      opts: CreateSubmissionOptions = {}
    ): Promise<Submission> {
      const metadata = opts.metadata || {};
      try {
        const result = await pool.query(
          `INSERT INTO ${submissionsTable}
           (questionnaire_id, questionnaire_version, answers, metadata, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id, questionnaire_id, questionnaire_version, answers, metadata, created_at, updated_at, deleted_at`,
          [questionnaireId, version, JSON.stringify(answers), JSON.stringify(metadata)]
        );

        const row = result.rows[0];
        return {
          id: row.id,
          questionnaireId: row.questionnaire_id,
          questionnaireVersion: row.questionnaire_version,
          answers: row.answers,
          metadata: row.metadata,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
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
        `SELECT id, questionnaire_id, questionnaire_version, answers, metadata, created_at, updated_at, deleted_at
         FROM ${submissionsTable}
         WHERE id = $1 AND deleted_at IS NULL`,
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
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      };
    },

    async listByQuestionnaire(
      questionnaireId: string,
      opts: SubmissionListOptions = {}
    ): Promise<SubmissionListResult> {
      const { version, limit = 50, offset = 0 } = opts;

      // Build WHERE clause - always exclude soft-deleted
      const conditions = ['questionnaire_id = $1', 'deleted_at IS NULL'];
      const params: any[] = [questionnaireId];

      if (version !== undefined) {
        conditions.push(`questionnaire_version = $${params.length + 1}`);
        params.push(version);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as total
         FROM ${submissionsTable}
         WHERE ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total, 10);

      // Get submissions
      const result = await pool.query(
        `SELECT id, questionnaire_id, questionnaire_version, answers, metadata, created_at, updated_at, deleted_at
         FROM ${submissionsTable}
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
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));

      return {
        items,
        total,
        limit,
        offset,
      };
    },

    async update(
      submissionId: string,
      opts: UpdateSubmissionOptions
    ): Promise<Submission> {
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: any[] = [];

      if (opts.answers !== undefined) {
        params.push(JSON.stringify(opts.answers));
        setClauses.push(`answers = $${params.length}`);
      }

      if (opts.metadata !== undefined) {
        params.push(JSON.stringify(opts.metadata));
        setClauses.push(`metadata = $${params.length}`);
      }

      params.push(submissionId);

      const result = await pool.query(
        `UPDATE ${submissionsTable}
         SET ${setClauses.join(', ')}
         WHERE id = $${params.length} AND deleted_at IS NULL
         RETURNING id, questionnaire_id, questionnaire_version, answers, metadata, created_at, updated_at, deleted_at`,
        params
      );

      if (result.rows.length === 0) {
        throw new NotFoundError(`Submission "${submissionId}" not found`);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        questionnaireId: row.questionnaire_id,
        questionnaireVersion: row.questionnaire_version,
        answers: row.answers,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      };
    },

    async softDelete(submissionId: string): Promise<void> {
      const result = await pool.query(
        `UPDATE ${submissionsTable}
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL`,
        [submissionId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError(`Submission "${submissionId}" not found`);
      }
    },
  };
}
