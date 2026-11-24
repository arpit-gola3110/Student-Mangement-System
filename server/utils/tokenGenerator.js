import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Generates a signed JWT access token using user ID as the `sub` claim.
 * Omits volatile role claims from trust assumptions; carries tokenVersion for revocation.
 */
export const generateToken = ({ userId, tokenVersion = 0 }) => {
  return jwt.sign(
    {
      tokenVersion
    },
    env.JWT_SECRET,
    {
      subject: userId.toString(),
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expiresIn: env.JWT_EXPIRES_IN,
      algorithm: 'HS256'
    }
  );
};

/**
 * Verifies JWT signature, expiration, issuer, and audience.
 */
export const verifyAuthToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: ['HS256']
  });
};
