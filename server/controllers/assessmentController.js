import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import * as assessmentService from '../services/assessmentService.js';

// === INTERNAL ASSESSMENT COMPONENTS ===
export const listAssessments = asyncHandler(async (req, res) => {
  const result = await assessmentService.listAssessments(req.query, req.user);
  return ApiResponse.success(
    res,
    { assessments: result.assessments },
    'Internal assessments retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getAssessmentWithRoster = asyncHandler(async (req, res) => {
  const result = await assessmentService.getAssessmentWithRoster(req.params.id, req.user);
  return ApiResponse.success(res, result, 'Assessment details & student roster retrieved successfully');
});

export const createAssessment = asyncHandler(async (req, res) => {
  const assessment = await assessmentService.createAssessment(req.body, req.user.userId);
  res.locals.auditEntityId = assessment._id;
  res.locals.auditDetails = {
    name: assessment.name,
    componentType: assessment.componentType,
    subject: assessment.subject?._id || assessment.subject,
    maxMarks: assessment.maxMarks
  };
  return ApiResponse.created(res, { assessment }, 'Internal assessment component configured successfully');
});

export const updateAssessment = asyncHandler(async (req, res) => {
  const assessment = await assessmentService.updateAssessment(req.params.id, req.body, req.user.userId);
  res.locals.auditEntityId = assessment._id;
  res.locals.auditDetails = { updatedFields: Object.keys(req.body || {}) };
  return ApiResponse.success(res, { assessment }, 'Internal assessment component updated successfully');
});

export const updateAssessmentStatus = asyncHandler(async (req, res) => {
  const { assessment, previousStatus } = await assessmentService.updateAssessmentStatus(
    req.params.id,
    req.body,
    req.user.userId
  );
  res.locals.auditEntityId = assessment._id;
  res.locals.auditDetails = {
    previousStatus,
    newStatus: assessment.status,
    reason: req.body.reason || ''
  };
  return ApiResponse.success(
    res,
    { assessment },
    `Internal assessment status updated to ${assessment.status}`
  );
});

// === ASSESSMENT MARKS ENTRY & AUDIT ===
export const submitMarksBulk = asyncHandler(async (req, res) => {
  const result = await assessmentService.submitAssessmentMarksBulk(req.params.id, req.body, req.user);
  res.locals.auditEntityId = result.assessmentId;
  res.locals.auditDetails = {
    processedCount: result.processedCount,
    entryStatus: result.entryStatus,
    assessmentStatus: result.assessmentStatus
  };
  return ApiResponse.created(res, result, 'Assessment marks saved successfully');
});

export const listMarks = asyncHandler(async (req, res) => {
  const result = await assessmentService.listMarks(req.query, req.user);
  return ApiResponse.success(
    res,
    { marks: result.marks },
    'Assessment marks retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getMarkById = asyncHandler(async (req, res) => {
  const mark = await assessmentService.getMarkById(req.params.markId, req.user);
  return ApiResponse.success(res, { mark }, 'Assessment mark record retrieved successfully');
});

export const getMyPublishedMarks = asyncHandler(async (req, res) => {
  const result = await assessmentService.getMyPublishedMarks(req.user, req.query);
  return ApiResponse.success(res, result, 'Published internal assessment marks retrieved successfully');
});

export const correctMark = asyncHandler(async (req, res) => {
  const { mark, auditDetails } = await assessmentService.correctAssessmentMark(
    req.params.markId,
    req.body,
    req.user
  );
  res.locals.auditEntityId = mark._id;
  res.locals.auditDetails = auditDetails;
  return ApiResponse.success(res, { mark }, 'Assessment mark corrected and recorded in audit log');
});
