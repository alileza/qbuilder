# Product Requirements Document
Modular Questionnaire Engine (Backend, TypeScript, Zod-Based)

## 1. Purpose

Create a backend-driven, modular questionnaire system capable of:

1. Defining questionnaires and all question types via structured JSON.
2. Validating questionnaire definitions at runtime.
3. Validating user answers with strict, type-specific rules.
4. Supporting branching logic ("visibleIf") to show or hide questions dynamically.
5. Allowing new question types to be added without rewriting core logic.
6. Versioning questionnaires to support updates without breaking existing submissions.
7. Organizing questions into logical sections.

The system must be resilient, predictable, and easy for frontend clients to integrate with.


## 2. Core Concepts

### 2.1 Questionnaire Definition
A questionnaire is a structured document containing metadata, sections, and an ordered list of questions. It is submitted or loaded as JSON and validated using Zod schemas.

### 2.2 Section Definition
A section groups related questions together. Each section includes:
- A unique `id`
- A human-facing `title`
- Optional `description`
- An ordered list of `questionIds` belonging to this section

### 2.3 Question Definition
Each question includes:
- A unique `id`
- A human-facing `label`
- A `type` (discriminant)
- Optional `required` flag
- Optional `helpText`
- Optional `visibleIf` (branching rules)
- Type-specific configuration

### 2.4 Answer Payload
Client answers are submitted as a key/value map using question IDs as keys.

### 2.5 Branching
Each question may declare rules that determine whether it should be shown based on prior answers.

### 2.6 Versioning
Each questionnaire has a `version` number. When a questionnaire is updated, a new version is created. Submissions are linked to a specific version, ensuring historical integrity.


## 3. Functional Requirements

### 3.1 Questionnaire Definition Validation
The system must use Zod to enforce:

- Valid structure of the questionnaire
- Valid structure of each section
- Valid structure of each question type
- Valid branching rules (`visibleIf`)
- No cyclic dependencies in `visibleIf` conditions

Invalid definitions must be rejected cleanly.


### 3.2 Supported Question Types (Initial Release)

#### TextQuestion
```json
{
  "id": "string",
  "type": "text",
  "label": "string",
  "required": true,
  "multiline": false,
  "maxLength": 200,
  "visibleIf": {}
}
```

#### ChoiceQuestion
```json
{
  "id": "string",
  "type": "choice",
  "label": "string",
  "required": true,
  "multiple": false,
  "options": [{ "value": "x", "label": "X" }],
  "visibleIf": {}
}
```

#### Future Type: RatingQuestion
(Extensible via plugin architecture)


### 3.3 Section Structure

```json
{
  "id": "section_1",
  "title": "Personal Information",
  "description": "Please provide your basic details",
  "questionIds": ["q1", "q2", "q3"]
}
```

Sections are optional. If no sections are defined, all questions are treated as belonging to a single implicit section.


### 3.4 Branching Logic (`visibleIf`)
A question may include:

```json
{
  "visibleIf": {
    "all": [Condition],
    "any": [Condition]
  }
}
```

A question is visible if:
- `all` is empty or all conditions in `all` return true, AND
- `any` is empty or at least one condition in `any` returns true.

If both `all` and `any` are empty or omitted, the question is always visible.

#### Supported Condition Operators
- `equals`
- `notEquals`
- `in`
- `notIn`
- `gt`, `gte`, `lt`, `lte`
- `isAnswered`
- `notAnswered`

Each condition references another question ID.

#### Cyclic Dependency Detection
During questionnaire validation, the system must detect and reject cyclic dependencies in `visibleIf` conditions. A cycle occurs when question A depends on question B, which depends on question A (directly or transitively).


### 3.5 Answer Validation

Validation must:

1. Determine visible questions for the given answers.
2. Build a Zod schema **only for the visible questions**.
3. Validate:
   - Required fields
   - Type-specific constraints
   - Choice membership
4. Ignore or drop answers for invisible questions.

Validation errors must be structured and clear.


### 3.6 Dynamic Visibility Computation
Must expose:

```ts
getVisibleQuestions(
  questionnaire: QuestionnaireDefinition,
  answers: Record<string, unknown>
): QuestionDefinition[];
```

Uses:
- `evaluateCondition(condition, answers)`
- `isQuestionVisible(question, answers)`


### 3.7 Answer Schema Registry

Define per-type validators:

```ts
type AnswerSchemaBuilder = (q: QuestionDefinition) => ZodTypeAny;
```

Registry structure:

```ts
const answerSchemaRegistry = {
  text: builderFn,
  choice: builderFn
};
```

Enables simple addition of new types.


## 4. REST API

### 4.1 Questionnaire Endpoints

#### Create Questionnaire
```
POST /api/questionnaires
Content-Type: application/json

Request Body: QuestionnaireDefinition (without version)
Response: { id, version: 1, createdAt }
```

#### Get Questionnaire (Latest Version)
```
GET /api/questionnaires/:id

Response: QuestionnaireDefinition (with version)
```

#### Get Questionnaire (Specific Version)
```
GET /api/questionnaires/:id/versions/:version

Response: QuestionnaireDefinition
```

#### Update Questionnaire (Creates New Version)
```
PUT /api/questionnaires/:id
Content-Type: application/json

Request Body: QuestionnaireDefinition
Response: { id, version: N+1, createdAt }
```

#### List Questionnaire Versions
```
GET /api/questionnaires/:id/versions

Response: [{ version, createdAt, updatedAt }]
```

#### List All Questionnaires
```
GET /api/questionnaires

Response: [{ id, title, latestVersion, createdAt }]
```


### 4.2 Submission Endpoints

#### Submit Answers
```
POST /api/questionnaires/:id/submissions
Content-Type: application/json

Request Body: {
  version?: number,  // optional, defaults to latest
  answers: Record<string, unknown>
}
Response: { submissionId, questionnaireId, version, createdAt }
```

#### Get Submission
```
GET /api/submissions/:submissionId

Response: { submissionId, questionnaireId, version, answers, createdAt }
```

#### List Submissions for Questionnaire
```
GET /api/questionnaires/:id/submissions?version=N&limit=50&offset=0

Response: { items: [...], total, limit, offset }
```


### 4.3 Utility Endpoints

#### Validate Answers (Dry Run)
```
POST /api/questionnaires/:id/validate
Content-Type: application/json

Request Body: { version?: number, answers: Record<string, unknown> }
Response: { valid: boolean, errors?: [...] }
```

#### Get Visible Questions
```
POST /api/questionnaires/:id/visible-questions
Content-Type: application/json

Request Body: { version?: number, answers: Record<string, unknown> }
Response: { questions: QuestionDefinition[], sections: SectionDefinition[] }
```


### 4.4 Error Response Format

All API errors follow this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [
      {
        "field": "answers.q1",
        "code": "REQUIRED",
        "message": "This field is required"
      }
    ]
  }
}
```

Error Codes:
- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Version conflict or duplicate
- `CYCLIC_DEPENDENCY` - Circular reference in visibleIf
- `INTERNAL_ERROR` - Server error


## 5. Database Schema (PostgreSQL)

### 5.1 Tables

#### questionnaires
```sql
CREATE TABLE questionnaires (
    id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### questionnaire_versions
```sql
CREATE TABLE questionnaire_versions (
    id SERIAL PRIMARY KEY,
    questionnaire_id VARCHAR(255) NOT NULL REFERENCES questionnaires(id),
    version INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,  -- Full questionnaire JSON (sections, questions)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(questionnaire_id, version)
);

CREATE INDEX idx_qv_questionnaire_id ON questionnaire_versions(questionnaire_id);
CREATE INDEX idx_qv_questionnaire_version ON questionnaire_versions(questionnaire_id, version);
```

#### submissions
```sql
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
```


### 5.2 Example Migration Files

#### Migration: 001_create_questionnaires.sql
```sql
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
```

#### Migration: 002_create_submissions.sql
```sql
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
```


## 6. Core Library Functions

### Public Functions

#### parseQuestionnaire(payload)
- Validates questionnaire JSON.
- Detects cyclic dependencies.
- Returns typed object.

#### getVisibleQuestions(questionnaire, answers)
- Applies branching rules.
- Returns visible questions.

#### getVisibleSections(questionnaire, answers)
- Returns sections containing at least one visible question.

#### validateAnswers(questionnaire, answers)
- Computes visible questions.
- Validates answer payload against type-specific schemas.


## 7. Extensibility Requirements

Adding a new question type must require only:

1. Adding a Zod schema for the type.
2. Adding it to the question-type discriminated union.
3. Registering an answer validation builder.

No other modification should be required.


## 8. Data Flow

### 8.1 Questionnaire Creation
1. Receive JSON via POST /api/questionnaires
2. Validate via Zod (including cyclic dependency check)
3. Store in PostgreSQL with version 1
4. Return questionnaire ID and version

### 8.2 Questionnaire Update
1. Receive JSON via PUT /api/questionnaires/:id
2. Validate via Zod
3. Increment version number
4. Store new version in PostgreSQL
5. Return new version number

### 8.3 Answer Submission
1. Receive answer payload via POST
2. Load questionnaire definition (specific version)
3. Compute visible questions
4. Build dynamic validation schema
5. Validate
6. Store submission in PostgreSQL
7. Return submission ID or errors


## 9. Error Handling

Errors must identify:

- Invalid question configuration
- Invalid or cyclic conditions
- Missing required answers
- Wrong data types
- Option mismatches
- Unsupported operations
- Version not found
- Questionnaire not found

Errors must be JSON-safe and consistent with the error format in section 4.4.


## 10. Non-Functional Requirements

- Must run in Node 18+
- PostgreSQL 14+
- Fully typed in TypeScript
- Deterministic behavior
- Unit tests covering:
  - Branching
  - Schema validation
  - Registry behavior
  - Extensibility
  - Cyclic dependency detection
- Integration tests for API endpoints


## 11. Example Questionnaire (with Sections)

```json
{
  "id": "car_survey",
  "title": "Car Ownership Survey",
  "description": "A survey about car ownership and preferences",
  "sections": [
    {
      "id": "personal",
      "title": "Personal Information",
      "questionIds": ["q1"]
    },
    {
      "id": "car_details",
      "title": "Car Details",
      "description": "Tell us about your car ownership",
      "questionIds": ["q2", "q3", "q4"]
    }
  ],
  "questions": [
    {
      "id": "q1",
      "type": "text",
      "label": "What is your name?",
      "required": true
    },
    {
      "id": "q2",
      "type": "choice",
      "label": "Do you own a car?",
      "required": true,
      "options": [
        { "value": "yes", "label": "Yes" },
        { "value": "no", "label": "No" }
      ]
    },
    {
      "id": "q3",
      "type": "text",
      "label": "What brand is your car?",
      "required": true,
      "visibleIf": {
        "all": [
          { "questionId": "q2", "operator": "equals", "value": "yes" }
        ]
      }
    },
    {
      "id": "q4",
      "type": "text",
      "label": "Why do you not own a car?",
      "visibleIf": {
        "all": [
          { "questionId": "q2", "operator": "equals", "value": "no" }
        ]
      }
    }
  ]
}
```


## 12. Developer Tasks

### Task 1: Project Setup
- Initialize TypeScript project
- Configure PostgreSQL connection
- Set up migration tooling (e.g., node-pg-migrate or similar)
- Run initial migrations

### Task 2: Implement Zod Schemas
- QuestionnaireDefinition
- SectionDefinition
- QuestionDefinition union
- Condition & VisibleIf
- Cyclic dependency detection

### Task 3: Implement Branching Logic
- evaluateCondition
- isQuestionVisible
- getVisibleQuestions
- getVisibleSections

### Task 4: Implement Answer Schema Registry
- Registry structure
- Builders for TextQuestion, ChoiceQuestion

### Task 5: Implement Dynamic Answer Validation
- buildAnswerSchema
- validateAnswers

### Task 6: Implement Database Layer
- Repository pattern for questionnaires
- Repository pattern for submissions
- Version management logic

### Task 7: Implement REST API
- Express/Fastify router setup
- Questionnaire CRUD endpoints
- Submission endpoints
- Validation endpoints
- Error handling middleware

### Task 8: Error Handling
- Standardized error format
- Error code constants

### Task 9: Unit Tests
- Schema tests
- Branching tests
- Validation tests
- Cyclic dependency tests
- Extensibility tests

### Task 10: Integration Tests
- API endpoint tests
- Database integration tests
