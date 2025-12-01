import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createErrorHandler } from '../error-handler.js';
import {
  QBuilderError,
  ValidationError,
  NotFoundError,
  ConflictError,
  CyclicDependencyError,
  InternalError,
  ErrorCodes,
} from '../../../errors/index.js';

describe('Error Handler Middleware', () => {
  const mockReq = {} as any;
  let mockRes: any;
  const mockNext = vi.fn();

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('QBuilderError handling', () => {
    it('should handle ValidationError with 400 status', () => {
      const errorHandler = createErrorHandler();
      const error = new ValidationError('Validation failed', [
        { field: 'name', code: 'REQUIRED', message: 'Name is required' },
      ]);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Validation failed',
          details: [
            { field: 'name', code: 'REQUIRED', message: 'Name is required' },
          ],
        },
      });
    });

    it('should handle NotFoundError with 404 status', () => {
      const errorHandler = createErrorHandler();
      const error = new NotFoundError('Questionnaire not found');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Questionnaire not found',
        },
      });
    });

    it('should handle ConflictError with 409 status', () => {
      const errorHandler = createErrorHandler();
      const error = new ConflictError('Questionnaire already exists');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCodes.CONFLICT,
          message: 'Questionnaire already exists',
        },
      });
    });

    it('should handle CyclicDependencyError with 400 status', () => {
      const errorHandler = createErrorHandler();
      const error = new CyclicDependencyError('Cyclic dependency detected', [
        'q1',
        'q2',
        'q1',
      ]);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCodes.CYCLIC_DEPENDENCY,
          message: 'Cyclic dependency detected',
          details: [
            {
              field: 'visibleIf',
              code: 'CYCLIC_DEPENDENCY',
              message: 'Cycle: q1 -> q2 -> q1',
            },
          ],
        },
      });
    });

    it('should handle InternalError with 500 status', () => {
      const errorHandler = createErrorHandler();
      const error = new InternalError('Something went wrong');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Something went wrong',
        },
      });
    });

    it('should handle ValidationError without details', () => {
      const errorHandler = createErrorHandler();
      const error = new ValidationError('Validation failed');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Validation failed',
        },
      });
    });
  });

  describe('Unknown error handling', () => {
    it('should handle generic Error with 500 status', () => {
      const errorHandler = createErrorHandler();
      const error = new Error('Unexpected error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'An unexpected error occurred',
        },
      });
      expect(console.error).toHaveBeenCalledWith('Unexpected error:', error);
    });

    it('should handle TypeError with 500 status', () => {
      const errorHandler = createErrorHandler();
      const error = new TypeError('Type error occurred');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should handle ReferenceError with 500 status', () => {
      const errorHandler = createErrorHandler();
      const error = new ReferenceError('Reference error occurred');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(console.error).toHaveBeenCalledWith('Unexpected error:', error);
    });

    it('should log unknown errors to console', () => {
      const errorHandler = createErrorHandler();
      const error = new Error('Database connection failed');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(console.error).toHaveBeenCalledWith('Unexpected error:', error);
    });
  });

  describe('Error response format', () => {
    it('should return consistent error structure for QBuilderError', () => {
      const errorHandler = createErrorHandler();
      const error = new NotFoundError('Resource not found');

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
    });

    it('should include details when present', () => {
      const errorHandler = createErrorHandler();
      const error = new ValidationError('Invalid input', [
        { field: 'email', code: 'INVALID_FORMAT', message: 'Invalid email format' },
        { field: 'age', code: 'OUT_OF_RANGE', message: 'Age must be positive' },
      ]);

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toHaveProperty('details');
      expect(response.error.details).toHaveLength(2);
    });

    it('should omit details when not present', () => {
      const errorHandler = createErrorHandler();
      const error = new NotFoundError('Not found');

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).not.toHaveProperty('details');
    });

    it('should return consistent error structure for unknown errors', () => {
      const errorHandler = createErrorHandler();
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response.error).not.toHaveProperty('details');
    });
  });

  describe('HTTP status code mapping', () => {
    const testCases = [
      { ErrorClass: ValidationError, expectedStatus: 400, message: 'Validation failed' },
      { ErrorClass: NotFoundError, expectedStatus: 404, message: 'Not found' },
      { ErrorClass: ConflictError, expectedStatus: 409, message: 'Conflict' },
      { ErrorClass: CyclicDependencyError, expectedStatus: 400, message: 'Cyclic' },
      { ErrorClass: InternalError, expectedStatus: 500, message: 'Internal' },
    ];

    testCases.forEach(({ ErrorClass, expectedStatus, message }) => {
      it(`should map ${ErrorClass.name} to ${expectedStatus} status`, () => {
        const errorHandler = createErrorHandler();
        const error = new ErrorClass(message);

        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(expectedStatus);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle ValidationError with empty details array', () => {
      const errorHandler = createErrorHandler();
      const error = new ValidationError('Validation failed', []);

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).not.toHaveProperty('details');
    });

    it('should handle CyclicDependencyError without cycle path', () => {
      const errorHandler = createErrorHandler();
      const error = new CyclicDependencyError('Cyclic dependency detected');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should not call next() after handling error', () => {
      const errorHandler = createErrorHandler();
      const error = new NotFoundError('Not found');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
