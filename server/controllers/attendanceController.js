import Attendance from '../models/Attendance.js';
import Enrollment from '../models/Enrollment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

// Batch submit attendance for a class
export const submitAttendanceBatch = async (req, res, next) => {
  try {
    const { subjectId, semesterId, date, records } = req.body;

    if (!subjectId || !semesterId || !date || !records || !Array.isArray(records)) {
      return sendError(res, 'Incomplete attendance submission payload', null, 400);
    }

    const attendanceDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (attendanceDate > today) {
      return sendError(res, 'Attendance date cannot be in the future', null, 400);
    }

    const operations = records.map((record) => ({
      updateOne: {
        filter: {
          student: record.studentId,
          subject: subjectId,
          semester: semesterId,
          date: attendanceDate
        },
        update: {
          $set: {
            markedBy: req.user.profileId || req.user.userId,
            status: record.status,
            remarks: record.remarks || ''
          }
        },
        upsert: true
      }
    }));

    const result = await Attendance.bulkWrite(operations);

    return sendSuccess(res, 'Attendance recorded successfully', {
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (err) { next(err); }
};

// Get student attendance summary
export const getStudentAttendanceSummary = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.user.profileId;

    if (req.user.role === 'student' && req.user.profileId !== studentId) {
      return sendError(res, 'Forbidden: cannot access another student records', null, 403);
    }

    const records = await Attendance.find({ student: studentId })
      .populate('subject', 'code name credits')
      .populate('semester', 'semesterNumber academicYear')
      .sort({ date: -1 });

    const totalClasses = records.length;
    const attendedClasses = records.filter(r => r.status === 'PRESENT' || r.status === 'EXCUSED').length;
    const percentage = totalClasses > 0 ? Number(((attendedClasses / totalClasses) * 100).toFixed(1)) : 100;

    // Subject-wise breakdown
    const subjectMap = {};
    for (const rec of records) {
      const subId = rec.subject?._id?.toString() || 'unknown';
      if (!subjectMap[subId]) {
        subjectMap[subId] = {
          subject: rec.subject,
          total: 0,
          attended: 0
        };
      }
      subjectMap[subId].total += 1;
      if (rec.status === 'PRESENT' || rec.status === 'EXCUSED') {
        subjectMap[subId].attended += 1;
      }
    }

    const subjectBreakdown = Object.values(subjectMap).map(item => ({
      subject: item.subject,
      totalClasses: item.total,
      attendedClasses: item.attended,
      percentage: Number(((item.attended / item.total) * 100).toFixed(1)),
      isDefaulter: (item.attended / item.total) * 100 < 75
    }));

    return sendSuccess(res, 'Attendance summary retrieved', {
      overall: {
        totalClasses,
        attendedClasses,
        percentage,
        isDefaulter: percentage < 75
      },
      subjects: subjectBreakdown,
      history: records.slice(0, 50)
    });
  } catch (err) { next(err); }
};
