import connectDB, { closeDatabase } from '../config/db.js';
import Examination from '../models/Examination.js';
import InternalAssessment from '../models/InternalAssessment.js';
import AssessmentMark from '../models/AssessmentMark.js';

const migratePhase9 = async () => {
  await connectDB();

  const existingExams = await Examination.countDocuments();
  console.log(`[Phase 9 Migration] Existing Examination records: ${existingExams}`);

  try {
    const indexes = await Examination.collection.indexes();
    const oldIdx = indexes.find((i) => i.name === 'semester_1_examType_1_academicYear_1');
    if (oldIdx) {
      await Examination.collection.dropIndex('semester_1_examType_1_academicYear_1');
      console.log('[Phase 9 Migration] Dropped legacy Examination index semester_1_examType_1_academicYear_1');
    }
  } catch (err) {
    if (err.codeName !== 'IndexNotFound') {
      throw err;
    }
  }

  await Examination.syncIndexes();
  await InternalAssessment.syncIndexes();
  await AssessmentMark.syncIndexes();

  console.log('[Phase 9 Migration Complete] Examination, InternalAssessment, and AssessmentMark indexes synchronized cleanly.');
  await closeDatabase();
};

migratePhase9().catch(async (err) => {
  console.error('[Phase 9 Migration Error]', err);
  await closeDatabase();
  process.exit(1);
});
