-- Up
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id VARCHAR(255) NOT NULL REFERENCES questionnaires(id),
    questionnaire_version INTEGER NOT NULL,
    answers JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (questionnaire_id, questionnaire_version)
        REFERENCES questionnaire_versions(questionnaire_id, version)
);

CREATE INDEX idx_submissions_questionnaire ON submissions(questionnaire_id);
CREATE INDEX idx_submissions_questionnaire_version ON submissions(questionnaire_id, questionnaire_version);
CREATE INDEX idx_submissions_created_at ON submissions(created_at);

-- Down
DROP TABLE IF EXISTS submissions;
