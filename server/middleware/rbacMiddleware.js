import ApiError from '../utils/ApiError.js';

/**
 * Role-Based Access Control (RBAC) authorization middleware.
 * Accepts either spread roles `authorizeRoles('admin', 'faculty')`
 * or an array `requireRoles(['admin', 'faculty'])`.
 * Normalizes all roles to lowercase.
 */
export const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles
    .flat()
    .filter(Boolean)
    .map((role) => role.toString().toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User identity not established'));
    }

    const userRole = (req.user.role || '').toString().toLowerCase();
    if (!normalizedAllowed.includes(userRole)) {
      return next(
        ApiError.forbidden(`Access forbidden: requires one of [${normalizedAllowed.join(', ')}]`)
      );
    }

    return next();
  };
};

// Backward-compatible alias used in Phase 3 routes
export const requireRoles = (allowedRoles = []) => authorizeRoles(allowedRoles);

export default authorizeRoles;
