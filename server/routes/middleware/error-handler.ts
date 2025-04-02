import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware for Express
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log the error for server-side debugging
  console.error(`Error processing ${req.method} ${req.path}:`, err);
  
  // Set appropriate status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Send error response to client
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.stack,
    path: req.path,
    timestamp: new Date().toISOString()
  });
}

/**
 * Wrapper for async route handlers to catch errors and pass them to the error handler
 * 
 * Usage: 
 * router.get('/path', asyncHandler(async (req, res) => {
 *   // Async code here
 * }));
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Creates a "not found" error for a specific resource
 */
export function createNotFoundError(resourceType: string, id: string | number) {
  const error: any = new Error(`${resourceType} with ID ${id} not found`);
  error.statusCode = 404;
  return error;
}

/**
 * Creates a validation error
 */
export function createValidationError(message: string) {
  const error: any = new Error(message);
  error.statusCode = 400;
  return error;
}

/**
 * Creates an unauthorized error
 */
export function createUnauthorizedError(message = 'Unauthorized') {
  const error: any = new Error(message);
  error.statusCode = 401;
  return error;
}

/**
 * Creates a forbidden error
 */
export function createForbiddenError(message = 'Forbidden') {
  const error: any = new Error(message);
  error.statusCode = 403;
  return error;
}

/**
 * Creates a conflict error (e.g., duplicate records)
 */
export function createConflictError(message: string) {
  const error: any = new Error(message);
  error.statusCode = 409;
  return error;
}