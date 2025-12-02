import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runMigrations, migrations } from '../migrations.js';

describe('Migrations', () => {
  const mockPool = {
    query: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('migrations array', () => {
    it('should have all required migrations', () => {
      expect(migrations).toHaveLength(3);
      expect(migrations[0].name).toBe('001_create_questionnaires');
      expect(migrations[1].name).toBe('002_create_submissions');
      expect(migrations[2].name).toBe('003_add_metadata_column');
    });

    it('should have up and down SQL for each migration', () => {
      for (const migration of migrations) {
        expect(migration.up).toBeDefined();
        expect(migration.up.length).toBeGreaterThan(0);
        expect(migration.down).toBeDefined();
        expect(migration.down.length).toBeGreaterThan(0);
      }
    });
  });

  describe('runMigrations', () => {
    it('should create migrations table if it does not exist', async () => {
      // Mock: no applied migrations
      mockPool.query
        .mockResolvedValueOnce({}) // Create migrations table
        .mockResolvedValueOnce({ rows: [] }) // Get applied migrations
        .mockResolvedValueOnce({}) // Run migration 1
        .mockResolvedValueOnce({}) // Mark migration 1 applied
        .mockResolvedValueOnce({}) // Run migration 2
        .mockResolvedValueOnce({}) // Mark migration 2 applied
        .mockResolvedValueOnce({}) // Run migration 3
        .mockResolvedValueOnce({}); // Mark migration 3 applied

      const result = await runMigrations(mockPool as any);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS qbuilder_migrations')
      );
      expect(result.executed).toEqual([
        '001_create_questionnaires',
        '002_create_submissions',
        '003_add_metadata_column',
      ]);
      expect(result.skipped).toEqual([]);
    });

    it('should skip already applied migrations', async () => {
      // Mock: first two migrations already applied
      mockPool.query
        .mockResolvedValueOnce({}) // Create migrations table
        .mockResolvedValueOnce({
          rows: [
            { name: '001_create_questionnaires' },
            { name: '002_create_submissions' },
          ],
        }) // Get applied migrations
        .mockResolvedValueOnce({}) // Run migration 3
        .mockResolvedValueOnce({}); // Mark migration 3 applied

      const result = await runMigrations(mockPool as any);

      expect(result.executed).toEqual(['003_add_metadata_column']);
      expect(result.skipped).toEqual([
        '001_create_questionnaires',
        '002_create_submissions',
      ]);
    });

    it('should skip all migrations if all are applied', async () => {
      // Mock: all migrations already applied
      mockPool.query
        .mockResolvedValueOnce({}) // Create migrations table
        .mockResolvedValueOnce({
          rows: [
            { name: '001_create_questionnaires' },
            { name: '002_create_submissions' },
            { name: '003_add_metadata_column' },
          ],
        }); // Get applied migrations

      const result = await runMigrations(mockPool as any);

      expect(result.executed).toEqual([]);
      expect(result.skipped).toEqual([
        '001_create_questionnaires',
        '002_create_submissions',
        '003_add_metadata_column',
      ]);
    });

    it('should record applied migrations', async () => {
      mockPool.query
        .mockResolvedValueOnce({}) // Create migrations table
        .mockResolvedValueOnce({ rows: [] }) // Get applied migrations
        .mockResolvedValueOnce({}) // Run migration 1
        .mockResolvedValueOnce({}) // Mark migration 1 applied
        .mockResolvedValueOnce({}) // Run migration 2
        .mockResolvedValueOnce({}) // Mark migration 2 applied
        .mockResolvedValueOnce({}) // Run migration 3
        .mockResolvedValueOnce({}); // Mark migration 3 applied

      await runMigrations(mockPool as any);

      // Check that each migration was marked as applied
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO qbuilder_migrations'),
        ['001_create_questionnaires']
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO qbuilder_migrations'),
        ['002_create_submissions']
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO qbuilder_migrations'),
        ['003_add_metadata_column']
      );
    });
  });
});
