import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import Attendance from '../models/Attendance.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Enrollment from '../models/Enrollment.js';
import Announcement from '../models/Announcement.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getAdminDashboardStats = async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalFaculty,
      totalDepartments,
      activeDepartments,
      totalCourses,
      activeCourses,
      totalSemesters,
      activeSemesters,
      totalSubjects,
      activeSubjects
    ] = await Promise.all([
      Student.countDocuments({ status: 'ACTIVE' }),
      Faculty.countDocuments({ status: { $ne: 'INACTIVE' } }),
      Department.countDocuments(),
      Department.countDocuments({ isActive: { $ne: false } }),
      Course.countDocuments(),
      Course.countDocuments({ isActive: { $ne: false } }),
      Semester.countDocuments(),
      Semester.countDocuments({ isActive: { $ne: false } }),
      Subject.countDocuments(),
      Subject.countDocuments({ isActive: { $ne: false } })
    ]);

    // Aggregate attendance percentage overall
    const attendanceStats = await Attendance.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $in: ['$status', ['PRESENT', 'EXCUSED']] }, 1, 0] }
          }
        }
      }
    ]);

    const avgAttendance = attendanceStats.length > 0 && attendanceStats[0].total > 0
      ? Number(((attendanceStats[0].present / attendanceStats[0].total) * 100).toFixed(1))
      : 0;

    return sendSuccess(res, 'Admin dashboard stats', {
      totalStudents,
      totalFaculty,
      totalDepartments,
      activeDepartments,
      totalCourses,
      activeCourses,
      totalSemesters,
      activeSemesters,
      totalSubjects,
      activeSubjects,
      avgAttendance,
      recentAnnouncements: await Announcement.find().sort({ createdAt: -1 }).limit(5)
    });
  } catch (err) { next(err); }
};

export const getFacultyDashboardStats = async (req, res, next) => {
  try {
    const facultyId = req.user.profileId;
    const [faculty, rawAssignments, notices] = await Promise.all([
      Faculty.findById(facultyId).populate('department', 'code name').lean(),
      FacultyAssignment.find({ faculty: facultyId, status: 'ACTIVE' })
        .populate({
          path: 'course',
          select: 'code name department',
          populate: { path: 'department', select: 'code name' }
        })
        .populate('subject', 'code name credits type')
        .populate('semester', 'semesterNumber academicYear status')
        .sort({ createdAt: -1 })
        .lean(),
      Announcement.find({ targetAudience: { $in: ['ALL', 'FACULTY'] } }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    let assignments = rawAssignments;
    let totalEnrolledStudents = 0;

    if (rawAssignments.length > 0) {
      const matchOr = rawAssignments.map((a) => ({
        subject: a.subject?._id || a.subject,
        semester: a.semester?._id || a.semester,
        academicYear: a.academicYear,
        section: a.section || 'A',
        status: 'ACTIVE'
      }));
      const counts = await Enrollment.aggregate([
        { $match: { $or: matchOr } },
        {
          $group: {
            _id: {
              subject: '$subject',
              semester: '$semester',
              academicYear: '$academicYear',
              section: '$section'
            },
            count: { $sum: 1 }
          }
        }
      ]);
      const countMap = new Map(
        counts.map((c) => [`${c._id.subject}|${c._id.semester}|${c._id.academicYear}|${c._id.section}`, c.count])
      );
      assignments = rawAssignments.map((a) => {
        const key = `${a.subject?._id || a.subject}|${a.semester?._id || a.semester}|${a.academicYear}|${a.section || 'A'}`;
        const enrolledStudentCount = countMap.get(key) || 0;
        totalEnrolledStudents += enrolledStudentCount;
        return { ...a, enrolledStudentCount };
      });
    }

    return sendSuccess(res, 'Faculty dashboard stats', {
      faculty,
      assignedCount: assignments.length,
      totalEnrolledStudents,
      assignments,
      notices
    });
  } catch (err) { next(err); }
};

export const getStudentDashboardStats = async (req, res, next) => {
  try {
    const studentId = req.user.profileId;
    const [student, enrollments, attendanceRecords, notices] = await Promise.all([
      Student.findById(studentId)
        .populate('department', 'code name')
        .populate('course', 'code name')
        .populate('semester', 'semesterNumber academicYear')
        .lean(),
      Enrollment.find({ student: studentId })
        .populate({
          path: 'course',
          select: 'code name department',
          populate: { path: 'department', select: 'code name' }
        })
        .populate('subject', 'code name credits type')
        .populate('semester', 'semesterNumber academicYear status')
        .sort({ createdAt: -1 })
        .lean(),
      Attendance.find({ student: studentId }).lean(),
      Announcement.find({ targetAudience: { $in: ['ALL', 'STUDENTS'] } }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const total = attendanceRecords.length;
    const attended = attendanceRecords.filter((r) => r.status === 'PRESENT' || r.status === 'EXCUSED').length;
    const attendancePct = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : null;

    const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE');
    const totalActiveCredits = activeEnrollments.reduce((acc, e) => acc + (e.subject?.credits || 0), 0);

    return sendSuccess(res, 'Student dashboard stats', {
      student,
      enrolledCount: activeEnrollments.length,
      totalEnrollmentsCount: enrollments.length,
      totalActiveCredits,
      enrollments,
      attendancePercentage: attendancePct,
      isDefaulter: attendancePct !== null ? attendancePct < 75 : false,
      totalClasses: total,
      classesAttended: attended,
      notices
    });
  } catch (err) { next(err); }
};
