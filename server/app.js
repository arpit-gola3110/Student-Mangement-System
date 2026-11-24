import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import env from './config/env.js';
import { getDatabaseStatus } from './config/db.js';
import { attachCookies } from './utils/authCookies.js';
import { csrfProtection } from './middleware/csrfMiddleware.js';
import v1Router from './routes/v1/index.js';
import { notFoundHandler } from './middleware/notFoundMiddleware.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import ApiError from './utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// 2. Credentialed Cross-Origin Resource Sharing (Exact trusted origins only, never wildcard '*')
const configuredOrigins = env.CLIENT_URL
  .split(',')
  .map((o) => o.trim())
  .filter((o) => o && o !== '*');

if (!env.IS_PROD) {
  const devOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${env.PORT}`,
    `http://127.0.0.1:${env.PORT}`
  ];
  for (const origin of devOrigins) {
    if (!configuredOrigins.includes(origin)) {
      configuredOrigins.push(origin);
    }
  }
}

app.use(cors((req, callback) => {
  const origin = req.header('Origin');
  const host = req.get('host');
  const selfHttpOrigin = host ? `http://${host}` : null;
  const selfHttpsOrigin = host ? `https://${host}` : null;

  const isTrusted =
    !origin ||
    origin === selfHttpOrigin ||
    origin === selfHttpsOrigin ||
    configuredOrigins.includes(origin);

  if (isTrusted) {
    return callback(null, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
    });
  }

  return callback(ApiError.forbidden('CORS policy violation: Origin not allowed'));
}));

// 3. Global API Rate Limiter (login routes apply their own stricter loginLimiter)
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/v1/auth/login' || req.path === '/auth/login',
  message: {
    success: false,
    message: 'Too many requests from this IP address, please try again later.',
    errors: ['Rate limit exceeded']
  }
});
app.use('/api', apiLimiter);

// 4. Body Parsers & Cookie Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(attachCookies);

// 5. NoSQL Injection Sanitization
app.use(mongoSanitize());

// 6. HTTP Request Logging (never logs cookies, tokens, or request bodies)
app.use(morgan(env.IS_PROD ? 'combined' : 'dev'));

// 7. Silent Favicon Handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 8. Health Check Endpoints (Both /api/v1/health and root /health)
const healthHandler = (req, res) => {
  const dbStatus = getDatabaseStatus();
  const uptimeSeconds = Math.floor(process.uptime());

  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: `${uptimeSeconds}s`,
    environment: env.NODE_ENV,
    service: 'Student Management System REST API (AKTU BCS 554)',
    database: dbStatus
  });
};

app.get('/api/v1/health', healthHandler);
app.get('/health', healthHandler);

// 9. CSRF Protection for all state-changing API operations
app.use('/api', csrfProtection);

// 10. API Route Registration
app.use('/api/v1', v1Router);
app.use('/api', v1Router); // Backward compatibility alias

// 11. Dual-Mode Frontend SPA Serving
const clientDistPath = path.resolve(__dirname, '../client/dist');
const indexHtmlPath = path.join(clientDistPath, 'index.html');

if (fs.existsSync(clientDistPath) && fs.existsSync(indexHtmlPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(indexHtmlPath);
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 60px;">
        <h2 style="color: #1e3a8a;">Student Management System (AKTU BCS 554)</h2>
        <p style="color: #4b5563;">Express REST API Backend is running actively.</p>
        <p>Production frontend build not found in <code>client/dist</code>.</p>
        <p>Run <code>npm run build:client</code> to compile the frontend, or view via <code>npm run dev</code> on port 5173.</p>
      </div>
    `);
  });
}

// 12. Handle Unmatched API Endpoints
app.use('/api', notFoundHandler);

// 13. Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
