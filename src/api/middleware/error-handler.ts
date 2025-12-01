import type { Request, Response, NextFunction } from 'express';
import { QBuilderError, ErrorCodes, type ErrorResponse } from '../../errors/index.js';

/**
 * Map error codes to HTTP status codes
 */
function getStatusCode(errorCode: string): number {
  switch (errorCode) {
    case ErrorCodes.VALIDATION_ERROR:
      return 400;
    case ErrorCodes.NOT_FOUND:
      return 404;
    case ErrorCodes.CONFLICT:
      return 409;
    case ErrorCodes.CYCLIC_DEPENDENCY:
      return 400;
    case ErrorCodes.INTERNAL_ERROR:
    default:
      return 500;
  }
}

/**
 * Create Express error handler middleware
 */
export function createErrorHandler() {
  return (err: Error, req: Request, res: Response, next: NextFunction): void => {
    // Check if error is a QBuilderError
    if (err instanceof QBuilderError) {
      const statusCode = getStatusCode(err.code);
      const response: ErrorResponse = err.toJSON();

      res.status(statusCode).json(response);
      return;
    }

    // Handle unknown errors
    console.error('Unexpected error:', err);

    const response: ErrorResponse = {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
      },
    };

    res.status(500).json(response);
  };
}
