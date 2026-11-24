import env from '../config/env.js';
import AuditLog from '../models/AuditLog.js';
import ApiResponse from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { issueCsrfToken } from '../middleware/csrfMiddleware.js';
import { verifyAuthToken } from '../utils/tokenGenerator.js';
import { setAuthCookie, clearAuthCookie } from '../utils/authCookies.js';
import * as authService from '../services/authService.js';

const recordAuthAudit = async ({ actor, actorRole, action, req, details = {} }) => {
  if (!actor) return;
  try {
    await AuditLog.create({
      actor,
      actorRole: (actorRole || 'student').toUpperCase(),
      action,
      entity: 'User',
      entityId: actor,
      ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1',
      details
    });
  } catch (err) {
    console.error('[Auth Audit Error]', err.message);
  }
};

/**
 * GET /api/v1/auth/csrf-token
 * Initializes CSRF double-submit cookie and returns token for frontend submission.
 */
export const getCsrfToken = (req, res) => {
  const csrfToken = issueCsrfToken(req, res);
  return ApiResponse.success(res, { csrfToken }, 'CSRF token initialized');
};

/**
 * POST /api/v1/auth/login
 * Authenticates credentials, sets HttpOnly JWT cookie, rotates CSRF token,
 * and returns safe user profile without password hash or JWT in JSON.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { token, user } = await authService.authenticateUser(email, password);

  setAuthCookie(res, token);
  issueCsrfToken(req, res, true);

  await recordAuthAudit({
    actor: user.id,
    actorRole: user.role,
    action: 'LOGIN',
    req,
    details: { method: 'cookie-jwt' }
  });

  return ApiResponse.success(res, { user }, 'Login successful');
});

/**
 * POST /api/v1/auth/logout
 * Clears HttpOnly cookie, increments user tokenVersion to revoke copied JWTs,
 * and rotates CSRF token cleanly.
 */
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.COOKIE_NAME];

  if (token) {
    try {
      const decoded = verifyAuthToken(token);
      if (decoded?.sub) {
        await authService.revokeUserSessions(decoded.sub);
        await recordAuthAudit({
          actor: decoded.sub,
          actorRole: req.user?.role || 'user',
          action: 'LOGOUT',
          req
        });
      }
    } catch {
      // Token may already be expired or invalid; continue clearing cookies cleanly
    }
  }

  clearAuthCookie(res);
  issueCsrfToken(req, res, true);

  return ApiResponse.success(res, {}, 'Logged out successfully');
});

/**
 * GET /api/v1/auth/me
 * Returns current authenticated user profile from database.
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUserProfile(req.user.id);
  return ApiResponse.success(res, { user }, 'Current session retrieved');
});

/**
 * POST /api/v1/auth/change-password
 * Verifies current password, hashes new password, increments tokenVersion,
 * and updates current session cookie so old tokens become invalid.
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { token, role } = await authService.updateUserPassword(
    req.user.id,
    currentPassword,
    newPassword
  );

  setAuthCookie(res, token);

  await recordAuthAudit({
    actor: req.user.id,
    actorRole: role,
    action: 'UPDATE',
    req,
    details: { field: 'password' }
  });

  return ApiResponse.success(res, {}, 'Password updated successfully');
});
