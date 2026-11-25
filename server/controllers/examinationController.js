import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import * as examService from '../services/examinationService.js';

export const getExaminations = asyncHandler(async (req, res) => {
  const result = await examService.listExaminations(req.query, req.user);
  return ApiResponse.success(
    res,
    { examinations: result.examinations },
    'Examinations retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getExaminationById = asyncHandler(async (req, res) => {
  const result = await examService.getExaminationById(req.params.id, req.user);
  return ApiResponse.success(res, result, 'Examination retrieved successfully');
});

export const createExamination = asyncHandler(async (req, res) => {
  const examination = await examService.createExamination(req.body, req.user.userId);
  res.locals.auditEntityId = examination._id;
  res.locals.auditDetails = {
    title: examination.title,
    examType: examination.examType,
    subject: examination.subject?._id || examination.subject,
    academicYear: examination.academicYear
  };
  return ApiResponse.created(res, { examination }, 'Examination scheduled successfully');
});

export const updateExamination = asyncHandler(async (req, res) => {
  const examination = await examService.updateExamination(req.params.id, req.body, req.user.userId);
  res.locals.auditEntityId = examination._id;
  res.locals.auditDetails = { updatedFields: Object.keys(req.body || {}) };
  return ApiResponse.success(res, { examination }, 'Examination updated successfully');
});

export const updateExaminationStatus = asyncHandler(async (req, res) => {
  const { examination, previousStatus } = await examService.updateExaminationStatus(
    req.params.id,
    req.body,
    req.user.userId
  );
  res.locals.auditEntityId = examination._id;
  res.locals.auditDetails = {
    previousStatus,
    newStatus: examination.status,
    reason: req.body.reason || ''
  };
  return ApiResponse.success(
    res,
    { examination },
    `Examination status updated to ${examination.status}`
  );
});

export const deleteExamination = asyncHandler(async (req, res) => {
  const result = await examService.deleteExamination(req.params.id);
  res.locals.auditEntityId = req.params.id;
  return ApiResponse.success(res, result, 'Examination deleted successfully');
});
