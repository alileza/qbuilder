import { describe, it, expect } from 'vitest';
import { openApiSpec } from '../openapi.js';

describe('OpenAPI Specification', () => {
  it('should have valid OpenAPI 3.0 structure', () => {
    expect(openApiSpec).toBeDefined();
    expect(openApiSpec.openapi).toBe('3.0.0');
    expect(openApiSpec.info).toBeDefined();
    expect(openApiSpec.paths).toBeDefined();
    expect(openApiSpec.components).toBeDefined();
  });

  it('should have required info fields', () => {
    expect(openApiSpec.info.title).toBe('QBuilder API');
    expect(openApiSpec.info.version).toBe('0.1.0');
    expect(openApiSpec.info.description).toBeDefined();
    expect(openApiSpec.info.license).toBeDefined();
    expect(openApiSpec.info.license.name).toBe('MIT');
  });

  it('should have servers configuration', () => {
    expect(openApiSpec.servers).toBeDefined();
    expect(openApiSpec.servers).toHaveLength(1);
    expect(openApiSpec.servers[0].url).toBeDefined();
  });

  describe('Questionnaire endpoints', () => {
    it('should define POST /questionnaires', () => {
      const endpoint = openApiSpec.paths['/questionnaires'];
      expect(endpoint).toBeDefined();
      expect(endpoint.post).toBeDefined();
      expect(endpoint.post.summary).toBe('Create a new questionnaire');
      expect(endpoint.post.requestBody).toBeDefined();
      expect(endpoint.post.responses).toBeDefined();
      expect(endpoint.post.responses['201']).toBeDefined();
      expect(endpoint.post.responses['400']).toBeDefined();
      expect(endpoint.post.responses['409']).toBeDefined();
    });

    it('should define GET /questionnaires', () => {
      const endpoint = openApiSpec.paths['/questionnaires'];
      expect(endpoint.get).toBeDefined();
      expect(endpoint.get.summary).toBe('List all questionnaires');
      expect(endpoint.get.responses['200']).toBeDefined();
    });

    it('should define GET /questionnaires/{id}', () => {
      const endpoint = openApiSpec.paths['/questionnaires/{id}'];
      expect(endpoint).toBeDefined();
      expect(endpoint.get).toBeDefined();
      expect(endpoint.get.parameters).toBeDefined();
      expect(endpoint.get.parameters).toHaveLength(1);
      expect(endpoint.get.parameters[0].name).toBe('id');
      expect(endpoint.get.responses['200']).toBeDefined();
      expect(endpoint.get.responses['404']).toBeDefined();
    });

    it('should define PUT /questionnaires/{id}', () => {
      const endpoint = openApiSpec.paths['/questionnaires/{id}'];
      expect(endpoint.put).toBeDefined();
      expect(endpoint.put.summary).toBe('Update a questionnaire (creates a new version)');
      expect(endpoint.put.requestBody).toBeDefined();
      expect(endpoint.put.responses['200']).toBeDefined();
      expect(endpoint.put.responses['400']).toBeDefined();
      expect(endpoint.put.responses['404']).toBeDefined();
    });

    it('should define GET /questionnaires/{id}/versions', () => {
      const endpoint = openApiSpec.paths['/questionnaires/{id}/versions'];
      expect(endpoint).toBeDefined();
      expect(endpoint.get).toBeDefined();
      expect(endpoint.get.summary).toBe('List all versions of a questionnaire');
    });

    it('should define GET /questionnaires/{id}/versions/{version}', () => {
      const endpoint = openApiSpec.paths['/questionnaires/{id}/versions/{version}'];
      expect(endpoint).toBeDefined();
      expect(endpoint.get).toBeDefined();
      expect(endpoint.get.parameters).toHaveLength(2);
      expect(endpoint.get.parameters[0].name).toBe('id');
      expect(endpoint.get.parameters[1].name).toBe('version');
    });

    it('should define POST /questionnaires/{id}/validate', () => {
      const endpoint = openApiSpec.paths['/questionnaires/{id}/validate'];
      expect(endpoint).toBeDefined();
      expect(endpoint.post).toBeDefined();
      expect(endpoint.post.summary).toBe('Validate answers against a questionnaire');
      expect(endpoint.post.requestBody).toBeDefined();
    });

    it('should define POST /questionnaires/{id}/visible-questions', () => {
      const endpoint = openApiSpec.paths['/questionnaires/{id}/visible-questions'];
      expect(endpoint).toBeDefined();
      expect(endpoint.post).toBeDefined();
      expect(endpoint.post.summary).toBe('Get visible questions based on current answers');
    });
  });

  describe('Submission endpoints', () => {
    it('should define POST /questionnaires/{id}/submissions', () => {
      const endpoint = openApiSpec.paths['/questionnaires/{id}/submissions'];
      expect(endpoint).toBeDefined();
      expect(endpoint.post).toBeDefined();
      expect(endpoint.post.summary).toBe('Submit answers to a questionnaire');
      expect(endpoint.post.requestBody).toBeDefined();
      expect(endpoint.post.responses['201']).toBeDefined();
      expect(endpoint.post.responses['400']).toBeDefined();
      expect(endpoint.post.responses['404']).toBeDefined();
    });

    it('should define GET /questionnaires/{id}/submissions', () => {
      const endpoint = openApiSpec.paths['/questionnaires/{id}/submissions'];
      expect(endpoint.get).toBeDefined();
      expect(endpoint.get.summary).toBe('List submissions for a questionnaire');
      expect(endpoint.get.parameters).toBeDefined();
      const paramNames = endpoint.get.parameters.map((p: any) => p.name);
      expect(paramNames).toContain('id');
      expect(paramNames).toContain('version');
      expect(paramNames).toContain('limit');
      expect(paramNames).toContain('offset');
    });

    it('should define GET /submissions/{submissionId}', () => {
      const endpoint = openApiSpec.paths['/submissions/{submissionId}'];
      expect(endpoint).toBeDefined();
      expect(endpoint.get).toBeDefined();
      expect(endpoint.get.summary).toBe('Get a specific submission');
      expect(endpoint.get.parameters).toHaveLength(1);
      expect(endpoint.get.parameters[0].name).toBe('submissionId');
    });
  });

  describe('Components', () => {
    it('should define schemas', () => {
      expect(openApiSpec.components.schemas).toBeDefined();
      expect(openApiSpec.components.schemas.QuestionnaireDefinition).toBeDefined();
      expect(openApiSpec.components.schemas.QuestionnaireWithVersion).toBeDefined();
      expect(openApiSpec.components.schemas.Question).toBeDefined();
      expect(openApiSpec.components.schemas.TextQuestion).toBeDefined();
      expect(openApiSpec.components.schemas.ChoiceQuestion).toBeDefined();
      expect(openApiSpec.components.schemas.Submission).toBeDefined();
      expect(openApiSpec.components.schemas.ErrorResponse).toBeDefined();
    });

    it('should define response templates', () => {
      expect(openApiSpec.components.responses).toBeDefined();
      expect(openApiSpec.components.responses.ValidationError).toBeDefined();
      expect(openApiSpec.components.responses.NotFoundError).toBeDefined();
      expect(openApiSpec.components.responses.ConflictError).toBeDefined();
    });

    it('should have correct QuestionnaireDefinition schema', () => {
      const schema = openApiSpec.components.schemas.QuestionnaireDefinition;
      expect(schema.type).toBe('object');
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('title');
      expect(schema.required).toContain('questions');
      expect(schema.properties.id).toBeDefined();
      expect(schema.properties.title).toBeDefined();
      expect(schema.properties.description).toBeDefined();
      expect(schema.properties.sections).toBeDefined();
      expect(schema.properties.questions).toBeDefined();
    });

    it('should have correct Submission schema', () => {
      const schema = openApiSpec.components.schemas.Submission;
      expect(schema.type).toBe('object');
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('questionnaireId');
      expect(schema.required).toContain('questionnaireVersion');
      expect(schema.required).toContain('answers');
      expect(schema.required).toContain('createdAt');
    });

    it('should have Question discriminator', () => {
      const schema = openApiSpec.components.schemas.Question;
      expect(schema.oneOf).toBeDefined();
      expect(schema.discriminator).toBeDefined();
      expect(schema.discriminator.propertyName).toBe('type');
    });
  });

  describe('Tags', () => {
    it('should define tags', () => {
      expect(openApiSpec.tags).toBeDefined();
      expect(openApiSpec.tags).toHaveLength(2);

      const tagNames = openApiSpec.tags.map((t: any) => t.name);
      expect(tagNames).toContain('Questionnaires');
      expect(tagNames).toContain('Submissions');
    });
  });

  describe('Error response examples', () => {
    it('should have example for ValidationError', () => {
      const response = openApiSpec.components.responses.ValidationError;
      expect(response.content['application/json'].example).toBeDefined();
      expect(response.content['application/json'].example.error).toBeDefined();
      expect(response.content['application/json'].example.error.code).toBe('VALIDATION_ERROR');
    });

    it('should have example for NotFoundError', () => {
      const response = openApiSpec.components.responses.NotFoundError;
      expect(response.content['application/json'].example).toBeDefined();
      expect(response.content['application/json'].example.error.code).toBe('NOT_FOUND');
    });

    it('should have example for ConflictError', () => {
      const response = openApiSpec.components.responses.ConflictError;
      expect(response.content['application/json'].example).toBeDefined();
      expect(response.content['application/json'].example.error.code).toBe('CONFLICT');
    });
  });

  describe('Spec completeness', () => {
    it('should have all expected paths', () => {
      const paths = Object.keys(openApiSpec.paths);
      expect(paths).toContain('/questionnaires');
      expect(paths).toContain('/questionnaires/{id}');
      expect(paths).toContain('/questionnaires/{id}/versions');
      expect(paths).toContain('/questionnaires/{id}/versions/{version}');
      expect(paths).toContain('/questionnaires/{id}/validate');
      expect(paths).toContain('/questionnaires/{id}/visible-questions');
      expect(paths).toContain('/questionnaires/{id}/submissions');
      expect(paths).toContain('/submissions/{submissionId}');
    });

    it('should have all operations tagged', () => {
      const paths = openApiSpec.paths;
      for (const path of Object.values(paths)) {
        for (const operation of Object.values(path as any)) {
          if (typeof operation === 'object' && 'tags' in operation) {
            expect(operation.tags).toBeDefined();
            expect(operation.tags.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});
