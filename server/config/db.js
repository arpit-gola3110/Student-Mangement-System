import mongoose from 'mongoose';
import env from './env.js';

let isConnected = false;

/**
 * Returns current MongoDB connection status details for health checks.
 */
export const getDatabaseStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };

  const readyState = mongoose.connection.readyState;
  return {
    state: states[readyState] || 'unknown',
    isConnected: readyState === 1,
    host: isConnected ? mongoose.connection.host : null,
    name: isConnected ? mongoose.connection.name : null
  };
};

/**
 * Establishes MongoDB connection using Mongoose ODM.
 */
export const connectDB = async () => {
  const uri = env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: env.NODE_ENV !== 'production' // Build indexes automatically in development
    });

    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    isConnected = false;
    console.error('\n' + '='.repeat(70));
    console.error('[DATABASE CONNECTION ERROR]');
    console.error(`Target URI: ${uri.replace(/\/\/[^@]+@/, '//***:***@')}`); // Mask credentials if present
    console.error(`Reason: ${error.message}`);
    console.error('='.repeat(70));

    if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
      console.warn('\n--> Local MongoDB server is not active on port 27017.');
      console.warn('Solutions:');
      console.warn('1. (Recommended) Configure free MongoDB Atlas URI in server/.env:');
      console.warn('   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/student_mdc_db?retryWrites=true&w=majority');
      console.warn('2. Start local MongoDB Community Server service on Windows.\n');
    }

    if (env.NODE_ENV === 'production') {
      console.error('[FATAL] Exiting application because database connection is required in production.');
      process.exit(1);
    }
  }
};

/**
 * Graceful database connection termination.
 */
export const closeDatabase = async () => {
  if (isConnected) {
    await mongoose.connection.close(false);
    isConnected = false;
    console.log('[Database] Mongoose connection closed gracefully.');
  }
};

// Event Listeners
mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[Database Warning] MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.error(`[Database Error] Mongoose runtime error: ${err.message}`);
});

export default connectDB;
