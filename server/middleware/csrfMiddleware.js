import crypto from 'crypto';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { setCsrfCookie } from '../utils/authCookies.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Generates a cryptographically strong random CSRF token.
 */
export const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

/**
 * Constant-time string comparison preventing timing side-channel attacks.
 */
const safeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Issues a CSRF token cookie (or refreshes an existing valid one) and returns the token string.
 */
export const issueCsrfToken = (req, res, forceRotate = false) => {
  const existing = req.cookies?.[env.CSRF_COOKIE_NAME];
  const token = !forceRotate && existing && /^[a-f0-9]{64}$/i.test(existing)
    ? existing
    : generateCsrfToken();

  setCsrfCookie(res, token);
  return token;
};

/**
 * Double-Submit Cookie CSRF Protection Middleware.
 * Validates that state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) carry
 * matching `X-CSRF-Token` header and `sms_csrf_token` cookie values.
 */
export const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  const cookieToken = req.cookies?.[env.CSRF_COOKIE_NAME];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || !safeCompare(cookieToken, headerToken)) {
    return next(ApiError.forbidden('Invalid or missing CSRF token. Please refresh and try again.'));
  }

  return next();
};

export default csrfProtection;
