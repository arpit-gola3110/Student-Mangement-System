import { sendError } from '../utils/responseHandler.js';

export const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Error]', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return sendError(res, 'Validation error', messages, 422);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    return sendError(res, `Duplicate field value: ${field} already exists`, null, 409);
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid authentication token', null, 401);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(res, message, process.env.NODE_ENV === 'development' ? err.stack : null, statusCode);
};
