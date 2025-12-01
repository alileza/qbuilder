import { ErrorCodes, type ErrorCode } from './codes.js';

/**
 * Error detail for API error response
 */
export interface ErrorDetail {
  field?: string;
  code: string;
  message: string;
}

/**
 * API error response format
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
}

/**
 * Base error class for qbuilder errors
 */
export class QBuilderError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'QBuilderError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to API error response format
   */
  toJSON(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && this.details.length > 0 && { details: this.details }),
      },
    };
  }
}

/**
 * Validation error - invalid input data
 */
export class ValidationError extends QBuilderError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(ErrorCodes.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error - resource not found
 */
export class NotFoundError extends QBuilderError {
  constructor(message: string) {
    super(ErrorCodes.NOT_FOUND, message);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error - version conflict or duplicate
 */
export class ConflictError extends QBuilderError {
  constructor(message: string) {
    super(ErrorCodes.CONFLICT, message);
    this.name = 'ConflictError';
  }
}

/**
 * Cyclic dependency error - circular reference in visibleIf conditions
 */
export class CyclicDependencyError extends QBuilderError {
  constructor(message: string, cyclePath?: string[]) {
    const details = cyclePath
      ? [
          {
            field: 'visibleIf',
            code: 'CYCLIC_DEPENDENCY',
            message: `Cycle: ${cyclePath.join(' -> ')}`,
          },
        ]
      : undefined;

    super(ErrorCodes.CYCLIC_DEPENDENCY, message, details);
    this.name = 'CyclicDependencyError';
  }
}

/**
 * Internal error - unexpected server error
 */
export class InternalError extends QBuilderError {
  constructor(message: string) {
    super(ErrorCodes.INTERNAL_ERROR, message);
    this.name = 'InternalError';
  }
}

// Re-export error codes
export { ErrorCodes, type ErrorCode } from './codes.js';
