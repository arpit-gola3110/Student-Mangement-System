import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import * as enrollmentService from '../services/enrollmentService.js';

export const getEnrollments = asyncHandler(async (req, res) => {
  const result = await enrollmentService.listEnrollments(req.query, req.user);
  return ApiResponse.success(
    res,
    { enrollments: result.enrollments },
    'Enrollments retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getMyEnrollments = asyncHandler(async (req, res) => {
  const result = await enrollmentService.getMyEnrollments(req.user, req.query);
  return ApiResponse.success(
    res,
    {
      student: result.student,
      enrollments: result.enrollments,
      summary: result.summary
    },
    'Student enrollments retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getEnrollmentById = asyncHandler(async (req, res) => {
  const enrollment = await enrollmentService.getEnrollmentById(req.params.id, req.user);
  return ApiResponse.success(res, { enrollment }, 'Enrollment retrieved successfully');
});

export const createEnrollments = asyncHandler(async (req, res) => {
  const result = await enrollmentService.createEnrollments(req.body, req.user.userId);
  const firstId = result.created[0]?._id || null;
  res.locals.auditEntityId = firstId;
  res.locals.auditDetails = {
    createdCount: result.createdCount,
    failedCount: result.failedCount,
    academicYear: req.body.academicYear,
    course: req.body.course,
    semester: req.body.semester
  };

  return ApiResponse.created(
    res,
    result,
    result.createdCount > 1
      ? `${result.createdCount} student enrollments created successfully`
      : 'Student enrolled successfully'
  );
});

export const updateEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await enrollmentService.updateEnrollment(req.params.id, req.body, req.user.userId);
  res.locals.auditEntityId = enrollment._id;
  res.locals.auditDetails = { updatedFields: Object.keys(req.body || {}) };
  return ApiResponse.success(res, { enrollment }, 'Enrollment updated successfully');
});

export const updateEnrollmentStatus = asyncHandler(async (req, res) => {
  const enrollment = await enrollmentService.updateEnrollmentStatus(
    req.params.id,
    req.body.status,
    req.user.userId
  );
  res.locals.auditEntityId = enrollment._id;
  res.locals.auditDetails = { status: enrollment.status };
  return ApiResponse.success(res, { enrollment }, `Enrollment status updated to ${enrollment.status}`);
});

export const deleteEnrollment = asyncHandler(async (req, res) => {
  const result = await enrollmentService.deleteEnrollment(req.params.id);
  res.locals.auditEntityId = req.params.id;
  return ApiResponse.success(res, result, 'Enrollment deleted successfully');
});
