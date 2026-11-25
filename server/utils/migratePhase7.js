import connectDB, { closeDatabase } from '../config/db.js';
import { Enrollment, FacultyAssignment, Subject } from '../models/index.js';

/**
 * Non-destructive Phase 7 index & backfill migration:
 * - Drops legacy Enrollment unique index (`student_1_semester_1_academicYear_1`) on empty/compatible collection
 *   and syncs the partial unique subject-enrollment index.
 * - Backfills missing `course` on existing FacultyAssignment records from their linked Subject
 *   and syncs partial unique assignment index.
 */
const migratePhase7 = async () => {
  try {
    await connectDB();

    // 1. Backfill FacultyAssignment.course from linked Subject
    const assignments = await FacultyAssignment.find({}).lean();
    let assignmentBackfills = 0;
    for (const a of assignments) {
      if (!a.course) {
        const sub = await Subject.findById(a.subject).select('course').lean();
        if (sub?.course) {
          await FacultyAssignment.updateOne(
            { _id: a._id },
            { $set: { course: sub.course, assignmentDate: a.assignmentDate || a.createdAt || new Date() } }
          );
          assignmentBackfills++;
        }
      }
    }

    // 2. Drop legacy strict unique indexes that lacked partialFilterExpression or subject
    const enrIndexes = await Enrollment.collection.indexes();
    if (enrIndexes.some((i) => i.name === 'student_1_semester_1_academicYear_1')) {
      await Enrollment.collection.dropIndex('student_1_semester_1_academicYear_1');
      console.log('[Migration] Dropped legacy Enrollment index student_1_semester_1_academicYear_1');
    }

    const faIndexes = await FacultyAssignment.collection.indexes();
    const legacyFaIdx = faIndexes.find((i) => i.name === 'faculty_1_subject_1_semester_1_section_1_academicYear_1');
    if (legacyFaIdx && !legacyFaIdx.partialFilterExpression) {
      await FacultyAssignment.collection.dropIndex('faculty_1_subject_1_semester_1_section_1_academicYear_1');
      console.log('[Migration] Dropped legacy non-partial FacultyAssignment unique index');
    }

    // 3. Synchronize Mongoose schema indexes cleanly
    await Promise.all([Enrollment.syncIndexes(), FacultyAssignment.syncIndexes()]);

    console.log('[Phase 7 Migration Complete]', { assignmentBackfills });
    await closeDatabase();
    process.exit(0);
  } catch (err) {
    console.error('[Phase 7 Migration Error]', err.message);
    await closeDatabase();
    process.exit(1);
  }
};

migratePhase7();
