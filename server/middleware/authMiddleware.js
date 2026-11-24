import env from '../config/env.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import ApiError from '../utils/ApiError.js';
import { verifyAuthToken } from '../utils/tokenGenerator.js';

/**
 * Authentication Middleware (`protect` / `verifyToken`).
 * Reads the JWT from HttpOnly cookie, validates signature/claims,
 * verifies user existence, active status, tokenVersion revocation,
 * and populates req.user using the current database role.
 */
export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];

    if (!token) {
      return next(ApiError.unauthorized('Authentication required. Please sign in.'));
    }

    let decoded;
    try {
      decoded = verifyAuthToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Session expired. Please sign in again.'));
      }
      return next(ApiError.unauthorized('Invalid authentication token.'));
    }

    const userId = decoded.sub;
    if (!userId) {
      return next(ApiError.unauthorized('Malformed authentication token.'));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(ApiError.unauthorized('Authenticated user no longer exists.'));
    }

    if (!user.isActive) {
      return next(ApiError.unauthorized('Account is disabled. Please contact administrator.'));
    }

    // Verify token has not been revoked via logout, password change, or admin action
    const tokenVersion = typeof decoded.tokenVersion === 'number' ? decoded.tokenVersion : 0;
    if ((user.tokenVersion || 0) !== tokenVersion) {
      return next(ApiError.unauthorized('Session has been invalidated. Please sign in again.'));
    }

    const normalizedRole = (user.role || 'student').toLowerCase();

    let profileId = null;
    if (normalizedRole === 'student') {
      const student = await Student.findOne({ user: user._id }).select('_id').lean();
      profileId = student?._id?.toString() || null;
    } else if (normalizedRole === 'faculty') {
      const faculty = await Faculty.findOne({ user: user._id }).select('_id').lean();
      profileId = faculty?._id?.toString() || null;
    }

    // Attach authoritative current user context from database
    req.user = {
      id: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      role: normalizedRole,
      profileId,
      tokenVersion: user.tokenVersion || 0
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

// Backward-compatible named export alias
export const verifyToken = protect;
export default protect;
