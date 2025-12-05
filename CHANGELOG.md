# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-01

### Added

#### Core Features
- **Questionnaire Engine**: Parse, validate, and manage questionnaires with branching logic
- **Branching Logic**: 10 condition operators (equals, notEquals, in, notIn, gt, gte, lt, lte, isAnswered, notAnswered)
- **Visibility Rules**: Support for `all` (AND) and `any` (OR) condition combinations
- **Runtime Validation**: Zod-based validation with custom error messages
- **Cyclic Dependency Detection**: Automatic detection and prevention of circular dependencies

#### Question Types
- **Text Questions**: Support for single-line and multiline text with maxLength validation
- **Choice Questions**: Single and multiple choice with custom options
- **Extensible Registry**: Easy addition of custom question types via `registerAnswerBuilder`

#### Database Layer
- **PostgreSQL Support**: Store questionnaires and submissions
- **Version Management**: Immutable questionnaire versions
- **Repositories**: QuestionnaireRepository and SubmissionRepository
- **Migrations**: SQL migration files for database setup
- **Pagination**: Built-in pagination support for listing submissions

#### REST API
- **Express Router**: Ready-to-use router with 11 endpoints
- **CRUD Operations**: Full create, read, update, list operations
- **Validation Endpoints**: Dedicated endpoints for validation and visibility
- **OpenAPI Specification**: Auto-generated OpenAPI 3.0 spec at `/openapi.json`
- **Error Handling**: Structured error responses with proper HTTP status codes

#### Type Safety
- **TypeScript**: Full TypeScript support with comprehensive type definitions
- **Zod Schemas**: Runtime validation with type inference
- **Discriminated Unions**: Type-safe question type handling

#### Testing
- **260+ Tests**: Comprehensive test coverage
- **86% Coverage**: High code coverage across all modules
- **Unit Tests**: Tests for schemas, engine, registry, database, and API
- **Integration Tests**: End-to-end workflow testing

#### Documentation
- **README**: Comprehensive documentation with examples
- **OpenAPI Spec**: Machine-readable API documentation
- **Type Definitions**: Full TypeScript definitions
- **Examples**: Quick start and usage examples

### Technical Details

- **Dependencies**: Zod for validation
- **Peer Dependencies**: PostgreSQL (pg), Express (optional)
- **Build**: Dual CJS/ESM output with tsup
- **Exports**: Clean public API with proper tree-shaking

### Package Information

- Package name: `qbuilder`
- Version: 0.1.0
- License: MIT
- Node: >=20.0.0
- TypeScript: ^5.9.3

---

## [Unreleased]

### Added

#### Hidden Questions
- **Hidden field**: Questions can be marked as `hidden: true` to make them permanently invisible to users
- Hidden questions are evaluated before `visibleIf` conditions
- Useful for internal tracking, calculated values, and system-generated data
- Full OpenAPI documentation and test coverage

#### Submission Update & Soft Delete
- **Update submission**: `PUT /submissions/:id` endpoint to update answers and metadata
- **Soft delete**: `DELETE /submissions/:id` endpoint performs soft delete (sets `deletedAt` timestamp)
- Database migration for `updated_at` and `deleted_at` columns
- All queries automatically exclude soft-deleted records
- `SubmissionRepository.update()` method with answer validation against questionnaire
- `SubmissionRepository.softDelete()` method
- Full OpenAPI documentation and test coverage (319 total tests)

#### Initialization Module
- **File-Based Initialization**: Load questionnaires from JSON files during startup
- `initializeQuestionnaires`: Batch load questionnaires from files, directories, or inline definitions
- `loadQuestionnaireFromFile`: Load a single questionnaire from a JSON file
- `loadQuestionnairesFromDirectory`: Recursively load all questionnaires from a directory
- **Smart Versioning**: Only creates new versions when content actually changes
  - Prevents duplicate versions on app restarts
  - Compares definitions before creating new versions
  - Proper handling of version increments using `update()` instead of `create()`
- Error handling with `continueOnError` option for resilient initialization
- Skip/update existing questionnaires with `updateExisting` option
- 26 comprehensive tests for initialization features including versioning behavior

### Planned Features

- Additional question types (date, number, email, etc.)
- File upload support
- Webhook notifications
- GraphQL API
- Questionnaire templates
- Analytics and reporting
- Multi-language support

---

[0.1.0]: https://github.com/alileza/qbuilder/releases/tag/v0.1.0
