import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import * as assignmentService from '../services/assignmentService.js';

export const getAssignments = asyncHandler(async (req, res) => {
  const result = await assignmentService.listAssignments(req.query, req.user);
  return ApiResponse.success(
    res,
    { assignments: result.assignments },
    'Faculty assignments retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getMyAssignments = asyncHandler(async (req, res) => {
  const result = await assignmentService.getMyAssignments(req.user, req.query);
  return ApiResponse.success(
    res,
    {
      faculty: result.faculty,
      assignments: result.assignments,
      summary: result.summary
    },
    'Personal faculty assignments retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getAssignmentById = asyncHandler(async (req, res) => {
  const assignment = await assignmentService.getAssignmentById(req.params.id, req.user);
  return ApiResponse.success(res, { assignment }, 'Faculty assignment retrieved successfully');
});

export const createAssignment = asyncHandler(async (req, res) => {
  const assignment = await assignmentService.createAssignment(req.body, req.user.userId);
  res.locals.auditEntityId = assignment._id;
  res.locals.auditDetails = {
    faculty: req.body.faculty,
    subject: req.body.subject,
    semester: req.body.semester,
    section: assignment.section,
    academicYear: assignment.academicYear
  };
  return ApiResponse.created(res, { assignment }, 'Faculty assignment created successfully');
});

export const updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await assignmentService.updateAssignment(req.params.id, req.body, req.user.userId);
  res.locals.auditEntityId = assignment._id;
  res.locals.auditDetails = { updatedFields: Object.keys(req.body || {}) };
  return ApiResponse.success(res, { assignment }, 'Faculty assignment updated successfully');
});

export const updateAssignmentStatus = asyncHandler(async (req, res) => {
  const assignment = await assignmentService.updateAssignmentStatus(
    req.params.id,
    req.body.status,
    req.user.userId
  );
  res.locals.auditEntityId = assignment._id;
  res.locals.auditDetails = { status: assignment.status };
  return ApiResponse.success(res, { assignment }, `Faculty assignment status updated to ${assignment.status}`);
});

export const deleteAssignment = asyncHandler(async (req, res) => {
  const result = await assignmentService.deleteAssignment(req.params.id);
  res.locals.auditEntityId = req.params.id;
  return ApiResponse.success(res, result, 'Faculty assignment deleted successfully');
});
