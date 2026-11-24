/**
 * Custom Operational API Error class.
 * Encapsulates HTTP status codes, structured error messages, and operational flags.
 */
export class ApiError extends Error {
  constructor(statusCode, message = 'Internal Server Error', errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = Array.isArray(errors) ? errors : [errors];
    this.success = false;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad Request', errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized access', errors = []) {
    return new ApiError(401, message, errors);
  }

  static forbidden(message = 'Access forbidden: Insufficient permissions', errors = []) {
    return new ApiError(403, message, errors);
  }

  static notFound(message = 'Resource not found', errors = []) {
    return new ApiError(404, message, errors);
  }

  static conflict(message = 'Resource conflict: Duplicate entry detected', errors = []) {
    return new ApiError(409, message, errors);
  }

  static unprocessable(message = 'Validation failed', errors = []) {
    return new ApiError(422, message, errors);
  }

  static internal(message = 'Internal server error', errors = []) {
    return new ApiError(500, message, errors);
  }
}

export default ApiError;
