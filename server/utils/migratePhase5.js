import connectDB, { closeDatabase } from '../config/db.js';
import { User, Student, Faculty, Course, Semester } from '../models/index.js';

/**
 * Non-destructive Phase 5 backfill migration:
 * - Populates missing `name` on User records from linked Student/Faculty profiles or default label.
 * - Links existing Student records missing `course`/`semester` refs to active B.Tech CSE Sem 5 if found.
 * - Sets default `status` and `specialization` on existing Faculty records where missing.
 */
const migratePhase5 = async () => {
  try {
    await connectDB();

    const users = await User.find({}).lean();
    let userUpdates = 0;

    for (const user of users) {
      if (!user.name) {
        let derivedName = 'System Administrator';
        if (user.role === 'student') {
          const s = await Student.findOne({ user: user._id }).lean();
          derivedName = s ? `${s.firstName} ${s.lastName}`.trim() : 'Student User';
        } else if (user.role === 'faculty') {
          const f = await Faculty.findOne({ user: user._id }).lean();
          derivedName = f ? `${f.firstName} ${f.lastName}`.trim() : 'Faculty Member';
        }
        await User.updateOne({ _id: user._id }, { $set: { name: derivedName } });
        userUpdates++;
      }
    }

    const students = await Student.find({}).lean();
    let studentUpdates = 0;
    for (const student of students) {
      const updates = {};
      if (!student.course) {
        const course = await Course.findOne({ department: student.department }).lean();
        if (course) updates.course = course._id;
      }
      const targetCourseId = updates.course || student.course;
      if (!student.semester && targetCourseId) {
        const sem =
          (await Semester.findOne({ course: targetCourseId, semesterNumber: student.currentSemester }).lean()) ||
          (await Semester.findOne({ course: targetCourseId }).lean());
        if (sem) {
          updates.semester = sem._id;
          if (!student.academicYear) updates.academicYear = sem.academicYear;
        }
      }
      if (!student.admissionYear) {
        updates.admissionYear = 2024;
      }
      if (!student.status) {
        updates.status = 'ACTIVE';
      }
      if (Object.keys(updates).length > 0) {
        await Student.updateOne({ _id: student._id }, { $set: updates });
        studentUpdates++;
      }
    }

    const faculties = await Faculty.find({}).lean();
    let facultyUpdates = 0;
    for (const fac of faculties) {
      const updates = {};
      if (!fac.status) updates.status = 'ACTIVE';
      if (!fac.specialization) updates.specialization = fac.qualification || 'Computer Science & Engineering';
      if (Object.keys(updates).length > 0) {
        await Faculty.updateOne({ _id: fac._id }, { $set: updates });
        facultyUpdates++;
      }
    }

    console.log('[Phase 5 Migration Complete]', { userUpdates, studentUpdates, facultyUpdates });
    await closeDatabase();
    process.exit(0);
  } catch (err) {
    console.error('[Phase 5 Migration Error]', err.message);
    await closeDatabase();
    process.exit(1);
  }
};

migratePhase5();
