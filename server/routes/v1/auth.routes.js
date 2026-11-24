import express from 'express';
import rateLimit from 'express-rate-limit';
import env from '../../config/env.js';
import { protect } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { loginSchema, changePasswordSchema } from '../../validators/authValidator.js';
import * as authCtrl from '../../controllers/authController.js';

const router = express.Router();

/**
 * Dedicated brute-force rate limiter for authentication attempts.
 */
export const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP address. Please try again later.',
    errors: ['Login rate limit exceeded']
  }
});

// Initialize CSRF protection token for browser clients
router.get('/csrf-token', authCtrl.getCsrfToken);

// Authenticate user and establish HttpOnly session cookie
router.post('/login', loginLimiter, validateRequest({ body: loginSchema }), authCtrl.login);

// Terminate session, revoke tokenVersion, and clear cookies
router.post('/logout', authCtrl.logout);

// Return authenticated user context
router.get('/me', protect, authCtrl.getMe);

// Update authenticated user password and revoke prior sessions
router.post('/change-password', protect, validateRequest({ body: changePasswordSchema }), authCtrl.changePassword);

export default router;
