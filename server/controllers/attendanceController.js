import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import * as attendanceService from '../services/attendanceService.js';
import * as calculationService from '../services/attendanceCalculationService.js';

// === ATTENDANCE SESSIONS ===
export const listSessions = asyncHandler(async (req, res) => {
  const result = await attendanceService.listSessions(req.query, req.user);
  return ApiResponse.success(
    res,
    { sessions: result.sessions },
    'Attendance sessions retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getSessionById = asyncHandler(async (req, res) => {
  const result = await attendanceService.getSessionById(req.params.id, req.user);
  return ApiResponse.success(res, result, 'Attendance session details retrieved successfully');
});

export const createSession = asyncHandler(async (req, res) => {
  const result = await attendanceService.createSession(req.body, req.user);
  res.locals.auditEntityId = result.session._id;
  res.locals.auditDetails = {
    subject: result.session.subject?._id || result.session.subject,
    sessionDate: result.session.sessionDate,
    sessionNumber: result.session.sessionNumber,
    section: result.session.section
  };
  return ApiResponse.created(res, result, 'Attendance session created successfully');
});

export const updateSession = asyncHandler(async (req, res) => {
  const result = await attendanceService.updateSession(req.params.id, req.body, req.user);
  res.locals.auditEntityId = result.session._id;
  res.locals.auditDetails = { updatedFields: Object.keys(req.body || {}) };
  return ApiResponse.success(res, result, 'Attendance session updated successfully');
});

export const updateSessionStatus = asyncHandler(async (req, res) => {
  const result = await attendanceService.updateSessionStatus(req.params.id, req.body, req.user);
  res.locals.auditEntityId = result.session._id;
  res.locals.auditDetails = {
    previousStatus: result.previousStatus,
    newStatus: result.session.status,
    reason: req.body.reason || ''
  };
  return ApiResponse.success(res, result, `Attendance session transitioned to ${result.session.status}`);
});

// === FACULTY PERSONAL ENDPOINTS ===
export const getMySubjects = asyncHandler(async (req, res) => {
  const subjects = await attendanceService.getMyAuthorizedSubjects(req.user);
  return ApiResponse.success(res, { subjects }, 'Authorized faculty subjects retrieved successfully');
});

export const listMySessions = asyncHandler(async (req, res) => {
  const result = await attendanceService.listSessions(req.query, req.user);
  return ApiResponse.success(
    res,
    { sessions: result.sessions },
    'Faculty attendance sessions retrieved successfully',
    { pagination: result.pagination }
  );
});

export const listMyHistory = asyncHandler(async (req, res) => {
  const result = await attendanceService.listAttendanceHistory(req.query, req.user);
  return ApiResponse.success(
    res,
    { records: result.records },
    'Faculty attendance history retrieved successfully',
    { pagination: result.pagination }
  );
});

// === BULK MARKING, HISTORY & CORRECTION ===
export const submitBulkAttendance = asyncHandler(async (req, res) => {
  const result = await attendanceService.submitBulkAttendance(req.body, req.user);
  res.locals.auditEntityId = result.sessionId;
  res.locals.auditDetails = {
    submittedCount: result.submittedCount,
    presentCount: result.presentCount,
    absentCount: result.absentCount,
    lateCount: result.lateCount,
    sessionStatus: result.sessionStatus
  };
  return ApiResponse.created(res, result, 'Bulk attendance submitted successfully');
});

export const listAttendance = asyncHandler(async (req, res) => {
  const result = await attendanceService.listAttendanceHistory(req.query, req.user);
  return ApiResponse.success(
    res,
    { records: result.records },
    'Attendance records retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getAttendanceById = asyncHandler(async (req, res) => {
  const record = await attendanceService.getAttendanceRecordById(req.params.id, req.user);
  return ApiResponse.success(res, { record }, 'Attendance record retrieved successfully');
});

export const correctAttendance = asyncHandler(async (req, res) => {
  const { record, auditDetails } = await attendanceService.correctAttendanceRecord(
    req.params.id,
    req.body,
    req.user
  );
  res.locals.auditEntityId = record._id;
  res.locals.auditDetails = auditDetails;
  return ApiResponse.success(res, { record }, 'Attendance record corrected and logged cleanly');
});

// === STUDENT PERSONAL & SUMMARY ENDPOINTS ===
export const getMyAttendance = asyncHandler(async (req, res) => {
  const result = await attendanceService.listAttendanceHistory(req.query, req.user);
  return ApiResponse.success(
    res,
    { records: result.records },
    'Personal attendance history retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getMySummary = asyncHandler(async (req, res) => {
  const summary = await calculationService.getStudentAttendanceSummary(req.user.profileId, req.query);
  return ApiResponse.success(res, summary, 'Student attendance summary retrieved successfully');
});

export const getMySubjectsAttendance = asyncHandler(async (req, res) => {
  const summary = await calculationService.getStudentAttendanceSummary(req.user.profileId, req.query);
  return ApiResponse.success(
    res,
    { subjects: summary.subjects, overall: summary.overall, policy: summary.policy },
    'Student subject-wise attendance retrieved successfully'
  );
});

export const getStudentAttendanceSummary = asyncHandler(async (req, res) => {
  const targetStudentId = req.params.studentId || req.user.profileId;
  if (req.user.role === 'student' && String(req.user.profileId) !== String(targetStudentId)) {
    return ApiResponse.error(res, 'Forbidden: cannot access another student attendance summary', [], 403);
  }
  const summary = await calculationService.getStudentAttendanceSummary(targetStudentId, req.query);
  return ApiResponse.success(res, summary, 'Student attendance summary retrieved successfully');
});

// === ADMIN & FACULTY REPORTS ===
export const getOverviewReport = asyncHandler(async (req, res) => {
  const overview = await calculationService.getAdminOverviewReport(req.query);
  return ApiResponse.success(res, overview, 'Institutional attendance overview retrieved successfully');
});

export const getSubjectsReport = asyncHandler(async (req, res) => {
  const report = await calculationService.getSubjectWiseReport(req.query, req.user);
  return ApiResponse.success(
    res,
    { subjects: report.subjects, threshold: report.threshold },
    'Subject-wise attendance report retrieved successfully',
    { pagination: report.pagination }
  );
});

export const getStudentsReport = asyncHandler(async (req, res) => {
  const report = await calculationService.getStudentWiseReport(req.query, req.user);
  return ApiResponse.success(
    res,
    { students: report.students, threshold: report.threshold },
    'Student-wise attendance report retrieved successfully',
    { pagination: report.pagination }
  );
});

export const getFacultyReport = asyncHandler(async (req, res) => {
  const report = await calculationService.getFacultyWiseReport(req.query);
  return ApiResponse.success(
    res,
    { faculty: report.faculty },
    'Faculty attendance report retrieved successfully',
    { pagination: report.pagination }
  );
});
