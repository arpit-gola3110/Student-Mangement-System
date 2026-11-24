import app from './app.js';
import connectDB, { closeDatabase } from './config/db.js';
import env from './config/env.js';

let currentServer = null;

/**
 * Starts Express HTTP server with automatic port-fallback mechanism
 * and attaches graceful shutdown process listeners.
 */
const listenWithFallback = (port) => {
  currentServer = app.listen(port, () => {
    console.log('\n' + '='.repeat(60));
    console.log(`[SMS Backend Active] http://localhost:${port}`);
    console.log(`[API v1 Base]       http://localhost:${port}/api/v1`);
    console.log(`[Health Endpoint]   http://localhost:${port}/api/v1/health`);
    console.log(`[Frontend Mode]     Direct SPA Serving from client/dist`);
    console.log(`[Environment]       ${env.NODE_ENV}`);
    console.log('='.repeat(60) + '\n');
  });

  currentServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`\n[Notice] Port ${port} is currently in use.`);
      console.log(`[Port Fallback] Attempting fallback to port ${port + 1}...`);
      listenWithFallback(port + 1);
    } else {
      console.error('[Server Listener Error]', err.message);
    }
  });
};

const startServer = async (port) => {
  try {
    // Attempt database connection once on startup
    await connectDB();
    listenWithFallback(port);
  } catch (error) {
    console.error('[Startup Error]', error.message);
  }
};

/**
 * Handles graceful process termination
 */
const handleGracefulShutdown = (signal) => {
  console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);

  if (currentServer) {
    currentServer.close(async () => {
      console.log('[Shutdown] Express HTTP server closed.');
      try {
        await closeDatabase();
        console.log('[Shutdown] All connections safely released. Process exiting.');
        process.exit(0);
      } catch (err) {
        console.error('[Shutdown Error] Failed to close database connection cleanly:', err);
        process.exit(1);
      }
    });

    // Force exit after 10s if graceful termination hangs
    setTimeout(() => {
      console.error('[Shutdown Timeout] Forcefully terminating process.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
};

// Process termination signal listeners
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

// Uncaught exception and rejection handlers
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
  handleGracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Launch server on configured port
startServer(env.PORT);

export default app;
