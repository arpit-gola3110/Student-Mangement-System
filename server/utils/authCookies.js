import env from '../config/env.js';

/**
 * Parses Cookie header string into a key-value map safely without extra dependencies.
 */
export const parseCookies = (cookieHeader = '') => {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;

    const rawName = pair.slice(0, eqIndex).trim();
    if (!rawName) continue;

    let rawValue = pair.slice(eqIndex + 1).trim();
    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      rawValue = rawValue.slice(1, -1);
    }

    try {
      cookies[rawName] = decodeURIComponent(rawValue);
    } catch {
      cookies[rawName] = rawValue;
    }
  }

  return cookies;
};

/**
 * Express middleware that populates req.cookies cleanly.
 */
export const attachCookies = (req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie);
  next();
};

/**
 * Cookie options for the HttpOnly JWT authentication cookie.
 */
export const getAuthCookieOptions = () => {
  const sameSite = env.COOKIE_SAMESITE;
  const secure = env.IS_PROD || sameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: env.JWT_EXPIRES_MS
  };
};

/**
 * Cookie options required to clear the HttpOnly JWT cookie consistently.
 */
export const getClearAuthCookieOptions = () => {
  const sameSite = env.COOKIE_SAMESITE;
  const secure = env.IS_PROD || sameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/'
  };
};

/**
 * Cookie options for the readable Double-Submit CSRF token cookie.
 */
export const getCsrfCookieOptions = () => {
  const sameSite = env.COOKIE_SAMESITE;
  const secure = env.IS_PROD || sameSite === 'none';

  return {
    httpOnly: false,
    secure,
    sameSite,
    path: '/',
    maxAge: env.JWT_EXPIRES_MS
  };
};

export const setAuthCookie = (res, token) => {
  res.cookie(env.COOKIE_NAME, token, getAuthCookieOptions());
};

export const clearAuthCookie = (res) => {
  res.clearCookie(env.COOKIE_NAME, getClearAuthCookieOptions());
};

export const setCsrfCookie = (res, token) => {
  res.cookie(env.CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
};
