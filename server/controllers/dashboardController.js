import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Announcement from '../models/Announcement.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getAdminDashboardStats = async (req, res, next) => {
  try {
    const [totalStudents, totalFaculty, totalDepartments, totalCourses] = await Promise.all([
      Student.countDocuments({ status: 'ACTIVE' }),
      Faculty.countDocuments(),
      Department.countDocuments(),
      Course.countDocuments()
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
      : 85.0;

    return sendSuccess(res, 'Admin dashboard stats', {
      totalStudents,
      totalFaculty,
      totalDepartments,
      totalCourses,
      avgAttendance,
      recentAnnouncements: await Announcement.find().sort({ createdAt: -1 }).limit(5)
    });
  } catch (err) { next(err); }
};

export const getFacultyDashboardStats = async (req, res, next) => {
  try {
    const facultyId = req.user.profileId;
    const assignments = await FacultyAssignment.find({ faculty: facultyId })
      .populate('subject')
      .populate('semester');

    return sendSuccess(res, 'Faculty dashboard stats', {
      assignedCount: assignments.length,
      assignments,
      notices: await Announcement.find({ targetAudience: { $in: ['ALL', 'FACULTY'] } }).sort({ createdAt: -1 }).limit(5)
    });
  } catch (err) { next(err); }
};

export const getStudentDashboardStats = async (req, res, next) => {
  try {
    const studentId = req.user.profileId;
    const student = await Student.findById(studentId).populate('department');

    const attendanceRecords = await Attendance.find({ student: studentId });
    const total = attendanceRecords.length;
    const attended = attendanceRecords.filter(r => r.status === 'PRESENT' || r.status === 'EXCUSED').length;
    const attendancePct = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 100;

    return sendSuccess(res, 'Student dashboard stats', {
      student,
      attendancePercentage: attendancePct,
      isDefaulter: attendancePct < 75,
      totalClasses: total,
      classesAttended: attended,
      notices: await Announcement.find({ targetAudience: { $in: ['ALL', 'STUDENTS'] } }).sort({ createdAt: -1 }).limit(5)
    });
  } catch (err) { next(err); }
};
