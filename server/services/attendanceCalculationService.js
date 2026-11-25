import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import AttendanceSession from '../models/AttendanceSession.js';
import Enrollment from '../models/Enrollment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import Course from '../models/Course.js';
import Department from '../models/Department.js';
import Faculty from '../models/Faculty.js';
import ApiError from '../utils/ApiError.js';
import {
  ATTENDANCE_POLICY,
  getAttendanceThreshold,
  computeAttendanceMetrics,
  normalizeAcademicDate
} from '../utils/attendancePolicy.js';
import { escapeRegex, buildPagination, formatPaginationMeta } from '../utils/queryHelpers.js';

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

const buildSessionDateMatch = (startDate, endDate) => {
  const range = {};
  if (startDate) range.$gte = normalizeAcademicDate(startDate).sessionDate;
  if (endDate) range.$lte = normalizeAcademicDate(endDate).sessionDate;
  return Object.keys(range).length > 0 ? range : null;
};

/**
 * Reusable lookup pipeline restricting Attendance aggregations strictly to FINALIZED sessions.
 */
const finalizedSessionLookupStages = (sessionExtraMatch = {}) => {
  const postLookupMatch = { 'sessionDoc.status': 'FINALIZED' };
  Object.entries(sessionExtraMatch).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      postLookupMatch[`sessionDoc.${k}`] = v;
    }
  });
  return [
    { $match: { session: { $exists: true, $ne: null } } },
    {
      $lookup: {
        from: 'attendancesessions',
        localField: 'session',
        foreignField: '_id',
        as: 'sessionDoc'
      }
    },
    { $unwind: '$sessionDoc' },
    { $match: postLookupMatch }
  ];
};

/**
 * Computes authoritative overall + subject-wise attendance summary for a single student.
 * Overall percentage aggregates raw finalized sessions (NOT unweighted average of subject %).
 */
export const getStudentAttendanceSummary = async (studentId, query = {}) => {
  const student = await Student.findById(studentId)
    .populate('department', 'code name')
    .populate('course', 'code name')
    .populate('semester', 'semesterNumber academicYear')
    .lean();

  if (!student) {
    throw ApiError.notFound('Student record not found');
  }

  const enrollmentFilter = { student: student._id, status: 'ACTIVE' };
  if (query.semester) enrollmentFilter.semester = query.semester;
  if (query.subject) enrollmentFilter.subject = query.subject;
  if (query.academicYear) enrollmentFilter.academicYear = query.academicYear;

  const activeEnrollments = await Enrollment.find(enrollmentFilter)
    .populate('subject', 'code name credits type')
    .populate('course', 'code name')
    .populate('semester', 'semesterNumber academicYear')
    .lean();

  const attMatch = { student: toObjectId(student._id) };
  if (query.semester) attMatch.semester = toObjectId(query.semester);
  if (query.subject) attMatch.subject = toObjectId(query.subject);
  if (query.academicYear) attMatch.academicYear = query.academicYear;

  const sessionExtraMatch = {};
  const sessionDateRange = buildSessionDateMatch(query.startDate, query.endDate);
  if (sessionDateRange) sessionExtraMatch.sessionDate = sessionDateRange;

  const aggregatedBySubject = await Attendance.aggregate([
    { $match: attMatch },
    ...finalizedSessionLookupStages(sessionExtraMatch),
    {
      $group: {
        _id: {
          subject: '$subject',
          semester: '$semester',
          academicYear: '$sessionDoc.academicYear'
        },
        presentCount: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
        absentCount: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
        lateCount: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
        excusedCount: { $sum: { $cond: [{ $eq: ['$status', 'EXCUSED'] }, 1, 0] } },
        lastMarkedDate: { $max: '$sessionDoc.sessionDate' }
      }
    }
  ]);

  const countsMap = new Map();
  for (const row of aggregatedBySubject) {
    const key = `${row._id.subject}|${row._id.semester}|${row._id.academicYear || ''}`;
    countsMap.set(key, row);
  }

  // Merge active enrollments with attendance statistics so 0-session subjects show no-data state
  const seenKeys = new Set();
  const subjectEntries = [];

  for (const enr of activeEnrollments) {
    if (!enr.subject) continue;
    const key = `${enr.subject._id}|${enr.semester?._id || enr.semester}|${enr.academicYear}`;
    seenKeys.add(key);
    const counts = countsMap.get(key) || {
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      excusedCount: 0,
      lastMarkedDate: null
    };
    const metrics = computeAttendanceMetrics(counts);
    subjectEntries.push({
      subject: enr.subject,
      course: enr.course,
      semester: enr.semester,
      academicYear: enr.academicYear,
      section: enr.section,
      lastMarkedDate: counts.lastMarkedDate || null,
      ...metrics
    });
  }

  // Include historical subjects outside active enrollment if finalized attendance exists for them
  for (const row of aggregatedBySubject) {
    const key = `${row._id.subject}|${row._id.semester}|${row._id.academicYear || ''}`;
    if (seenKeys.has(key)) continue;
    const subDoc = await Subject.findById(row._id.subject).select('code name credits type').lean();
    if (!subDoc) continue;
    const metrics = computeAttendanceMetrics(row);
    subjectEntries.push({
      subject: subDoc,
      course: null,
      semester: { _id: row._id.semester, academicYear: row._id.academicYear },
      academicYear: row._id.academicYear,
      section: 'A',
      lastMarkedDate: row.lastMarkedDate || null,
      ...metrics
    });
  }

  // Overall totals aggregated directly from raw counts (never averaging subject percentages)
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;
  let totalExcused = 0;
  for (const row of aggregatedBySubject) {
    totalPresent += row.presentCount;
    totalAbsent += row.absentCount;
    totalLate += row.lateCount;
    totalExcused += row.excusedCount;
  }

  const overall = computeAttendanceMetrics({
    presentCount: totalPresent,
    lateCount: totalLate,
    excusedCount: totalExcused,
    absentCount: totalAbsent
  });

  subjectEntries.sort((a, b) => (a.subject?.code || '').localeCompare(b.subject?.code || ''));

  return {
    student,
    overall,
    subjects: subjectEntries,
    policy: {
      threshold: getAttendanceThreshold(),
      lateCountsAsAttended: ATTENDANCE_POLICY.lateCountsAsAttended,
      eligibleSessionStatus: ATTENDANCE_POLICY.eligibleSessionStatus,
      timezone: ATTENDANCE_POLICY.timezone
    }
  };
};

/**
 * Builds scoped attendance match filters for Admin and Faculty report endpoints.
 */
const buildReportFilterScope = async (query, user) => {
  const attMatch = {};
  const sessionExtraMatch = {};

  if (user?.role === 'faculty') {
    if (!user.profileId) {
      throw ApiError.forbidden('Faculty profile is not linked to this account');
    }
    const assignments = await FacultyAssignment.find({ faculty: user.profileId })
      .select('subject semester academicYear section')
      .lean();
    if (assignments.length === 0) {
      return { empty: true };
    }
    attMatch.$or = assignments.map((a) => ({
      subject: a.subject,
      semester: a.semester,
      academicYear: a.academicYear
    }));
  } else if (query.faculty) {
    attMatch.faculty = toObjectId(query.faculty);
  }

  if (query.course) attMatch.course = toObjectId(query.course);
  if (query.semester) attMatch.semester = toObjectId(query.semester);
  if (query.subject) attMatch.subject = toObjectId(query.subject);
  if (query.student) attMatch.student = toObjectId(query.student);
  if (query.academicYear) attMatch.academicYear = query.academicYear;

  if (query.department) {
    const courseIds = await Course.find({ department: query.department }).distinct('_id');
    attMatch.course = attMatch.course
      ? { $in: courseIds.filter((c) => String(c) === String(attMatch.course)) }
      : { $in: courseIds };
  }

  const dateRange = buildSessionDateMatch(query.startDate, query.endDate);
  if (dateRange) sessionExtraMatch.sessionDate = dateRange;

  return { empty: false, attMatch, sessionExtraMatch };
};

export const getSubjectWiseReport = async (query = {}, user) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const threshold = getAttendanceThreshold();
  const scope = await buildReportFilterScope(query, user);

  if (scope.empty) {
    return { subjects: [], threshold, ...formatPaginationMeta(page, limit, 0) };
  }

  const rows = await Attendance.aggregate([
    { $match: scope.attMatch },
    ...finalizedSessionLookupStages(scope.sessionExtraMatch),
    {
      $group: {
        _id: {
          subject: '$subject',
          course: '$sessionDoc.course',
          semester: '$semester',
          academicYear: '$sessionDoc.academicYear'
        },
        sessionIds: { $addToSet: '$session' },
        presentCount: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
        absentCount: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
        lateCount: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
        excusedCount: { $sum: { $cond: [{ $eq: ['$status', 'EXCUSED'] }, 1, 0] } }
      }
    }
  ]);

  const subjectIds = rows.map((r) => r._id.subject);
  const courseIds = rows.map((r) => r._id.course).filter(Boolean);
  const [subjectsDocs, coursesDocs] = await Promise.all([
    Subject.find({ _id: { $in: subjectIds } }).select('code name credits type').lean(),
    Course.find({ _id: { $in: courseIds } }).populate('department', 'code name').select('code name department').lean()
  ]);

  const subjectMap = new Map(subjectsDocs.map((s) => [String(s._id), s]));
  const courseMap = new Map(coursesDocs.map((c) => [String(c._id), c]));

  let enriched = rows
    .map((r) => {
      const sub = subjectMap.get(String(r._id.subject));
      const crs = courseMap.get(String(r._id.course));
      const metrics = computeAttendanceMetrics(r);
      return {
        subject: sub || { _id: r._id.subject, code: '—', name: 'Unknown' },
        course: crs || null,
        academicYear: r._id.academicYear,
        conductedSessions: r.sessionIds.length,
        ...metrics
      };
    })
    .filter((item) => {
      if (query.search) {
        const s = query.search.toLowerCase();
        if (
          !(item.subject?.code || '').toLowerCase().includes(s) &&
          !(item.subject?.name || '').toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      if (query.minPercentage !== undefined && (item.percentage === null || item.percentage < query.minPercentage)) {
        return false;
      }
      if (query.maxPercentage !== undefined && (item.percentage === null || item.percentage > query.maxPercentage)) {
        return false;
      }
      if (query.belowThresholdOnly === 'true' && !item.isBelowThreshold) {
        return false;
      }
      return true;
    });

  enriched.sort((a, b) => (a.percentage ?? 999) - (b.percentage ?? 999));

  const totalRecords = enriched.length;
  const paged = enriched.slice(skip, skip + limit);

  return {
    subjects: paged,
    threshold,
    ...formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getStudentWiseReport = async (query = {}, user) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const threshold = getAttendanceThreshold();
  const scope = await buildReportFilterScope(query, user);

  if (scope.empty) {
    return { students: [], threshold, ...formatPaginationMeta(page, limit, 0) };
  }

  const rows = await Attendance.aggregate([
    { $match: scope.attMatch },
    ...finalizedSessionLookupStages(scope.sessionExtraMatch),
    {
      $group: {
        _id: '$student',
        sessionIds: { $addToSet: '$session' },
        presentCount: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
        absentCount: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
        lateCount: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
        excusedCount: { $sum: { $cond: [{ $eq: ['$status', 'EXCUSED'] }, 1, 0] } }
      }
    }
  ]);

  const studentIds = rows.map((r) => r._id);
  const studentFilter = { _id: { $in: studentIds } };
  if (query.search) {
    const safeRegex = new RegExp(escapeRegex(query.search), 'i');
    studentFilter.$or = [
      { rollNumber: safeRegex },
      { enrollmentNumber: safeRegex },
      { firstName: safeRegex },
      { lastName: safeRegex }
    ];
  }

  const studentsDocs = await Student.find(studentFilter)
    .populate('department', 'code name')
    .populate('course', 'code name')
    .lean();
  const studentMap = new Map(studentsDocs.map((s) => [String(s._id), s]));

  let results = rows
    .map((r) => {
      const stu = studentMap.get(String(r._id));
      if (!stu) return null;
      const metrics = computeAttendanceMetrics(r);
      return {
        student: stu,
        conductedSessions: r.sessionIds.length,
        ...metrics
      };
    })
    .filter(Boolean)
    .filter((item) => {
      if (query.belowThresholdOnly === 'true' && !item.isBelowThreshold) return false;
      if (query.minPercentage !== undefined && (item.percentage === null || item.percentage < query.minPercentage)) {
        return false;
      }
      if (query.maxPercentage !== undefined && (item.percentage === null || item.percentage > query.maxPercentage)) {
        return false;
      }
      return true;
    });

  results.sort((a, b) => (a.percentage ?? 999) - (b.percentage ?? 999));

  const totalRecords = results.length;
  const paged = results.slice(skip, skip + limit);

  return {
    students: paged,
    threshold,
    ...formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getFacultyWiseReport = async (query = {}) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const sessionMatch = {};
  if (query.course) sessionMatch.course = toObjectId(query.course);
  if (query.semester) sessionMatch.semester = toObjectId(query.semester);
  if (query.subject) sessionMatch.subject = toObjectId(query.subject);
  if (query.academicYear) sessionMatch.academicYear = query.academicYear;

  const dateRange = buildSessionDateMatch(query.startDate, query.endDate);
  if (dateRange) sessionMatch.sessionDate = dateRange;

  const sessionAgg = await AttendanceSession.aggregate([
    { $match: sessionMatch },
    {
      $group: {
        _id: '$faculty',
        totalSessions: { $sum: 1 },
        finalizedSessions: { $sum: { $cond: [{ $eq: ['$status', 'FINALIZED'] }, 1, 0] } },
        openSessions: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
        cancelledSessions: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } }
      }
    }
  ]);

  const attAgg = await Attendance.aggregate([
    ...finalizedSessionLookupStages(sessionMatch),
    {
      $group: {
        _id: '$sessionDoc.faculty',
        presentCount: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
        absentCount: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
        lateCount: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
        excusedCount: { $sum: { $cond: [{ $eq: ['$status', 'EXCUSED'] }, 1, 0] } }
      }
    }
  ]);

  const attMap = new Map(attAgg.map((a) => [String(a._id), a]));
  const facultyIds = sessionAgg.map((s) => s._id);

  const facFilter = { _id: { $in: facultyIds } };
  if (query.department) facFilter.department = query.department;
  if (query.search) {
    const safeRegex = new RegExp(escapeRegex(query.search), 'i');
    facFilter.$or = [{ employeeId: safeRegex }, { firstName: safeRegex }, { lastName: safeRegex }];
  }

  const facultyDocs = await Faculty.find(facFilter).populate('department', 'code name').lean();
  const facMap = new Map(facultyDocs.map((f) => [String(f._id), f]));

  const merged = sessionAgg
    .map((s) => {
      const fac = facMap.get(String(s._id));
      if (!fac) return null;
      const att = attMap.get(String(s._id)) || {};
      const metrics = computeAttendanceMetrics(att);
      return {
        faculty: fac,
        totalSessionsCreated: s.totalSessions,
        finalizedSessions: s.finalizedSessions,
        openSessions: s.openSessions,
        cancelledSessions: s.cancelledSessions,
        ...metrics
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.finalizedSessions - a.finalizedSessions);

  return {
    faculty: merged.slice(skip, skip + limit),
    ...formatPaginationMeta(page, limit, merged.length)
  };
};

export const getAdminOverviewReport = async (query = {}) => {
  const threshold = getAttendanceThreshold();
  const sessionMatch = {};
  if (query.course) sessionMatch.course = toObjectId(query.course);
  if (query.semester) sessionMatch.semester = toObjectId(query.semester);
  if (query.subject) sessionMatch.subject = toObjectId(query.subject);
  if (query.academicYear) sessionMatch.academicYear = query.academicYear;

  const dateRange = buildSessionDateMatch(query.startDate, query.endDate);
  if (dateRange) sessionMatch.sessionDate = dateRange;

  if (query.department) {
    const courseIds = await Course.find({ department: query.department }).distinct('_id');
    sessionMatch.course = sessionMatch.course
      ? { $in: courseIds.filter((c) => String(c) === String(sessionMatch.course)) }
      : { $in: courseIds };
  }

  const [sessionStats, attStats, dateTrendRaw, deptRaw] = await Promise.all([
    AttendanceSession.aggregate([
      { $match: sessionMatch },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          finalizedSessions: { $sum: { $cond: [{ $eq: ['$status', 'FINALIZED'] }, 1, 0] } },
          openSessions: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
          cancelledSessions: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } }
        }
      }
    ]),
    Attendance.aggregate([
      ...finalizedSessionLookupStages(sessionMatch),
      {
        $group: {
          _id: null,
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
          excusedCount: { $sum: { $cond: [{ $eq: ['$status', 'EXCUSED'] }, 1, 0] } }
        }
      }
    ]),
    Attendance.aggregate([
      ...finalizedSessionLookupStages(sessionMatch),
      {
        $group: {
          _id: '$sessionDoc.sessionDate',
          total: { $sum: 1 },
          attended: {
            $sum: {
              $cond: [{ $in: ['$status', ATTENDANCE_POLICY.countedStatuses] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 14 }
    ]),
    Department.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: 'department',
          as: 'students'
        }
      },
      {
        $project: {
          dept: '$code',
          name: '$name',
          count: {
            $size: {
              $filter: { input: '$students', as: 's', cond: { $eq: ['$$s.status', 'ACTIVE'] } }
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ])
  ]);

  const sess = sessionStats[0] || {
    totalSessions: 0,
    finalizedSessions: 0,
    openSessions: 0,
    cancelledSessions: 0
  };
  const att = attStats[0] || {
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    excusedCount: 0
  };
  const overallMetrics = computeAttendanceMetrics(att);

  const [studentDefaulters, subjectSummary] = await Promise.all([
    getStudentWiseReport({ ...query, belowThresholdOnly: 'true', limit: 100 }, { role: 'admin' }),
    getSubjectWiseReport({ ...query, limit: 100 }, { role: 'admin' })
  ]);

  const lowAttendanceSubjects = subjectSummary.subjects.filter((s) => s.isBelowThreshold);

  const dateTrend = dateTrendRaw.map((d) => ({
    date: d._id,
    rate: d.total > 0 ? Number(((d.attended / d.total) * 100).toFixed(1)) : 0,
    totalMarked: d.total
  }));

  return {
    sessions: sess,
    overall: overallMetrics,
    studentsBelowThresholdCount: studentDefaulters.pagination.totalRecords,
    lowAttendanceSubjectsCount: lowAttendanceSubjects.length,
    lowAttendanceSubjects: lowAttendanceSubjects.slice(0, 5),
    dateTrend,
    departmentStudentDistribution: deptRaw,
    policy: {
      threshold,
      lateCountsAsAttended: ATTENDANCE_POLICY.lateCountsAsAttended,
      eligibleSessionStatus: ATTENDANCE_POLICY.eligibleSessionStatus,
      timezone: ATTENDANCE_POLICY.timezone
    }
  };
};
