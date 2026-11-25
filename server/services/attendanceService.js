import Attendance from '../models/Attendance.js';
import AttendanceSession from '../models/AttendanceSession.js';
import Enrollment from '../models/Enrollment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import ApiError from '../utils/ApiError.js';
import {
  normalizeAcademicDate,
  isFutureAcademicDate
} from '../utils/attendancePolicy.js';
import {
  escapeRegex,
  buildPagination,
  formatPaginationMeta,
  buildSortSpec
} from '../utils/queryHelpers.js';

const SESSION_SORT_MAP = {
  sessionDate: 'sessionDate',
  dateObj: 'dateObj',
  sessionNumber: 'sessionNumber',
  status: 'status',
  createdAt: 'createdAt'
};

const ATTENDANCE_SORT_MAP = {
  date: 'date',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

const populateSessionQuery = (query) =>
  query
    .populate({
      path: 'faculty',
      select: 'employeeId firstName lastName designation status department',
      populate: { path: 'department', select: 'code name' }
    })
    .populate({
      path: 'course',
      select: 'code name department',
      populate: { path: 'department', select: 'code name' }
    })
    .populate('semester', 'semesterNumber academicYear status')
    .populate('subject', 'code name credits type')
    .populate('facultyAssignment', 'section academicYear status');

const populateAttendanceQuery = (query) =>
  query
    .populate({
      path: 'student',
      select: 'rollNumber enrollmentNumber firstName lastName status department'
    })
    .populate('course', 'code name')
    .populate('semester', 'semesterNumber academicYear')
    .populate('subject', 'code name credits type')
    .populate('markedBy', 'employeeId firstName lastName')
    .populate('updatedBy', 'name email')
    .populate('session', 'sessionDate sessionNumber startTime endTime topic status section academicYear');

/**
 * Returns active teaching assignments for the authenticated faculty with live enrolled student counts.
 */
export const getMyAuthorizedSubjects = async (user) => {
  if (user.role !== 'faculty') {
    throw ApiError.forbidden('Only faculty members can retrieve personal teaching subjects here');
  }
  if (!user.profileId) {
    throw ApiError.notFound('Faculty profile not linked to your user account');
  }

  const assignments = await FacultyAssignment.find({
    faculty: user.profileId,
    status: 'ACTIVE'
  })
    .populate({
      path: 'course',
      select: 'code name department',
      populate: { path: 'department', select: 'code name' }
    })
    .populate('semester', 'semesterNumber academicYear status')
    .populate('subject', 'code name credits type isActive')
    .sort({ createdAt: -1 })
    .lean();

  if (assignments.length === 0) return [];

  const matchOr = assignments.map((a) => ({
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

  return assignments.map((a) => {
    const key = `${a.subject?._id || a.subject}|${a.semester?._id || a.semester}|${a.academicYear}|${a.section || 'A'}`;
    return {
      ...a,
      enrolledStudentCount: countMap.get(key) || 0
    };
  });
};

/**
 * Resolves eligible active students for a class session from authoritative Enrollment records.
 */
const fetchEligibleStudentsForSession = async (session) => {
  const enrollments = await Enrollment.find({
    subject: session.subject?._id || session.subject,
    semester: session.semester?._id || session.semester,
    course: session.course?._id || session.course,
    academicYear: session.academicYear,
    section: session.section || 'A',
    status: 'ACTIVE'
  })
    .populate({
      path: 'student',
      select: 'rollNumber enrollmentNumber firstName lastName status department user',
      populate: { path: 'user', select: 'isActive email' }
    })
    .lean();

  return enrollments
    .map((e) => e.student)
    .filter((s) => s && s.status === 'ACTIVE' && s.user?.isActive !== false)
    .sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
};

export const createSession = async (payload, user) => {
  const assignment = await FacultyAssignment.findById(payload.facultyAssignment);
  if (!assignment) {
    throw ApiError.notFound('Selected faculty assignment not found');
  }
  if (assignment.status !== 'ACTIVE') {
    throw ApiError.badRequest(`Faculty assignment is not active (status: ${assignment.status})`);
  }

  if (user.role === 'faculty' && String(assignment.faculty) !== String(user.profileId)) {
    throw ApiError.forbidden('You can only create attendance sessions for your own active assignments');
  }

  const [faculty, course, semester, subject] = await Promise.all([
    Faculty.findById(assignment.faculty).populate('user', 'isActive'),
    Course.findById(assignment.course).populate('department', 'isActive'),
    Semester.findById(assignment.semester),
    Subject.findById(assignment.subject)
  ]);

  if (!faculty || faculty.status !== 'ACTIVE' || faculty.user?.isActive === false) {
    throw ApiError.badRequest('Assigned faculty member is not active');
  }
  if (!course || course.isActive === false || course.department?.isActive === false) {
    throw ApiError.badRequest('Linked course or department is inactive');
  }
  if (!semester || semester.isActive === false) {
    throw ApiError.badRequest('Linked semester is inactive');
  }
  if (String(semester.course) !== String(course._id) || semester.academicYear !== assignment.academicYear) {
    throw ApiError.badRequest('Assignment semester/course/academicYear relationship is invalid');
  }
  if (!subject || subject.isActive === false) {
    throw ApiError.badRequest('Linked subject is inactive');
  }
  if (String(subject.course) !== String(course._id) || String(subject.semester) !== String(semester._id)) {
    throw ApiError.badRequest('Subject does not belong to the assignment course and semester');
  }

  let normalized;
  try {
    normalized = normalizeAcademicDate(payload.sessionDate);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }

  if (isFutureAcademicDate(normalized.sessionDate)) {
    throw ApiError.badRequest('Cannot create an attendance session for a future calendar date');
  }

  const duplicate = await AttendanceSession.findOne({
    subject: subject._id,
    semester: semester._id,
    section: assignment.section || 'A',
    academicYear: assignment.academicYear,
    sessionDate: normalized.sessionDate,
    sessionNumber: payload.sessionNumber || 1
  }).lean();

  if (duplicate) {
    throw ApiError.conflict(
      `Attendance session #${payload.sessionNumber || 1} already exists for ${subject.code} on ${normalized.sessionDate}`
    );
  }

  let created;
  try {
    created = await AttendanceSession.create({
      facultyAssignment: assignment._id,
      faculty: faculty._id,
      course: course._id,
      semester: semester._id,
      subject: subject._id,
      section: assignment.section || 'A',
      academicYear: assignment.academicYear,
      sessionDate: normalized.sessionDate,
      dateObj: normalized.dateObj,
      sessionNumber: payload.sessionNumber || 1,
      startTime: payload.startTime || '',
      endTime: payload.endTime || '',
      topic: payload.topic || '',
      status: 'OPEN',
      createdBy: user.userId,
      updatedBy: user.userId
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw ApiError.conflict('Duplicate attendance session for this date and session number');
    }
    throw err;
  }

  return getSessionById(created._id, user);
};

export const listSessions = async (query = {}, user) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const sortSpec = buildSortSpec(query.sortBy, query.sortOrder, SESSION_SORT_MAP, {
    sessionDate: -1,
    sessionNumber: -1
  });
  const andConditions = [];

  if (user.role === 'faculty') {
    if (!user.profileId) throw ApiError.forbidden('Faculty profile is not linked to this account');
    if (query.faculty && String(query.faculty) !== String(user.profileId)) {
      throw ApiError.forbidden('Faculty cannot inspect another faculty member attendance sessions');
    }
    andConditions.push({ faculty: user.profileId });
  } else if (query.faculty) {
    andConditions.push({ faculty: query.faculty });
  }

  if (query.facultyAssignment) andConditions.push({ facultyAssignment: query.facultyAssignment });
  if (query.course) andConditions.push({ course: query.course });
  if (query.semester) andConditions.push({ semester: query.semester });
  if (query.subject) andConditions.push({ subject: query.subject });
  if (query.academicYear) andConditions.push({ academicYear: query.academicYear });
  if (query.section) andConditions.push({ section: String(query.section).toUpperCase() });
  if (query.status) andConditions.push({ status: String(query.status).toUpperCase() });
  if (query.sessionDate) andConditions.push({ sessionDate: query.sessionDate });

  if (query.startDate || query.endDate) {
    const range = {};
    if (query.startDate) range.$gte = query.startDate;
    if (query.endDate) range.$lte = query.endDate;
    andConditions.push({ sessionDate: range });
  }

  if (query.department) {
    const courseIds = await Course.find({ department: query.department }).distinct('_id');
    andConditions.push({ course: { $in: courseIds } });
  }

  if (query.search) {
    const safeRegex = new RegExp(escapeRegex(query.search), 'i');
    const [matchingSubjects, matchingCourses, matchingFaculty] = await Promise.all([
      Subject.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id'),
      Course.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id'),
      Faculty.find({
        $or: [{ employeeId: safeRegex }, { firstName: safeRegex }, { lastName: safeRegex }]
      }).distinct('_id')
    ]);
    andConditions.push({
      $or: [
        { subject: { $in: matchingSubjects } },
        { course: { $in: matchingCourses } },
        { faculty: { $in: matchingFaculty } },
        { topic: safeRegex },
        { sessionDate: safeRegex }
      ]
    });
  }

  const filter = andConditions.length > 0 ? { $and: andConditions } : {};

  const [sessionsRaw, totalRecords] = await Promise.all([
    populateSessionQuery(AttendanceSession.find(filter).sort(sortSpec).skip(skip).limit(limit)).lean(),
    AttendanceSession.countDocuments(filter)
  ]);

  let sessions = sessionsRaw;
  if (sessionsRaw.length > 0) {
    const sessionIds = sessionsRaw.map((s) => s._id);
    const enrollMatchOr = sessionsRaw.map((s) => ({
      subject: s.subject?._id || s.subject,
      semester: s.semester?._id || s.semester,
      academicYear: s.academicYear,
      section: s.section || 'A',
      status: 'ACTIVE'
    }));

    const [attCounts, enrollCounts] = await Promise.all([
      Attendance.aggregate([
        { $match: { session: { $in: sessionIds } } },
        {
          $group: {
            _id: '$session',
            markedCount: { $sum: 1 },
            presentCount: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
            absentCount: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
            lateCount: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } }
          }
        }
      ]),
      Enrollment.aggregate([
        { $match: { $or: enrollMatchOr } },
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
      ])
    ]);

    const attMap = new Map(attCounts.map((c) => [String(c._id), c]));
    const enrMap = new Map(
      enrollCounts.map((c) => [
        `${c._id.subject}|${c._id.semester}|${c._id.academicYear}|${c._id.section}`,
        c.count
      ])
    );

    sessions = sessionsRaw.map((s) => {
      const att = attMap.get(String(s._id)) || {
        markedCount: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0
      };
      const enrKey = `${s.subject?._id || s.subject}|${s.semester?._id || s.semester}|${s.academicYear}|${s.section || 'A'}`;
      return {
        ...s,
        enrolledCount: enrMap.get(enrKey) || 0,
        markedCount: att.markedCount,
        presentCount: att.presentCount,
        absentCount: att.absentCount,
        lateCount: att.lateCount
      };
    });
  }

  return {
    sessions,
    ...formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getSessionById = async (id, user) => {
  const session = await populateSessionQuery(AttendanceSession.findById(id)).lean();
  if (!session) {
    throw ApiError.notFound('Attendance session not found');
  }

  if (user.role === 'faculty' && String(session.faculty?._id || session.faculty) !== String(user.profileId)) {
    throw ApiError.forbidden('You do not have permission to access another faculty member session');
  }

  const [eligibleStudents, existingRecords] = await Promise.all([
    fetchEligibleStudentsForSession(session),
    Attendance.find({ session: session._id })
      .select('_id student status remarks updatedAt lastCorrectionReason')
      .lean()
  ]);

  const recordMap = new Map(existingRecords.map((r) => [String(r.student), r]));

  const roster = eligibleStudents.map((stu) => {
    const rec = recordMap.get(String(stu._id));
    return {
      studentId: stu._id,
      rollNumber: stu.rollNumber,
      enrollmentNumber: stu.enrollmentNumber,
      firstName: stu.firstName,
      lastName: stu.lastName,
      fullName: `${stu.firstName} ${stu.lastName}`.trim(),
      attendanceId: rec?._id || null,
      status: rec?.status || null,
      remarks: rec?.remarks || ''
    };
  });

  return {
    session,
    eligibleCount: roster.length,
    markedCount: existingRecords.length,
    isSubmitted: existingRecords.length > 0,
    roster
  };
};

export const updateSession = async (id, payload, user) => {
  const session = await AttendanceSession.findById(id);
  if (!session) throw ApiError.notFound('Attendance session not found');

  if (user.role === 'faculty' && String(session.faculty) !== String(user.profileId)) {
    throw ApiError.forbidden('You cannot modify another faculty member attendance session');
  }
  if (session.status !== 'OPEN') {
    throw ApiError.badRequest(`Only OPEN attendance sessions can be edited (current status: ${session.status})`);
  }

  if (payload.startTime !== undefined) session.startTime = payload.startTime;
  if (payload.endTime !== undefined) session.endTime = payload.endTime;
  if (payload.topic !== undefined) session.topic = payload.topic;
  session.updatedBy = user.userId;

  await session.save();
  return getSessionById(session._id, user);
};

export const updateSessionStatus = async (id, payload, user) => {
  const session = await AttendanceSession.findById(id);
  if (!session) throw ApiError.notFound('Attendance session not found');

  if (user.role === 'faculty' && String(session.faculty) !== String(user.profileId)) {
    throw ApiError.forbidden('You cannot change status of another faculty member attendance session');
  }

  const targetStatus = payload.status;
  if (session.status === targetStatus) {
    return { ...(await getSessionById(session._id, user)), previousStatus: session.status };
  }

  if (session.status === 'CANCELLED') {
    throw ApiError.badRequest('Cancelled sessions cannot be reopened or transitioned to another status');
  }

  const previousStatus = session.status;

  if (previousStatus === 'OPEN' && targetStatus === 'FINALIZED') {
    const markedCount = await Attendance.countDocuments({ session: session._id });
    if (markedCount === 0) {
      throw ApiError.badRequest('Mark attendance for at least one student before finalizing this session');
    }
    session.status = 'FINALIZED';
    session.finalizedAt = new Date();
    session.finalizedBy = user.userId;
  } else if (previousStatus === 'OPEN' && targetStatus === 'CANCELLED') {
    session.status = 'CANCELLED';
    session.cancelledAt = new Date();
    session.cancelledBy = user.userId;
  } else if (previousStatus === 'FINALIZED' && targetStatus === 'OPEN') {
    if (!payload.reason || payload.reason.trim().length < 3) {
      throw ApiError.badRequest('Reopening a finalized session requires an explicit reason (min 3 characters)');
    }
    session.status = 'OPEN';
    session.reopenedAt = new Date();
    session.reopenReason = payload.reason.trim();
  } else if (previousStatus === 'FINALIZED' && targetStatus === 'CANCELLED') {
    if (user.role !== 'admin') {
      throw ApiError.forbidden('Only administrators may cancel an already finalized session');
    }
    if (!payload.reason || payload.reason.trim().length < 3) {
      throw ApiError.badRequest('Cancelling a finalized session requires an explicit reason');
    }
    session.status = 'CANCELLED';
    session.cancelledAt = new Date();
    session.cancelledBy = user.userId;
    session.reopenReason = payload.reason.trim();
  } else {
    throw ApiError.badRequest(`Invalid session status transition from ${previousStatus} to ${targetStatus}`);
  }

  session.updatedBy = user.userId;
  await session.save();

  const updated = await getSessionById(session._id, user);
  return { ...updated, previousStatus };
};

/**
 * Bulk Attendance Submission — validates session, active faculty assignment, authoritative eligible enrollments,
 * rejects duplicate student IDs or already-submitted sessions cleanly, and inserts atomically.
 */
export const submitBulkAttendance = async (payload, user) => {
  const session = await AttendanceSession.findById(payload.sessionId);
  if (!session) {
    throw ApiError.notFound('Target attendance session not found');
  }

  if (user.role === 'faculty' && String(session.faculty) !== String(user.profileId)) {
    throw ApiError.forbidden('You are not authorized to submit attendance for this session');
  }

  if (session.status === 'CANCELLED') {
    throw ApiError.badRequest('Cannot submit attendance for a cancelled session');
  }
  if (session.status === 'FINALIZED') {
    throw ApiError.conflict('Session attendance is already finalized. Reopen the session or submit a correction.');
  }

  const assignment = await FacultyAssignment.findById(session.facultyAssignment).lean();
  if (!assignment || assignment.status !== 'ACTIVE') {
    throw ApiError.forbidden('Linked faculty teaching assignment is no longer active');
  }

  // Prevent duplicate submission for this session
  const existingForSession = await Attendance.countDocuments({ session: session._id });
  if (existingForSession > 0) {
    throw ApiError.conflict(
      'Attendance has already been submitted for this session. Use attendance correction to modify individual records.'
    );
  }

  // Detect duplicate studentId entries inside payload
  const seenStudentIds = new Set();
  const duplicateIds = [];
  for (const r of payload.records) {
    const sid = String(r.studentId);
    if (seenStudentIds.has(sid)) {
      duplicateIds.push(sid);
    }
    seenStudentIds.add(sid);
  }
  if (duplicateIds.length > 0) {
    throw ApiError.badRequest(`Duplicate student entries detected in payload: ${duplicateIds.join(', ')}`);
  }

  // Authoritative eligible enrollment check from DB
  const eligibleStudents = await fetchEligibleStudentsForSession(session);
  const eligibleIds = new Set(eligibleStudents.map((s) => String(s._id)));

  const ineligibleIds = [];
  for (const sid of seenStudentIds) {
    if (!eligibleIds.has(sid)) {
      ineligibleIds.push(sid);
    }
  }
  if (ineligibleIds.length > 0) {
    throw ApiError.badRequest(
      `Rejected un-enrolled, inactive, or out-of-scope student ID(s): ${ineligibleIds.join(', ')}`
    );
  }

  const docsToInsert = payload.records.map((r) => ({
    session: session._id,
    student: r.studentId,
    course: session.course,
    subject: session.subject,
    semester: session.semester,
    section: session.section || 'A',
    academicYear: session.academicYear,
    faculty: session.faculty,
    markedBy: session.faculty,
    updatedBy: user.userId,
    date: session.dateObj,
    status: String(r.status).toUpperCase(),
    remarks: r.remarks || ''
  }));

  try {
    await Attendance.insertMany(docsToInsert, { ordered: true });
  } catch (err) {
    if (err?.code === 11000) {
      throw ApiError.conflict('Duplicate attendance detected for this session');
    }
    throw err;
  }

  if (payload.finalize) {
    session.status = 'FINALIZED';
    session.finalizedAt = new Date();
    session.finalizedBy = user.userId;
    session.updatedBy = user.userId;
    await session.save();
  }

  const presentCount = docsToInsert.filter((d) => d.status === 'PRESENT').length;
  const absentCount = docsToInsert.filter((d) => d.status === 'ABSENT').length;
  const lateCount = docsToInsert.filter((d) => d.status === 'LATE').length;

  return {
    sessionId: String(session._id),
    sessionStatus: session.status,
    submittedCount: docsToInsert.length,
    presentCount,
    absentCount,
    lateCount
  };
};

export const listAttendanceHistory = async (query = {}, user) => {
  const { page, limit, skip } = buildPagination(query.page, query.limit, 100);
  const sortSpec = buildSortSpec(query.sortBy, query.sortOrder, ATTENDANCE_SORT_MAP, { date: -1, createdAt: -1 });
  const andConditions = [];

  if (user.role === 'student') {
    if (!user.profileId) throw ApiError.forbidden('Student profile is not linked to this account');
    if (query.student && String(query.student) !== String(user.profileId)) {
      throw ApiError.forbidden('Students cannot inspect another student attendance history');
    }
    andConditions.push({ student: user.profileId });
  } else if (user.role === 'faculty') {
    if (!user.profileId) throw ApiError.forbidden('Faculty profile is not linked to this account');
    if (query.faculty && String(query.faculty) !== String(user.profileId)) {
      throw ApiError.forbidden('Faculty cannot inspect another faculty member attendance records');
    }
    const assignments = await FacultyAssignment.find({ faculty: user.profileId })
      .select('subject semester academicYear')
      .lean();
    if (assignments.length === 0) {
      return { records: [], ...formatPaginationMeta(page, limit, 0) };
    }
    andConditions.push({
      $or: [
        { faculty: user.profileId },
        { markedBy: user.profileId },
        ...assignments.map((a) => ({
          subject: a.subject,
          semester: a.semester,
          academicYear: a.academicYear
        }))
      ]
    });
    if (query.student) andConditions.push({ student: query.student });
  } else {
    if (query.student) andConditions.push({ student: query.student });
    if (query.faculty) andConditions.push({ $or: [{ faculty: query.faculty }, { markedBy: query.faculty }] });
  }

  if (query.sessionId) andConditions.push({ session: query.sessionId });
  if (query.course) andConditions.push({ course: query.course });
  if (query.semester) andConditions.push({ semester: query.semester });
  if (query.subject) andConditions.push({ subject: query.subject });
  if (query.academicYear) andConditions.push({ academicYear: query.academicYear });
  if (query.status) andConditions.push({ status: String(query.status).toUpperCase() });

  if (query.enrollmentNumber) {
    const safeRegex = new RegExp(escapeRegex(query.enrollmentNumber), 'i');
    const stuIds = await Student.find({ enrollmentNumber: safeRegex }).distinct('_id');
    andConditions.push({ student: { $in: stuIds } });
  }

  if (query.department) {
    const courseIds = await Course.find({ department: query.department }).distinct('_id');
    andConditions.push({ course: { $in: courseIds } });
  }

  if (query.startDate || query.endDate) {
    const range = {};
    if (query.startDate) range.$gte = normalizeAcademicDate(query.startDate).dateObj;
    if (query.endDate) range.$lte = normalizeAcademicDate(query.endDate).dateObj;
    andConditions.push({ date: range });
  }

  if (query.search) {
    const safeRegex = new RegExp(escapeRegex(query.search), 'i');
    const [stuIds, subIds] = await Promise.all([
      Student.find({
        $or: [
          { rollNumber: safeRegex },
          { enrollmentNumber: safeRegex },
          { firstName: safeRegex },
          { lastName: safeRegex }
        ]
      }).distinct('_id'),
      Subject.find({ $or: [{ code: safeRegex }, { name: safeRegex }] }).distinct('_id')
    ]);
    andConditions.push({
      $or: [
        { student: { $in: stuIds } },
        { subject: { $in: subIds } },
        { remarks: safeRegex }
      ]
    });
  }

  const filter = andConditions.length > 0 ? { $and: andConditions } : {};

  const [records, totalRecords] = await Promise.all([
    populateAttendanceQuery(Attendance.find(filter).sort(sortSpec).skip(skip).limit(limit)).lean(),
    Attendance.countDocuments(filter)
  ]);

  return {
    records,
    ...formatPaginationMeta(page, limit, totalRecords)
  };
};

export const getAttendanceRecordById = async (id, user) => {
  const record = await populateAttendanceQuery(Attendance.findById(id)).lean();
  if (!record) throw ApiError.notFound('Attendance record not found');

  if (user.role === 'student' && String(record.student?._id || record.student) !== String(user.profileId)) {
    throw ApiError.forbidden('You do not have permission to view another student attendance record');
  }

  if (user.role === 'faculty') {
    const ownsRecord = String(record.faculty || record.markedBy?._id || record.markedBy) === String(user.profileId);
    if (!ownsRecord) {
      throw ApiError.forbidden('You do not have permission to view attendance for an unrelated assignment');
    }
  }

  return record;
};

export const correctAttendanceRecord = async (id, payload, user) => {
  if (user.role === 'student') {
    throw ApiError.forbidden('Students are not permitted to modify attendance records');
  }

  const existing = await Attendance.findById(id);
  if (!existing) throw ApiError.notFound('Attendance record not found');

  if (user.role === 'faculty') {
    const ownsRecord = String(existing.faculty || existing.markedBy) === String(user.profileId);
    if (!ownsRecord) {
      throw ApiError.forbidden('You cannot correct attendance belonging to another faculty member');
    }
  }

  if (existing.session) {
    const sessionDoc = await AttendanceSession.findById(existing.session).lean();
    if (sessionDoc) {
      if (sessionDoc.status === 'CANCELLED') {
        throw ApiError.badRequest('Cannot modify attendance belonging to a cancelled session');
      }
      if (sessionDoc.status === 'FINALIZED' && user.role === 'faculty') {
        throw ApiError.conflict(
          'Session is finalized and locked. Reopen the session with an audit reason before modifying attendance records.'
        );
      }
    }
  }

  const previousStatus = existing.status;
  const previousRemarks = existing.remarks || '';
  const nextStatus = String(payload.status).toUpperCase();

  existing.status = nextStatus;
  if (payload.remarks !== undefined) existing.remarks = payload.remarks;
  existing.lastCorrectionReason = payload.reason.trim();
  existing.updatedBy = user.userId;

  await existing.save();

  const updated = await populateAttendanceQuery(Attendance.findById(existing._id)).lean();

  return {
    record: updated,
    auditDetails: {
      previousStatus,
      newStatus: nextStatus,
      previousRemarks,
      newRemarks: existing.remarks || '',
      reason: payload.reason.trim(),
      sessionId: existing.session ? String(existing.session) : null,
      studentId: String(existing.student)
    }
  };
};
