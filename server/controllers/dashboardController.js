import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import AttendanceSession from '../models/AttendanceSession.js';
import Examination from '../models/Examination.js';
import InternalAssessment from '../models/InternalAssessment.js';
import AssessmentMark from '../models/AssessmentMark.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Enrollment from '../models/Enrollment.js';
import Announcement from '../models/Announcement.js';
import AuditLog from '../models/AuditLog.js';
import { sendSuccess } from '../utils/responseHandler.js';
import {
  getAdminOverviewReport,
  getStudentAttendanceSummary
} from '../services/attendanceCalculationService.js';

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

    const [
      attendanceOverview,
      recentAnnouncements,
      recentAuditLogs,
      examSummaryRaw,
      assessSummaryRaw,
      totalAssessmentMarks
    ] = await Promise.all([
      getAdminOverviewReport({}),
      Announcement.find().sort({ createdAt: -1 }).limit(5).lean(),
      AuditLog.find()
        .populate('actor', 'name email')
        .sort({ timestamp: -1 })
        .limit(8)
        .lean(),
      Examination.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            scheduled: { $sum: { $cond: [{ $eq: ['$status', 'SCHEDULED'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            published: { $sum: { $cond: [{ $eq: ['$status', 'PUBLISHED'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
            draft: { $sum: { $cond: [{ $eq: ['$status', 'DRAFT'] }, 1, 0] } }
          }
        }
      ]),
      InternalAssessment.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
            finalized: { $sum: { $cond: [{ $eq: ['$status', 'FINALIZED'] }, 1, 0] } },
            published: { $sum: { $cond: [{ $eq: ['$status', 'PUBLISHED'] }, 1, 0] } }
          }
        }
      ]),
      AssessmentMark.countDocuments()
    ]);

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
      avgAttendance: attendanceOverview.overall.percentage,
      attendanceOverview,
      examinationSummary: examSummaryRaw[0] || {
        total: 0,
        scheduled: 0,
        completed: 0,
        published: 0,
        cancelled: 0,
        draft: 0
      },
      assessmentSummary: {
        ...(assessSummaryRaw[0] || { total: 0, active: 0, finalized: 0, published: 0 }),
        totalMarksEntered: totalAssessmentMarks
      },
      recentAnnouncements,
      recentAuditLogs
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

    const [sessionCounts, recentSessions] = faculty?._id
      ? await Promise.all([
          AttendanceSession.aggregate([
            { $match: { faculty: faculty._id } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                open: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
                finalized: { $sum: { $cond: [{ $eq: ['$status', 'FINALIZED'] }, 1, 0] } }
              }
            }
          ]),
          AttendanceSession.find({ faculty: faculty._id })
            .populate('subject', 'code name')
            .populate('course', 'code')
            .populate('semester', 'semesterNumber')
            .sort({ sessionDate: -1, createdAt: -1 })
            .limit(5)
            .lean()
        ])
      : [[], []];

    let assessmentOverview = { assignedComponents: 0, pendingSubmissions: 0, completedSubmissions: 0 };
    if (assignments.length > 0) {
      const assessDocs = await InternalAssessment.find({
        isCancelled: false,
        $or: assignments.map((a) => ({
          subject: a.subject?._id || a.subject,
          semester: a.semester?._id || a.semester,
          academicYear: a.academicYear
        }))
      })
        .select('status')
        .lean();
      assessmentOverview = {
        assignedComponents: assessDocs.length,
        pendingSubmissions: assessDocs.filter((x) => x.status === 'DRAFT' || x.status === 'ACTIVE').length,
        completedSubmissions: assessDocs.filter((x) => x.status === 'FINALIZED' || x.status === 'PUBLISHED').length
      };
    }

    return sendSuccess(res, 'Faculty dashboard stats', {
      faculty,
      assignedCount: assignments.length,
      totalEnrolledStudents,
      assignments,
      attendanceSessionsSummary: sessionCounts[0] || { total: 0, open: 0, finalized: 0 },
      recentSessions,
      assessmentOverview,
      notices
    });
  } catch (err) { next(err); }
};

export const getStudentDashboardStats = async (req, res, next) => {
  try {
    const studentId = req.user.profileId;
    const [student, enrollments, attendanceSummary, notices] = await Promise.all([
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
      studentId ? getStudentAttendanceSummary(studentId) : Promise.resolve(null),
      Announcement.find({ targetAudience: { $in: ['ALL', 'STUDENTS'] } }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const overallAtt = attendanceSummary?.overall || {
      totalSessions: 0,
      attendedCount: 0,
      absentCount: 0,
      lateCount: 0,
      percentage: null,
      threshold: 75,
      isBelowThreshold: false,
      hasNoData: true
    };

    const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE');
    const totalActiveCredits = activeEnrollments.reduce((acc, e) => acc + (e.subject?.credits || 0), 0);

    const publishedAssessmentIds = await InternalAssessment.find({ status: 'PUBLISHED' }).distinct('_id');
    const publishedAssessmentMarks = studentId
      ? await AssessmentMark.find({ student: studentId, assessment: { $in: publishedAssessmentIds } })
          .populate('assessment', 'name componentType maxMarks assessmentDate status')
          .populate('subject', 'code name')
          .sort({ createdAt: -1 })
          .lean()
      : [];

    return sendSuccess(res, 'Student dashboard stats', {
      student,
      enrolledCount: activeEnrollments.length,
      totalEnrollmentsCount: enrollments.length,
      totalActiveCredits,
      enrollments,
      attendancePercentage: overallAtt.percentage,
      attendanceThreshold: overallAtt.threshold,
      isDefaulter: overallAtt.isBelowThreshold,
      totalClasses: overallAtt.totalSessions,
      classesAttended: overallAtt.attendedCount,
      absentCount: overallAtt.absentCount,
      lateCount: overallAtt.lateCount,
      subjectAttendance: attendanceSummary?.subjects || [],
      publishedAssessmentsCount: publishedAssessmentMarks.length,
      publishedAssessmentMarks,
      notices
    });
  } catch (err) { next(err); }
};
