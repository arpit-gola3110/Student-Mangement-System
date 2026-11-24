import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/student_mdc_db';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5 seconds instead of hanging
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('[DATABASE CONNECTION ERROR]');
    console.error(`Target URI: ${uri}`);
    console.error(`Reason: ${error.message}`);
    console.error('='.repeat(70));

    if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
      console.error('\n--> Local MongoDB server is not running on port 27017.');
      console.error('\nSOLUTION OPTIONS:');
      console.error('1. RECOMMENDED (MongoDB Atlas Cloud - Matches your project stack):');
      console.error('   - Create a free database at https://www.mongodb.com/cloud/atlas');
      console.error('   - Copy your connection string (mongodb+srv://...)');
      console.error('   - Paste it into "server/.env":');
      console.error('     MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/student_mdc_db?retryWrites=true&w=majority\n');
      console.error('2. LOCAL MONGODB SERVER:');
      console.error('   - Download & install MongoDB Community Server on Windows:');
      console.error('     https://www.mongodb.com/try/download/community');
      console.error('   - Start the MongoDB Windows service.\n');
    }
    console.error('='.repeat(70) + '\n');

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;
