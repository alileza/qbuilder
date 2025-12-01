/**
 * OpenAPI 3.0 specification for the Questionnaire API
 */
export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'QBuilder API',
    version: '0.1.0',
    description: 'Modular questionnaire engine with branching logic, validation, and versioning',
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  paths: {
    '/questionnaires': {
      get: {
        summary: 'List all questionnaires',
        tags: ['Questionnaires'],
        responses: {
          '200': {
            description: 'List of questionnaires',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    questionnaires: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/QuestionnaireListItem' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a new questionnaire',
        tags: ['Questionnaires'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QuestionnaireDefinition' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Questionnaire created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    questionnaire: { $ref: '#/components/schemas/QuestionnaireWithVersion' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '409': { $ref: '#/components/responses/ConflictError' },
        },
      },
    },
    '/questionnaires/{id}': {
      get: {
        summary: 'Get the latest version of a questionnaire',
        tags: ['Questionnaires'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Questionnaire ID',
          },
        ],
        responses: {
          '200': {
            description: 'Questionnaire found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    questionnaire: { $ref: '#/components/schemas/QuestionnaireWithVersion' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
      put: {
        summary: 'Update a questionnaire (creates a new version)',
        tags: ['Questionnaires'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Questionnaire ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QuestionnaireDefinition' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Questionnaire updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    questionnaire: { $ref: '#/components/schemas/QuestionnaireWithVersion' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/questionnaires/{id}/versions': {
      get: {
        summary: 'List all versions of a questionnaire',
        tags: ['Questionnaires'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Questionnaire ID',
          },
        ],
        responses: {
          '200': {
            description: 'List of versions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    versions: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/VersionMetadata' },
                    },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/questionnaires/{id}/versions/{version}': {
      get: {
        summary: 'Get a specific version of a questionnaire',
        tags: ['Questionnaires'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Questionnaire ID',
          },
          {
            name: 'version',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Version number',
          },
        ],
        responses: {
          '200': {
            description: 'Questionnaire version found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    questionnaire: { $ref: '#/components/schemas/QuestionnaireWithVersion' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/questionnaires/{id}/validate': {
      post: {
        summary: 'Validate answers against a questionnaire',
        tags: ['Questionnaires'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Questionnaire ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  version: { type: 'integer', description: 'Optional version number' },
                  answers: {
                    type: 'object',
                    additionalProperties: true,
                    description: 'Answer payload',
                  },
                },
                required: ['answers'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Validation result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    valid: { type: 'boolean' },
                    errors: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ValidationErrorDetail' },
                    },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/questionnaires/{id}/visible-questions': {
      post: {
        summary: 'Get visible questions based on current answers',
        tags: ['Questionnaires'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Questionnaire ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  version: { type: 'integer', description: 'Optional version number' },
                  answers: {
                    type: 'object',
                    additionalProperties: true,
                    description: 'Current answer payload',
                  },
                },
                required: ['answers'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'List of visible questions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    questions: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Question' },
                    },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/questionnaires/{id}/submissions': {
      post: {
        summary: 'Submit answers to a questionnaire',
        tags: ['Submissions'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Questionnaire ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  version: { type: 'integer', description: 'Optional version number' },
                  answers: {
                    type: 'object',
                    additionalProperties: true,
                    description: 'Answer payload',
                  },
                },
                required: ['answers'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Submission created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    submission: { $ref: '#/components/schemas/Submission' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
      get: {
        summary: 'List submissions for a questionnaire',
        tags: ['Submissions'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Questionnaire ID',
          },
          {
            name: 'version',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Filter by version',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
            description: 'Maximum number of results',
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
            description: 'Number of results to skip',
          },
        ],
        responses: {
          '200': {
            description: 'Paginated list of submissions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    submissions: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Submission' },
                    },
                    total: { type: 'integer' },
                    limit: { type: 'integer' },
                    offset: { type: 'integer' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/submissions/{submissionId}': {
      get: {
        summary: 'Get a specific submission',
        tags: ['Submissions'],
        parameters: [
          {
            name: 'submissionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Submission ID',
          },
        ],
        responses: {
          '200': {
            description: 'Submission found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    submission: { $ref: '#/components/schemas/Submission' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
  },
  components: {
    schemas: {
      QuestionnaireDefinition: {
        type: 'object',
        required: ['id', 'title', 'questions'],
        properties: {
          id: { type: 'string', description: 'Unique questionnaire identifier' },
          title: { type: 'string', description: 'Questionnaire title' },
          description: { type: 'string', description: 'Optional description' },
          sections: {
            type: 'array',
            items: { $ref: '#/components/schemas/Section' },
            description: 'Optional sections to group questions',
          },
          questions: {
            type: 'array',
            items: { $ref: '#/components/schemas/Question' },
            description: 'List of questions',
          },
        },
      },
      QuestionnaireWithVersion: {
        allOf: [
          { $ref: '#/components/schemas/QuestionnaireDefinition' },
          {
            type: 'object',
            required: ['version', 'createdAt'],
            properties: {
              version: { type: 'integer', description: 'Version number' },
              createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
            },
          },
        ],
      },
      QuestionnaireListItem: {
        type: 'object',
        required: ['id', 'title', 'latestVersion', 'createdAt'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          latestVersion: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      VersionMetadata: {
        type: 'object',
        required: ['version', 'createdAt'],
        properties: {
          version: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Section: {
        type: 'object',
        required: ['id', 'title', 'questionIds'],
        properties: {
          id: { type: 'string', description: 'Unique section identifier' },
          title: { type: 'string', description: 'Section title' },
          description: { type: 'string', description: 'Optional description' },
          questionIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Question IDs in this section',
          },
        },
      },
      Question: {
        oneOf: [
          { $ref: '#/components/schemas/TextQuestion' },
          { $ref: '#/components/schemas/ChoiceQuestion' },
        ],
        discriminator: {
          propertyName: 'type',
        },
      },
      TextQuestion: {
        type: 'object',
        required: ['id', 'type', 'label'],
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['text'] },
          label: { type: 'string' },
          required: { type: 'boolean', default: false },
          helpText: { type: 'string' },
          multiline: { type: 'boolean', default: false },
          maxLength: { type: 'integer' },
          visibleIf: { $ref: '#/components/schemas/VisibleIf' },
        },
      },
      ChoiceQuestion: {
        type: 'object',
        required: ['id', 'type', 'label', 'options'],
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['choice'] },
          label: { type: 'string' },
          required: { type: 'boolean', default: false },
          helpText: { type: 'string' },
          multiple: { type: 'boolean', default: false },
          options: {
            type: 'array',
            items: { $ref: '#/components/schemas/ChoiceOption' },
          },
          visibleIf: { $ref: '#/components/schemas/VisibleIf' },
        },
      },
      ChoiceOption: {
        type: 'object',
        required: ['value', 'label'],
        properties: {
          value: { type: 'string' },
          label: { type: 'string' },
        },
      },
      VisibleIf: {
        type: 'object',
        properties: {
          all: {
            type: 'array',
            items: { $ref: '#/components/schemas/Condition' },
            description: 'All conditions must be true (AND)',
          },
          any: {
            type: 'array',
            items: { $ref: '#/components/schemas/Condition' },
            description: 'At least one condition must be true (OR)',
          },
        },
      },
      Condition: {
        type: 'object',
        required: ['questionId', 'operator'],
        properties: {
          questionId: { type: 'string', description: 'Referenced question ID' },
          operator: {
            type: 'string',
            enum: ['equals', 'notEquals', 'in', 'notIn', 'gt', 'gte', 'lt', 'lte', 'isAnswered', 'notAnswered'],
          },
          value: { description: 'Value to compare (not required for isAnswered/notAnswered)' },
        },
      },
      Submission: {
        type: 'object',
        required: ['id', 'questionnaireId', 'questionnaireVersion', 'answers', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          questionnaireId: { type: 'string' },
          questionnaireVersion: { type: 'integer' },
          answers: { type: 'object', additionalProperties: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ValidationErrorDetail: {
        type: 'object',
        required: ['field', 'code', 'message'],
        properties: {
          field: { type: 'string' },
          code: { type: 'string' },
          message: { type: 'string' },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {
                type: 'array',
                items: { $ref: '#/components/schemas/ValidationErrorDetail' },
              },
            },
          },
        },
      },
    },
    responses: {
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: [
                  {
                    field: 'name',
                    code: 'REQUIRED',
                    message: 'Name is required',
                  },
                ],
              },
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: {
                code: 'NOT_FOUND',
                message: 'Questionnaire not found',
              },
            },
          },
        },
      },
      ConflictError: {
        description: 'Conflict - resource already exists',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: {
                code: 'CONFLICT',
                message: 'Questionnaire already exists',
              },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Questionnaires',
      description: 'Questionnaire management endpoints',
    },
    {
      name: 'Submissions',
      description: 'Submission management endpoints',
    },
  ],
};
