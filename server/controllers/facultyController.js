import FacultyAssignment from '../models/FacultyAssignment.js';
import ApiResponse from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/responseHandler.js';
import * as facultyService from '../services/facultyService.js';

export const getFacultyList = asyncHandler(async (req, res) => {
  const { faculty, meta } = await facultyService.listFaculty(req.query);
  return ApiResponse.success(res, faculty, 'Faculty members retrieved successfully', meta);
});

export const getFacultyById = asyncHandler(async (req, res) => {
  const faculty = await facultyService.getFacultyById(req.params.id);
  return ApiResponse.success(res, faculty, 'Faculty details retrieved successfully');
});

export const createFaculty = asyncHandler(async (req, res) => {
  const faculty = await facultyService.createFaculty(req.body);
  res.locals.auditEntityId = faculty._id;
  res.locals.auditDetails = { employeeId: faculty.employeeId };
  return ApiResponse.created(res, faculty, 'Faculty registered successfully');
});

export const updateFaculty = asyncHandler(async (req, res) => {
  const faculty = await facultyService.updateFaculty(req.params.id, req.body);
  res.locals.auditEntityId = faculty._id;
  res.locals.auditDetails = { employeeId: faculty.employeeId, status: faculty.status };
  return ApiResponse.success(res, faculty, 'Faculty profile updated successfully');
});

export const updateFacultyStatus = asyncHandler(async (req, res) => {
  const faculty = await facultyService.updateFacultyStatus(req.params.id, req.body.status);
  res.locals.auditEntityId = faculty._id;
  res.locals.auditDetails = { status: faculty.status };
  return ApiResponse.success(res, faculty, `Faculty status updated to ${faculty.status}`);
});

export const deleteFaculty = asyncHandler(async (req, res) => {
  const result = await facultyService.deleteFaculty(req.params.id);
  res.locals.auditEntityId = req.params.id;
  return ApiResponse.success(res, result, 'Faculty profile deleted');
});

export const getFacultyAssignments = async (req, res, next) => {
  try {
    const facultyId = req.query.facultyId || (req.user.role === 'faculty' ? req.user.profileId : null);
    const filter = facultyId ? { faculty: facultyId } : {};

    const assignments = await FacultyAssignment.find(filter)
      .populate('faculty')
      .populate('subject')
      .populate('semester')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Faculty assignments retrieved', assignments);
  } catch (err) {
    next(err);
  }
};

export const createFacultyAssignment = async (req, res, next) => {
  try {
    const assignment = await FacultyAssignment.create(req.body);
    return sendSuccess(res, 'Faculty assignment created', assignment, null, 201);
  } catch (err) {
    next(err);
  }
};
