/**
 * Async Handler wrapper to eliminate boilerplate try-catch blocks in Express controllers.
 * Catches rejected promises and forwards them to centralized error middleware.
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
