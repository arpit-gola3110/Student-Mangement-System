import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as studentService from '../services/studentService.js';

export const getStudents = asyncHandler(async (req, res) => {
  const { students, meta } = await studentService.listStudents(req.query);
  return ApiResponse.success(res, students, 'Students retrieved successfully', meta);
});

export const createStudent = asyncHandler(async (req, res) => {
  const student = await studentService.createStudent(req.body);
  res.locals.auditEntityId = student._id;
  res.locals.auditDetails = { enrollmentNumber: student.enrollmentNumber };
  return ApiResponse.created(res, student, 'Student registered successfully');
});

export const getStudentById = asyncHandler(async (req, res) => {
  if (req.user.role === 'student' && req.user.profileId !== req.params.id) {
    throw ApiError.forbidden('Access denied: cannot view records of another student');
  }
  const student = await studentService.getStudentById(req.params.id);
  return ApiResponse.success(res, student, 'Student details retrieved successfully');
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await studentService.updateStudent(req.params.id, req.body);
  res.locals.auditEntityId = student._id;
  res.locals.auditDetails = { enrollmentNumber: student.enrollmentNumber, status: student.status };
  return ApiResponse.success(res, student, 'Student profile updated successfully');
});

export const updateStudentStatus = asyncHandler(async (req, res) => {
  const student = await studentService.updateStudentStatus(req.params.id, req.body.status);
  res.locals.auditEntityId = student._id;
  res.locals.auditDetails = { status: student.status };
  return ApiResponse.success(res, student, `Student status updated to ${student.status}`);
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const result = await studentService.deleteStudent(req.params.id);
  res.locals.auditEntityId = req.params.id;
  return ApiResponse.success(res, result, 'Student record deleted');
});
