import { sendError } from '../utils/responseHandler.js';

export const requireRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'User identity not established', null, 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, `Access forbidden: requires one of [${allowedRoles.join(', ')}]`, null, 403);
    }

    next();
  };
};
