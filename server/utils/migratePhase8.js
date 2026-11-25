import connectDB, { closeDatabase } from '../config/db.js';
import Attendance from '../models/Attendance.js';
import AttendanceSession from '../models/AttendanceSession.js';

const migratePhase8 = async () => {
  await connectDB();

  const existingCount = await Attendance.countDocuments();
  console.log(`[Phase 8 Migration] Existing Attendance documents: ${existingCount}`);

  try {
    const indexes = await Attendance.collection.indexes();
    const legacyIdx = indexes.find(
      (idx) => idx.name === 'student_1_subject_1_date_1_semester_1' && !idx.partialFilterExpression
    );
    if (legacyIdx) {
      await Attendance.collection.dropIndex('student_1_subject_1_date_1_semester_1');
      console.log('[Phase 8 Migration] Dropped non-partial legacy Attendance index student_1_subject_1_date_1_semester_1');
    }
  } catch (err) {
    if (err.codeName !== 'IndexNotFound') {
      throw err;
    }
  }

  await Attendance.syncIndexes();
  await AttendanceSession.syncIndexes();

  console.log('[Phase 8 Migration Complete] Attendance and AttendanceSession indexes synchronized cleanly.');
  await closeDatabase();
};

migratePhase8().catch(async (err) => {
  console.error('[Phase 8 Migration Error]', err);
  await closeDatabase();
  process.exit(1);
});
