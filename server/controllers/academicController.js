import Department from '../models/Department.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

// --- DEPARTMENTS ---
export const getDepartments = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.isActive === 'true') filter.isActive = { $ne: false };
    const departments = await Department.find(filter).populate('headOfDepartment').sort({ name: 1 });
    return sendSuccess(res, 'Departments retrieved', departments);
  } catch (err) { next(err); }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { code, name, description, headOfDepartment } = req.body;
    const dept = await Department.create({ code, name, description, headOfDepartment });
    return sendSuccess(res, 'Department created', dept, null, 201);
  } catch (err) { next(err); }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!dept) return sendError(res, 'Department not found', null, 404);
    return sendSuccess(res, 'Department updated', dept);
  } catch (err) { next(err); }
};

// --- COURSES ---
export const getCourses = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.isActive === 'true') filter.isActive = { $ne: false };
    const courses = await Course.find(filter).populate('department').sort({ name: 1 });
    return sendSuccess(res, 'Courses retrieved', courses);
  } catch (err) { next(err); }
};

export const createCourse = async (req, res, next) => {
  try {
    const course = await Course.create(req.body);
    return sendSuccess(res, 'Course created', course, null, 201);
  } catch (err) { next(err); }
};

// --- SEMESTERS ---
export const getSemesters = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.status) filter.status = req.query.status;
    const semesters = await Semester.find(filter).populate('course').sort({ semesterNumber: 1 });
    return sendSuccess(res, 'Semesters retrieved', semesters);
  } catch (err) { next(err); }
};

export const createSemester = async (req, res, next) => {
  try {
    const semester = await Semester.create(req.body);
    return sendSuccess(res, 'Semester created', semester, null, 201);
  } catch (err) { next(err); }
};

// --- SUBJECTS ---
export const getSubjects = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.semester) filter.semester = req.query.semester;
    if (req.query.course) filter.course = req.query.course;
    const subjects = await Subject.find(filter).populate('course semester').sort({ code: 1 });
    return sendSuccess(res, 'Subjects retrieved', subjects);
  } catch (err) { next(err); }
};

export const createSubject = async (req, res, next) => {
  try {
    const subject = await Subject.create(req.body);
    return sendSuccess(res, 'Subject created', subject, null, 201);
  } catch (err) { next(err); }
};
