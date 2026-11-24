import axios from 'axios';

let inMemoryCsrfToken = null;
let csrfPromise = null;
let unauthorizedHandler = null;

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const cookie of cookies) {
    const eqIndex = cookie.indexOf('=');
    if (eqIndex === -1) continue;
    const key = cookie.slice(0, eqIndex).trim();
    if (key === name) {
      return decodeURIComponent(cookie.slice(eqIndex + 1).trim());
    }
  }
  return null;
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

export const resetCsrfToken = () => {
  inMemoryCsrfToken = null;
};

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Fetches and caches a CSRF token using the double-submit cookie endpoint.
 * Deduplicates concurrent requests cleanly.
 */
export const initCsrfToken = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cookieToken = getCookie('sms_csrf_token');
    if (cookieToken) {
      inMemoryCsrfToken = cookieToken;
      return cookieToken;
    }
    if (inMemoryCsrfToken) {
      return inMemoryCsrfToken;
    }
  }

  if (!csrfPromise) {
    csrfPromise = api
      .get('/auth/csrf-token')
      .then((res) => {
        const token = res?.data?.csrfToken || getCookie('sms_csrf_token');
        inMemoryCsrfToken = token;
        return token;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
};

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

// Request interceptor: attach X-CSRF-Token header on state-changing calls
api.interceptors.request.use(
  async (config) => {
    const method = (config.method || 'get').toLowerCase();
    if (MUTATING_METHODS.has(method)) {
      let token = getCookie('sms_csrf_token') || inMemoryCsrfToken;
      if (!token) {
        token = await initCsrfToken();
      }
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Centralized response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isAuthProbe = requestUrl.includes('/auth/me') || requestUrl.includes('/auth/login');

    if (status === 401 && !isAuthProbe && typeof unauthorizedHandler === 'function') {
      unauthorizedHandler();
    }

    const payload = error.response?.data;
    if (payload && typeof payload === 'object') {
      return Promise.reject({ ...payload, status });
    }
    return Promise.reject({
      success: false,
      message: error.message || 'Network error occurred',
      status
    });
  }
);

export default api;
