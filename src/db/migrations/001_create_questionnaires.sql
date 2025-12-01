-- Up
CREATE TABLE questionnaires (
    id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE questionnaire_versions (
    id SERIAL PRIMARY KEY,
    questionnaire_id VARCHAR(255) NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(questionnaire_id, version)
);

CREATE INDEX idx_qv_questionnaire_id ON questionnaire_versions(questionnaire_id);
CREATE INDEX idx_qv_questionnaire_version ON questionnaire_versions(questionnaire_id, version);

-- Down
DROP TABLE IF EXISTS questionnaire_versions;
DROP TABLE IF EXISTS questionnaires;
