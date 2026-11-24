import connectDB, { closeDatabase } from '../config/db.js';
import User from '../models/User.js';

/**
 * One-time safe migration normalizing legacy uppercase role strings to lowercase.
 */
const migrateRoles = async () => {
  try {
    await connectDB();
    const users = await User.find({}).lean();
    let updatedCount = 0;

    for (const user of users) {
      const normalized = (user.role || 'student').toLowerCase();
      if (user.role !== normalized || typeof user.tokenVersion !== 'number') {
        await User.collection.updateOne(
          { _id: user._id },
          {
            $set: {
              role: normalized,
              tokenVersion: typeof user.tokenVersion === 'number' ? user.tokenVersion : 0
            }
          }
        );
        updatedCount++;
      }
    }

    const summary = await User.find({}, 'role isActive tokenVersion').lean();
    console.log(`[Migration] Updated ${updatedCount} user record(s). Current roles:`, summary);
    await closeDatabase();
    process.exit(0);
  } catch (err) {
    console.error('[Migration Error]', err.message);
    await closeDatabase();
    process.exit(1);
  }
};

migrateRoles();
