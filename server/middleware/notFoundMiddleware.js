import ApiError from '../utils/ApiError.js';

/**
 * Not Found Middleware for handling unmatched API routes.
 */
export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl} - Route does not exist on this server`));
};

export default notFoundHandler;
