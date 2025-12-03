# QBuilder Architecture Diagrams

This document contains visual diagrams representing the QBuilder questionnaire engine architecture, data flow, and user interactions.

## Table of Contents

- [Sequence Diagram](#sequence-diagram---submit-answers-flow)
- [Class Diagram](#class-diagram)
- [Architecture Diagram](#architecture-diagram)
- [Overview Diagram](#overview-diagram)
- [User Journey](#user-journey-diagram)
- [Data Flow Diagram](#data-flow-diagram)
- [State Diagram](#state-diagram---questionnaire-lifecycle)

---

## Sequence Diagram - Submit Answers Flow

Shows the complete flow when a user submits answers to a questionnaire.

```mermaid
sequenceDiagram
    participant U as User/Client
    participant API as API Router
    participant H as Handler
    participant QR as QuestionnaireRepo
    participant E as Engine
    participant SR as SubmissionRepo
    participant DB as PostgreSQL

    U->>API: POST /questionnaires/:id/submissions
    API->>H: handleSubmitAnswers(req, res)
    H->>QR: findById(id)
    QR->>DB: SELECT questionnaire
    DB-->>QR: questionnaire data
    QR-->>H: QuestionnaireWithVersion

    H->>E: getVisibleQuestions(questionnaire, answers)
    E->>E: evaluateCondition() for each question
    E-->>H: visible questions list

    H->>E: buildAnswerSchema(questionnaire, answers)
    E->>E: Create Zod schema dynamically
    E-->>H: Zod schema

    H->>E: validateAnswers(questionnaire, answers)
    E->>E: schema.safeParse(answers)
    E-->>H: ValidationResult

    alt Validation Success
        H->>SR: create(id, version, answers, metadata)
        SR->>DB: INSERT submission
        DB-->>SR: submission record
        SR-->>H: Submission
        H-->>API: 201 { submission }
        API-->>U: Submission ID
    else Validation Failed
        H-->>API: 400 ValidationError
        API-->>U: Error details
    end
```

---

## Class Diagram

Shows the main data structures and their relationships.

```mermaid
classDiagram
    class QuestionnaireDefinition {
        +string id
        +string title
        +string? description
        +SectionDefinition[] sections
        +QuestionDefinition[] questions
    }

    class SectionDefinition {
        +string id
        +string title
        +string? description
        +string[] questionIds
        +VisibleIf? visibleIf
    }

    class QuestionDefinition {
        <<interface>>
        +string id
        +string type
        +string label
        +string? description
        +boolean required
        +VisibleIf? visibleIf
    }

    class TextQuestion {
        +string type = "text"
        +number? maxLength
        +boolean? multiline
    }

    class ChoiceQuestion {
        +string type = "choice"
        +ChoiceOption[] options
        +boolean? multiple
    }

    class ChoiceOption {
        +string value
        +string label
    }

    class VisibleIf {
        +Condition[]? all
        +Condition[]? any
    }

    class Condition {
        +string questionId
        +Operator operator
        +unknown? value
    }

    class Submission {
        +UUID id
        +string questionnaireId
        +number questionnaireVersion
        +Record~string,unknown~ answers
        +Record~string,unknown~? metadata
        +Date createdAt
    }

    class QuestionnaireRepository {
        +create(definition, options) QuestionnaireWithVersion
        +findById(id) QuestionnaireWithVersion?
        +findByIdAndVersion(id, version) QuestionnaireWithVersion?
        +update(id, definition, options) QuestionnaireWithVersion
        +listVersions(id) VersionMetadata[]
        +list() QuestionnaireListItem[]
    }

    class SubmissionRepository {
        +create(id, version, answers, options) Submission
        +findById(submissionId) Submission?
        +listByQuestionnaire(id, options) SubmissionListResult
    }

    QuestionnaireDefinition "1" *-- "*" SectionDefinition
    QuestionnaireDefinition "1" *-- "*" QuestionDefinition
    SectionDefinition "1" *-- "0..1" VisibleIf
    QuestionDefinition "1" *-- "0..1" VisibleIf
    VisibleIf "1" *-- "*" Condition
    QuestionDefinition <|-- TextQuestion
    QuestionDefinition <|-- ChoiceQuestion
    ChoiceQuestion "1" *-- "*" ChoiceOption
    QuestionnaireRepository ..> QuestionnaireDefinition
    SubmissionRepository ..> Submission
```

---

## Architecture Diagram

Shows the layered architecture and component dependencies.

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        WEB[Web App]
        MOBILE[Mobile App]
        CLI[CLI Tool]
    end

    subgraph API["API Layer"]
        ROUTER[Express Router]
        MW[Error Middleware]
        OPENAPI[OpenAPI Spec]
    end

    subgraph Handlers["Request Handlers"]
        QH[Questionnaire Handler]
        SH[Submission Handler]
    end

    subgraph Engine["Core Engine"]
        VAL[Validation Engine]
        VIS[Visibility Engine]
        CYCLE[Cycle Detection]
    end

    subgraph Registry["Registry"]
        REG[Answer Schema Registry]
        TEXT_B[Text Builder]
        CHOICE_B[Choice Builder]
    end

    subgraph Schemas["Schema Layer"]
        ZOD[Zod Schemas]
        QUEST_S[Questionnaire Schema]
        ANS_S[Answer Schema]
    end

    subgraph Data["Data Layer"]
        QR[Questionnaire Repository]
        SR[Submission Repository]
        MIG[Migrations]
    end

    subgraph Storage["Storage"]
        PG[(PostgreSQL)]
    end

    WEB & MOBILE & CLI --> ROUTER
    ROUTER --> MW
    ROUTER --> OPENAPI
    ROUTER --> QH & SH

    QH --> VAL & VIS
    SH --> VAL & VIS

    VAL --> REG
    VAL --> ZOD
    VIS --> CYCLE

    REG --> TEXT_B & CHOICE_B
    ZOD --> QUEST_S & ANS_S

    QH --> QR
    SH --> SR
    QR & SR --> MIG
    MIG --> PG
```

---

## Overview Diagram

High-level view of system components and features.

```mermaid
flowchart LR
    subgraph Input["Input Sources"]
        JSON[JSON Files]
        API_IN[API Requests]
        CODE[Programmatic]
    end

    subgraph QBuilder["QBuilder Core"]
        direction TB
        INIT[Initialization]
        PARSE[Parser]
        ENGINE[Engine]
        VALID[Validator]
    end

    subgraph Features["Key Features"]
        BRANCH[Conditional Branching]
        VERSION[Versioning]
        EXTEND[Extensibility]
        TYPED[Type Safety]
    end

    subgraph Output["Output"]
        REST[REST API]
        DB_OUT[(Database)]
        TYPES[TypeScript Types]
    end

    JSON --> INIT
    API_IN --> PARSE
    CODE --> PARSE

    INIT --> ENGINE
    PARSE --> ENGINE
    ENGINE --> VALID

    ENGINE --> BRANCH & VERSION & EXTEND & TYPED

    VALID --> REST
    VALID --> DB_OUT
    PARSE --> TYPES
```

---

## User Journey Diagram

Shows how admins and users interact with the system.

```mermaid
journey
    title User Journey: Creating and Completing a Survey
    section Admin Creates Questionnaire
        Define questions: 5: Admin
        Set conditional logic: 4: Admin
        Upload to system: 5: Admin, System
        System validates structure: 5: System
        Store with version 1: 5: System
    section User Fills Survey
        Request questionnaire: 5: User
        Receive visible questions: 5: System
        Answer first question: 5: User
        System updates visibility: 4: System
        Conditional questions appear: 4: User, System
        Complete all answers: 5: User
        Submit answers: 5: User
    section System Validates
        Check answer types: 5: System
        Validate required fields: 5: System
        Store submission: 5: System
        Return confirmation: 5: User
```

---

## Data Flow Diagram

Shows how data moves through processing stages.

```mermaid
flowchart TD
    subgraph Creation["Questionnaire Creation"]
        DEF[Definition JSON]
        PARSE_Q[parseQuestionnaire]
        CYCLE_CHK[detectCycles]
        REPO_CREATE[repository.create]
    end

    subgraph Validation["Answer Validation"]
        ANS[User Answers]
        GET_VIS[getVisibleQuestions]
        BUILD[buildAnswerSchema]
        ZOD_VAL[Zod Validation]
    end

    subgraph Storage["Persistence"]
        Q_TABLE[(questionnaires)]
        V_TABLE[(versions)]
        S_TABLE[(submissions)]
    end

    DEF --> PARSE_Q
    PARSE_Q --> CYCLE_CHK
    CYCLE_CHK -->|No cycles| REPO_CREATE
    REPO_CREATE --> Q_TABLE
    REPO_CREATE --> V_TABLE

    ANS --> GET_VIS
    GET_VIS --> BUILD
    BUILD --> ZOD_VAL
    ZOD_VAL -->|Valid| S_TABLE
    ZOD_VAL -->|Invalid| ERR[ValidationError]
```

---

## State Diagram - Questionnaire Lifecycle

Shows the different states a questionnaire can be in.

```mermaid
stateDiagram-v2
    [*] --> Draft: Create definition
    Draft --> Validating: Submit for validation
    Validating --> Invalid: Schema/cycle errors
    Invalid --> Draft: Fix errors
    Validating --> Version1: Validation passed
    Version1 --> Active: Deploy
    Active --> Updating: Modify definition
    Updating --> Validating: Re-validate
    Validating --> VersionN: New version created
    VersionN --> Active: Deploy new version
    Active --> Archived: Deprecate
    Archived --> [*]

    note right of Active
        Submissions can only
        be made to Active
        questionnaires
    end note
```
