import dotenv from 'dotenv';
dotenv.config();

/**
 * Parses duration strings like '24h', '15m', '7d' or numeric seconds into milliseconds.
 */
export const parseDurationToMs = (duration, fallbackMs = 24 * 60 * 60 * 1000) => {
  if (typeof duration === 'number' && !Number.isNaN(duration)) return duration * 1000;
  if (typeof duration !== 'string') return fallbackMs;

  const match = duration.trim().match(/^(\d+)(s|m|h|d)?$/i);
  if (!match) return fallbackMs;

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  return value * (multipliers[unit] || 1000);
};

/**
 * Validates and sanitizes environment configurations.
 * Fails fast with descriptive guidance if critical configurations are invalid.
 */
export const validateEnv = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';

  const jwtSecret = process.env.JWT_SECRET;
  const weakSecrets = [
    'replace_this_with_a_secure_256_bit_secret_in_production',
    'replace_this_with_a_secure_256_bit_random_secret_before_deployment',
    'secret',
    'jwt_secret'
  ];

  if (!jwtSecret) {
    if (isProd) {
      console.error('[CRITICAL] Missing required JWT_SECRET in production environment!');
      process.exit(1);
    } else {
      console.error('[CRITICAL] JWT_SECRET is not defined in environment. Refusing insecure startup.');
      process.exit(1);
    }
  }

  if (isProd && (jwtSecret.length < 32 || weakSecrets.includes(jwtSecret) || jwtSecret.includes('super_secret_jwt'))) {
    console.error('[CRITICAL] Insecure or weak JWT_SECRET detected in production! Must be >= 32 random chars.');
    process.exit(1);
  }

  if (isProd && !process.env.MONGODB_URI) {
    console.error('[CRITICAL] Missing required MONGODB_URI in production environment!');
    process.exit(1);
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  if (isProd && clientUrl === '*') {
    console.error('[CRITICAL] CLIENT_URL cannot be wildcard "*" when credentialed cookies are enabled in production!');
    process.exit(1);
  }

  const rawSaltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);
  const bcryptSaltRounds = Number.isInteger(rawSaltRounds) && rawSaltRounds >= 10 && rawSaltRounds <= 15 ? rawSaltRounds : 12;

  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();

  return {
    PORT: parseInt(process.env.PORT, 10) || 5000,
    NODE_ENV: nodeEnv,
    IS_PROD: isProd,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/student_mdc_db',
    CLIENT_URL: clientUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    JWT_EXPIRES_MS: parseDurationToMs(jwtExpiresIn),
    JWT_ISSUER: process.env.JWT_ISSUER || 'aktu-sms-api',
    JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'aktu-sms-client',
    BCRYPT_SALT_ROUNDS: bcryptSaltRounds,
    COOKIE_NAME: process.env.COOKIE_NAME || 'sms_access_token',
    CSRF_COOKIE_NAME: process.env.CSRF_COOKIE_NAME || 'sms_csrf_token',
    COOKIE_SAMESITE: ['strict', 'lax', 'none'].includes(sameSite) ? sameSite : 'lax',
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    LOGIN_RATE_LIMIT_MAX: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10
  };
};

export const env = validateEnv();
export default env;
