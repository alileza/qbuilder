-- Up
ALTER TABLE questionnaire_versions
    ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}';

ALTER TABLE submissions
    ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}';

-- Down
ALTER TABLE questionnaire_versions DROP COLUMN IF EXISTS metadata;
ALTER TABLE submissions DROP COLUMN IF EXISTS metadata;
