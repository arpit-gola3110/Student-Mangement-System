import { z } from 'zod';
import ApiError from '../utils/ApiError.js';

/**
 * Reusable Request Validation Middleware using Zod.
 * Validates request body, params, and query against designated Zod schemas.
 *
 * @param {Object} schemaConfig - { body?: z.ZodSchema, params?: z.ZodSchema, query?: z.ZodSchema }
 */
export const validateRequest = (schemaConfig) => {
  return async (req, res, next) => {
    try {
      if (schemaConfig.params) {
        req.params = await schemaConfig.params.parseAsync(req.params);
      }
      if (schemaConfig.query) {
        req.query = await schemaConfig.query.parseAsync(req.query);
      }
      if (schemaConfig.body) {
        req.body = await schemaConfig.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return next(ApiError.unprocessable('Validation failed on submitted request', formattedErrors));
      }
      return next(error);
    }
  };
};

/**
 * Helper schema for MongoDB ObjectId validation.
 */
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format');

export default validateRequest;
