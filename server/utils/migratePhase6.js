import connectDB, { closeDatabase } from '../config/db.js';
import { Department, Course, Semester, Subject } from '../models/index.js';

/**
 * Non-destructive Phase 6 backfill migration:
 * Ensures existing Department, Course, Semester, and Subject records have
 * `isActive` and Subject marks metadata stored explicitly in MongoDB.
 */
const migratePhase6 = async () => {
  try {
    await connectDB();

    const [depts, courses, semesters, subjects] = await Promise.all([
      Department.find({}).lean(),
      Course.find({}).lean(),
      Semester.find({}).lean(),
      Subject.find({}).lean()
    ]);

    let deptUpdates = 0;
    for (const d of depts) {
      if (typeof d.isActive !== 'boolean') {
        await Department.updateOne({ _id: d._id }, { $set: { isActive: true } });
        deptUpdates++;
      }
    }

    let courseUpdates = 0;
    for (const c of courses) {
      const updates = {};
      if (typeof c.isActive !== 'boolean') updates.isActive = true;
      if (c.description === undefined) updates.description = '';
      if (Object.keys(updates).length) {
        await Course.updateOne({ _id: c._id }, { $set: updates });
        courseUpdates++;
      }
    }

    let semesterUpdates = 0;
    for (const s of semesters) {
      if (typeof s.isActive !== 'boolean') {
        await Semester.updateOne({ _id: s._id }, { $set: { isActive: true } });
        semesterUpdates++;
      }
    }

    let subjectUpdates = 0;
    for (const sub of subjects) {
      const updates = {};
      if (typeof sub.isActive !== 'boolean') updates.isActive = true;
      if (sub.maxInternalMarks === undefined) updates.maxInternalMarks = sub.type === 'PROJECT' || sub.type === 'PRACTICAL' ? 50 : 30;
      if (sub.maxExternalMarks === undefined) updates.maxExternalMarks = sub.type === 'PROJECT' || sub.type === 'PRACTICAL' ? 50 : 70;
      if (sub.description === undefined) updates.description = '';
      if (Object.keys(updates).length) {
        await Subject.updateOne({ _id: sub._id }, { $set: updates });
        subjectUpdates++;
      }
    }

    console.log('[Phase 6 Migration Complete]', { deptUpdates, courseUpdates, semesterUpdates, subjectUpdates });
    await closeDatabase();
    process.exit(0);
  } catch (err) {
    console.error('[Phase 6 Migration Error]', err.message);
    await closeDatabase();
    process.exit(1);
  }
};

migratePhase6();
