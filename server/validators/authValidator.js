import { z } from 'zod';

/**
 * Login request payload schema.
 * Normalizes email and ensures non-empty credentials without leaking policy hints on login.
 */
export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address')
      .max(255, 'Email address is too long'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required')
      .max(128, 'Password exceeds maximum allowed length')
  })
  .strict();

/**
 * Password policy for creating or changing passwords:
 * - Minimum 8 characters, maximum 128
 * - At least one uppercase letter, one lowercase letter, one digit, and one special character
 */
export const passwordPolicySchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required')
      .max(128),
    newPassword: passwordPolicySchema
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from your current password',
    path: ['newPassword']
  });
