import ApiResponse from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as departmentService from '../services/departmentService.js';
import * as courseService from '../services/courseService.js';
import * as semesterService from '../services/semesterService.js';
import * as subjectService from '../services/subjectService.js';

// --- DEPARTMENTS ---
export const getDepartments = asyncHandler(async (req, res) => {
  const { departments, meta } = await departmentService.listDepartments(req.query);
  return ApiResponse.success(res, departments, 'Departments retrieved successfully', meta);
});

export const getDepartmentById = asyncHandler(async (req, res) => {
  const dept = await departmentService.getDepartmentById(req.params.id);
  return ApiResponse.success(res, dept, 'Department retrieved successfully');
});

export const createDepartment = asyncHandler(async (req, res) => {
  const dept = await departmentService.createDepartment(req.body);
  res.locals.auditEntityId = dept._id;
  res.locals.auditDetails = { code: dept.code };
  return ApiResponse.created(res, dept, 'Department created successfully');
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const dept = await departmentService.updateDepartment(req.params.id, req.body);
  res.locals.auditEntityId = dept._id;
  res.locals.auditDetails = { code: dept.code };
  return ApiResponse.success(res, dept, 'Department updated successfully');
});

export const updateDepartmentStatus = asyncHandler(async (req, res) => {
  const dept = await departmentService.updateDepartmentStatus(req.params.id, req.body.isActive);
  res.locals.auditEntityId = dept._id;
  res.locals.auditDetails = { isActive: dept.isActive };
  return ApiResponse.success(
    res,
    dept,
    dept.isActive ? 'Department activated successfully' : 'Department deactivated successfully'
  );
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const result = await departmentService.deleteDepartment(req.params.id);
  res.locals.auditEntityId = req.params.id;
  return ApiResponse.success(res, result, 'Department deleted successfully');
});

// --- COURSES ---
export const getCourses = asyncHandler(async (req, res) => {
  const { courses, meta } = await courseService.listCourses(req.query);
  return ApiResponse.success(res, courses, 'Courses retrieved successfully', meta);
});

export const getCourseById = asyncHandler(async (req, res) => {
  const course = await courseService.getCourseById(req.params.id);
  return ApiResponse.success(res, course, 'Course retrieved successfully');
});

export const createCourse = asyncHandler(async (req, res) => {
  const course = await courseService.createCourse(req.body);
  res.locals.auditEntityId = course._id;
  res.locals.auditDetails = { code: course.code };
  return ApiResponse.created(res, course, 'Course created successfully');
});

export const updateCourse = asyncHandler(async (req, res) => {
  const course = await courseService.updateCourse(req.params.id, req.body);
  res.locals.auditEntityId = course._id;
  res.locals.auditDetails = { code: course.code };
  return ApiResponse.success(res, course, 'Course updated successfully');
});

export const updateCourseStatus = asyncHandler(async (req, res) => {
  const course = await courseService.updateCourseStatus(req.params.id, req.body.isActive);
  res.locals.auditEntityId = course._id;
  res.locals.auditDetails = { isActive: course.isActive };
  return ApiResponse.success(
    res,
    course,
    course.isActive ? 'Course activated successfully' : 'Course deactivated successfully'
  );
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const result = await courseService.deleteCourse(req.params.id);
  res.locals.auditEntityId = req.params.id;
  return ApiResponse.success(res, result, 'Course deleted successfully');
});

// --- SEMESTERS ---
export const getSemesters = asyncHandler(async (req, res) => {
  const { semesters, meta } = await semesterService.listSemesters(req.query);
  return ApiResponse.success(res, semesters, 'Semesters retrieved successfully', meta);
});

export const getSemesterById = asyncHandler(async (req, res) => {
  const semester = await semesterService.getSemesterById(req.params.id);
  return ApiResponse.success(res, semester, 'Semester retrieved successfully');
});

export const createSemester = asyncHandler(async (req, res) => {
  const semester = await semesterService.createSemester(req.body);
  res.locals.auditEntityId = semester._id;
  res.locals.auditDetails = { semesterNumber: semester.semesterNumber, academicYear: semester.academicYear };
  return ApiResponse.created(res, semester, 'Semester created successfully');
});

export const updateSemester = asyncHandler(async (req, res) => {
  const semester = await semesterService.updateSemester(req.params.id, req.body);
  res.locals.auditEntityId = semester._id;
  res.locals.auditDetails = { semesterNumber: semester.semesterNumber, academicYear: semester.academicYear };
  return ApiResponse.success(res, semester, 'Semester updated successfully');
});

export const updateSemesterStatus = asyncHandler(async (req, res) => {
  const semester = await semesterService.updateSemesterStatus(req.params.id, req.body);
  res.locals.auditEntityId = semester._id;
  res.locals.auditDetails = { isActive: semester.isActive, status: semester.status };
  return ApiResponse.success(res, semester, 'Semester status updated successfully');
});

export const deleteSemester = asyncHandler(async (req, res) => {
  const result = await semesterService.deleteSemester(req.params.id);
  res.locals.auditEntityId = req.params.id;
  return ApiResponse.success(res, result, 'Semester deleted successfully');
});

// --- SUBJECTS ---
export const getSubjects = asyncHandler(async (req, res) => {
  const { subjects, meta } = await subjectService.listSubjects(req.query);
  return ApiResponse.success(res, subjects, 'Subjects retrieved successfully', meta);
});

export const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await subjectService.getSubjectById(req.params.id);
  return ApiResponse.success(res, subject, 'Subject retrieved successfully');
});

export const createSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.createSubject(req.body);
  res.locals.auditEntityId = subject._id;
  res.locals.auditDetails = { code: subject.code };
  return ApiResponse.created(res, subject, 'Subject created successfully');
});

export const updateSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.updateSubject(req.params.id, req.body);
  res.locals.auditEntityId = subject._id;
  res.locals.auditDetails = { code: subject.code };
  return ApiResponse.success(res, subject, 'Subject updated successfully');
});

export const updateSubjectStatus = asyncHandler(async (req, res) => {
  const subject = await subjectService.updateSubjectStatus(req.params.id, req.body.isActive);
  res.locals.auditEntityId = subject._id;
  res.locals.auditDetails = { isActive: subject.isActive };
  return ApiResponse.success(
    res,
    subject,
    subject.isActive ? 'Subject activated successfully' : 'Subject deactivated successfully'
  );
});

export const deleteSubject = asyncHandler(async (req, res) => {
  const result = await subjectService.deleteSubject(req.params.id);
  res.locals.auditEntityId = req.params.id;
  return ApiResponse.success(res, result, 'Subject deleted successfully');
});
