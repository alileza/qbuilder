import type { Pool } from 'pg';
import type { QuestionnaireDefinition } from '../schemas/index.js';
import { NotFoundError, ConflictError } from '../errors/index.js';

/**
 * Metadata type (arbitrary JSON object)
 */
export type Metadata = Record<string, unknown>;

/**
 * Questionnaire with version metadata
 */
export interface QuestionnaireWithVersion extends QuestionnaireDefinition {
  version: number;
  createdAt: Date;
  metadata: Metadata;
}

/**
 * Version metadata
 */
export interface VersionMetadata {
  version: number;
  createdAt: Date;
}

/**
 * Questionnaire list item
 */
export interface QuestionnaireListItem {
  id: string;
  title: string;
  latestVersion: number;
  createdAt: Date;
}

/**
 * Options for creating a questionnaire
 */
export interface CreateQuestionnaireOptions {
  metadata?: Metadata;
}

/**
 * Options for updating a questionnaire
 */
export interface UpdateQuestionnaireOptions {
  metadata?: Metadata;
}

/**
 * Questionnaire repository interface
 */
export interface QuestionnaireRepository {
  create(definition: QuestionnaireDefinition, options?: CreateQuestionnaireOptions): Promise<QuestionnaireWithVersion>;
  findById(id: string): Promise<QuestionnaireWithVersion | null>;
  findByIdAndVersion(id: string, version: number): Promise<QuestionnaireWithVersion | null>;
  update(id: string, definition: QuestionnaireDefinition, options?: UpdateQuestionnaireOptions): Promise<QuestionnaireWithVersion>;
  listVersions(id: string): Promise<VersionMetadata[]>;
  list(): Promise<QuestionnaireListItem[]>;
}

/**
 * Create a questionnaire repository
 */
export function createQuestionnaireRepository(pool: Pool): QuestionnaireRepository {
  return {
    async create(definition: QuestionnaireDefinition, options: CreateQuestionnaireOptions = {}): Promise<QuestionnaireWithVersion> {
      const client = await pool.connect();
      const metadata = options.metadata || {};
      try {
        await client.query('BEGIN');

        // Insert into questionnaires table
        await client.query(
          'INSERT INTO questionnaires (id, created_at, updated_at) VALUES ($1, NOW(), NOW())',
          [definition.id]
        );

        // Insert version 1
        const result = await client.query(
          `INSERT INTO questionnaire_versions
           (questionnaire_id, version, title, description, definition, metadata, created_at)
           VALUES ($1, 1, $2, $3, $4, $5, NOW())
           RETURNING version, created_at, metadata`,
          [
            definition.id,
            definition.title,
            definition.description || null,
            JSON.stringify(definition),
            JSON.stringify(metadata),
          ]
        );

        await client.query('COMMIT');

        return {
          ...definition,
          version: result.rows[0].version,
          createdAt: result.rows[0].created_at,
          metadata: result.rows[0].metadata,
        };
      } catch (error: any) {
        await client.query('ROLLBACK');

        // Handle duplicate key error
        if (error.code === '23505') {
          throw new ConflictError(`Questionnaire with id "${definition.id}" already exists`);
        }

        throw error;
      } finally {
        client.release();
      }
    },

    async findById(id: string): Promise<QuestionnaireWithVersion | null> {
      const result = await pool.query(
        `SELECT definition, version, created_at, metadata
         FROM questionnaire_versions
         WHERE questionnaire_id = $1
         ORDER BY version DESC
         LIMIT 1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row.definition,
        version: row.version,
        createdAt: row.created_at,
        metadata: row.metadata || {},
      };
    },

    async findByIdAndVersion(id: string, version: number): Promise<QuestionnaireWithVersion | null> {
      const result = await pool.query(
        `SELECT definition, version, created_at, metadata
         FROM questionnaire_versions
         WHERE questionnaire_id = $1 AND version = $2`,
        [id, version]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row.definition,
        version: row.version,
        createdAt: row.created_at,
        metadata: row.metadata || {},
      };
    },

    async update(id: string, definition: QuestionnaireDefinition, options: UpdateQuestionnaireOptions = {}): Promise<QuestionnaireWithVersion> {
      const client = await pool.connect();
      const metadata = options.metadata || {};
      try {
        await client.query('BEGIN');

        // Check if questionnaire exists
        const existsResult = await client.query(
          'SELECT id FROM questionnaires WHERE id = $1',
          [id]
        );

        if (existsResult.rows.length === 0) {
          throw new NotFoundError(`Questionnaire with id "${id}" not found`);
        }

        // Get current max version
        const versionResult = await client.query(
          'SELECT MAX(version) as max_version FROM questionnaire_versions WHERE questionnaire_id = $1',
          [id]
        );

        const nextVersion = (versionResult.rows[0].max_version || 0) + 1;

        // Insert new version
        const result = await client.query(
          `INSERT INTO questionnaire_versions
           (questionnaire_id, version, title, description, definition, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING version, created_at, metadata`,
          [
            id,
            nextVersion,
            definition.title,
            definition.description || null,
            JSON.stringify(definition),
            JSON.stringify(metadata),
          ]
        );

        // Update questionnaire updated_at
        await client.query(
          'UPDATE questionnaires SET updated_at = NOW() WHERE id = $1',
          [id]
        );

        await client.query('COMMIT');

        return {
          ...definition,
          id,
          version: result.rows[0].version,
          createdAt: result.rows[0].created_at,
          metadata: result.rows[0].metadata,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    async listVersions(id: string): Promise<VersionMetadata[]> {
      const result = await pool.query(
        `SELECT version, created_at
         FROM questionnaire_versions
         WHERE questionnaire_id = $1
         ORDER BY version ASC`,
        [id]
      );

      return result.rows.map((row) => ({
        version: row.version,
        createdAt: row.created_at,
      }));
    },

    async list(): Promise<QuestionnaireListItem[]> {
      const result = await pool.query(
        `SELECT
           q.id,
           qv.title,
           MAX(qv.version) as latest_version,
           q.created_at
         FROM questionnaires q
         JOIN questionnaire_versions qv ON q.id = qv.questionnaire_id
         GROUP BY q.id, qv.title, q.created_at
         ORDER BY q.created_at DESC`
      );

      return result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        latestVersion: row.latest_version,
        createdAt: row.created_at,
      }));
    },
  };
}
