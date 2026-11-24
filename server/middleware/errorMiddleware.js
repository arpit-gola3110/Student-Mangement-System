import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/apiResponse.js';
import env from '../config/env.js';

/**
 * Centralized Express Error Handling Middleware.
 * Standardizes all error responses and shields internal stack traces in production.
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Convert non-ApiError instances into structured ApiError
  if (!(error instanceof ApiError)) {
    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message
      }));
      error = ApiError.unprocessable('Database validation error', messages);
    }
    // Mongoose Duplicate Key (E11000)
    else if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyValue || {}).join(', ');
      error = ApiError.conflict(`Duplicate value for '${duplicateField}' already exists in database`);
    }
    // Mongoose CastError (Invalid ObjectId)
    else if (err.name === 'CastError') {
      error = ApiError.badRequest(`Invalid format for field '${err.path}': value '${err.value}' is not valid`);
    }
    // JWT Authentication Errors
    else if (err.name === 'JsonWebTokenError') {
      error = ApiError.unauthorized('Invalid authentication token');
    } else if (err.name === 'TokenExpiredError') {
      error = ApiError.unauthorized('Authentication token has expired, please log in again');
    }
    // Fallback Internal Server Error
    else {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'An unexpected internal error occurred';
      error = new ApiError(statusCode, message, [], err.stack);
    }
  }

  // Response payload conforming strictly to Phase 3 Section 10 format
  const response = {
    success: false,
    message: error.message,
    errors: error.errors
  };

  if (env.NODE_ENV === 'development' && error.statusCode === 500) {
    response.stack = error.stack;
  }

  return res.status(error.statusCode).json(response);
};

export default errorHandler;
