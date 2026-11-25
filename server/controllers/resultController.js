import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import * as calcService from '../services/resultCalculationService.js';
import FacultyAssignment from '../models/FacultyAssignment.js';

export const checkReadiness = asyncHandler(async (req, res) => {
  const readiness = await calcService.checkCalculationReadiness(req.query);
  return ApiResponse.success(res, readiness, 'Result calculation readiness evaluated successfully');
});

export const calculateResults = asyncHandler(async (req, res) => {
  const summary = await calcService.calculateResultsBulk(req.body, req.user.userId);
  res.locals.auditEntityId = req.body.examination;
  res.locals.auditDetails = {
    course: req.body.course,
    semester: req.body.semester,
    academicYear: req.body.academicYear,
    calculatedCount: summary.calculatedCount,
    incompleteCount: summary.incompleteCount,
    skippedExistingCount: summary.skippedExistingCount
  };
  return ApiResponse.created(res, summary, `Calculated ${summary.calculatedCount} student result(s)`);
});

export const recalculateResults = asyncHandler(async (req, res) => {
  const summary = await calcService.recalculateResults(req.body, req.user.userId);
  res.locals.auditEntityId = summary.resultIds[0] || null;
  res.locals.auditDetails = {
    recalculatedCount: summary.recalculatedCount,
    reason: req.body.reason
  };
  return ApiResponse.success(res, summary, `Recalculated ${summary.recalculatedCount} result(s)`);
});

export const listResults = asyncHandler(async (req, res) => {
  const result = await calcService.listResults(req.query, req.user);
  return ApiResponse.success(
    res,
    { results: result.results },
    'Results retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getResultById = asyncHandler(async (req, res) => {
  const result = await calcService.getResultById(req.params.id, req.user);
  return ApiResponse.success(res, { result }, 'Result details retrieved successfully');
});

export const getResultHistory = asyncHandler(async (req, res) => {
  const result = await calcService.getResultById(req.params.id, req.user);
  return ApiResponse.success(
    res,
    {
      resultId: result._id,
      currentVersion: result.calculationVersion,
      revisionHistory: result.revisionHistory || []
    },
    'Result revision history retrieved successfully'
  );
});

export const approveResult = asyncHandler(async (req, res) => {
  const result = await calcService.approveResult(req.params.id, req.user.userId);
  res.locals.auditEntityId = result._id;
  res.locals.auditDetails = { calculationStatus: result.calculationStatus };
  return ApiResponse.success(res, { result }, 'Result approved successfully');
});

export const rejectResult = asyncHandler(async (req, res) => {
  const result = await calcService.rejectResult(req.params.id, req.body.reason, req.user.userId);
  res.locals.auditEntityId = result._id;
  res.locals.auditDetails = { calculationStatus: result.calculationStatus, reason: req.body.reason };
  return ApiResponse.success(res, { result }, 'Result rejected cleanly');
});

export const publishResult = asyncHandler(async (req, res) => {
  const result = await calcService.publishResult(req.params.id, req.user.userId);
  res.locals.auditEntityId = result._id;
  res.locals.auditDetails = { publicationStatus: result.publicationStatus };
  return ApiResponse.success(res, { result }, 'Result published to student portal');
});

export const withdrawResult = asyncHandler(async (req, res) => {
  const result = await calcService.withdrawResult(req.params.id, req.body.reason, req.user.userId);
  res.locals.auditEntityId = result._id;
  res.locals.auditDetails = { publicationStatus: result.publicationStatus, reason: req.body.reason };
  return ApiResponse.success(res, { result }, 'Published result withdrawn safely');
});

export const batchApproveResults = asyncHandler(async (req, res) => {
  const summary = await calcService.batchApproveOrPublish(req.body.resultIds, 'APPROVE', req.user.userId);
  res.locals.auditDetails = { action: 'BATCH_APPROVE', processedCount: summary.processedCount };
  return ApiResponse.success(res, summary, `Approved ${summary.processedCount} result(s)`);
});

export const batchPublishResults = asyncHandler(async (req, res) => {
  const summary = await calcService.batchApproveOrPublish(req.body.resultIds, 'PUBLISH', req.user.userId);
  res.locals.auditDetails = { action: 'BATCH_PUBLISH', processedCount: summary.processedCount };
  return ApiResponse.success(res, summary, `Published ${summary.processedCount} result(s)`);
});

export const correctResult = asyncHandler(async (req, res) => {
  const { result, auditDetails } = await calcService.correctResult(req.params.id, req.body, req.user.userId);
  res.locals.auditEntityId = result._id;
  res.locals.auditDetails = auditDetails;
  return ApiResponse.success(res, { result }, 'Result corrected with versioned revision history');
});

// === STUDENT SELF-SCOPED ===
export const getMyResults = asyncHandler(async (req, res) => {
  const data = await calcService.getStudentMyResults(req.user, req.query);
  return ApiResponse.success(res, data, 'Published student results retrieved successfully');
});

export const getMySemesterSummary = asyncHandler(async (req, res) => {
  const data = await calcService.getStudentMyResults(req.user, req.query);
  return ApiResponse.success(
    res,
    {
      student: data.student,
      semesterSummaries: data.semesterSummaries,
      cgpa: data.cgpa,
      cgpaNote: data.cgpaNote
    },
    'Semester result summary retrieved successfully'
  );
});

export const getMySubjectSummary = asyncHandler(async (req, res) => {
  const data = await calcService.getStudentMyResults(req.user, req.query);
  return ApiResponse.success(
    res,
    { results: data.results },
    'Subject-wise published results retrieved successfully'
  );
});

export const getStudentResults = asyncHandler(async (req, res) => {
  const targetId = req.params.studentId || req.user.profileId;
  if (req.user.role === 'student' && String(req.user.profileId) !== String(targetId)) {
    throw ApiError.forbidden('Forbidden: cannot inspect another student results');
  }
  const data = await calcService.getStudentMyResults({ role: 'student', profileId: targetId }, req.query);
  return ApiResponse.success(res, data, 'Student results retrieved successfully');
});

// === FACULTY SCOPED ===
export const getFacultyAssignedSubjects = asyncHandler(async (req, res) => {
  const assignments = await FacultyAssignment.find({ faculty: req.user.profileId, status: 'ACTIVE' })
    .populate('course', 'code name')
    .populate('semester', 'semesterNumber academicYear')
    .populate('subject', 'code name credits type')
    .lean();
  return ApiResponse.success(res, { assignments }, 'Assigned faculty subjects retrieved successfully');
});

export const getFacultyResultsOverview = asyncHandler(async (req, res) => {
  const data = await calcService.listResults({ ...req.query, limit: 100 }, req.user);
  return ApiResponse.success(res, { results: data.results }, 'Faculty subject results retrieved successfully');
});

// === ADMIN REPORTS ===
export const getReportsOverview = asyncHandler(async (req, res) => {
  const report = await calcService.getResultReportsOverview(req.query);
  return ApiResponse.success(res, report, 'Result reports overview retrieved successfully');
});
