import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import apiRoutes from './routes/api.js';
import { errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let PORT = parseInt(process.env.PORT, 10) || 5000;

// Connect to MongoDB
connectDB();

// Global Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Silent favicon handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'Student Management System REST API (AKTU BCS 554)',
    port: PORT
  });
});

// API Routes
app.use('/api', apiRoutes);

// --- SERVE BUILT REACT FRONTEND DIRECTLY FROM PORT 5000 ---
const clientDistPath = path.resolve(__dirname, '../client/dist');
const indexHtmlPath = path.join(clientDistPath, 'index.html');

if (fs.existsSync(clientDistPath) && fs.existsSync(indexHtmlPath)) {
  // Serve static assets from client/dist (CSS, JS, images)
  app.use(express.static(clientDistPath));

  // For any client route (e.g. /login, /admin/dashboard, etc.), serve index.html for React Router
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(indexHtmlPath);
  });
} else {
  // Fallback if client is not built yet
  app.get('/', (req, res) => {
    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>React frontend build not found</h2>
        <p>Run <code>cd client; npm run build</code> to compile the frontend, or run <code>cd client; npm run dev</code> for development mode.</p>
      </div>
    `);
  });
}

// Centralized error handler
app.use(errorHandler);

const startServer = (port) => {
  const server = app.listen(port, () => {
    PORT = port;
    console.log(`\n==================================================`);
    console.log(`[SMS Backend & UI] Active on: http://localhost:${port}`);
    console.log(`[Frontend SPA] Serving directly from client/dist`);
    console.log(`==================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`\n[Notice] Port ${port} is currently in use.`);
      console.log(`[Port Fallback] Automatically switching to port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[Server Error]', err.message);
    }
  });
};

startServer(PORT);

export default app;
