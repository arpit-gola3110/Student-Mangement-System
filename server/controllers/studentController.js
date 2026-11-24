import Student from '../models/Student.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const getStudents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.department) query.department = req.query.department;
    if (req.query.semester) query.currentSemester = Number(req.query.semester);
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      query.$or = [
        { rollNumber: { $regex: req.query.search, $options: 'i' } },
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const totalRecords = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('department')
      .populate('user', 'email isActive')
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(limit);

    return sendSuccess(res, 'Students retrieved', students, {
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      }
    });
  } catch (err) { next(err); }
};

export const createStudent = async (req, res, next) => {
  try {
    const { email, password, rollNumber, enrollmentNumber, firstName, lastName, dateOfBirth, gender, department, contactNumber, address, currentSemester } = req.body;

    const user = await User.create({
      email: email.toLowerCase(),
      password: password || 'Student@123',
      role: 'STUDENT'
    });

    const student = await Student.create({
      user: user._id,
      rollNumber,
      enrollmentNumber,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      department,
      contactNumber,
      address,
      currentSemester: currentSemester || 1
    });

    return sendSuccess(res, 'Student registered successfully', student, null, 201);
  } catch (err) { next(err); }
};

export const getStudentById = async (req, res, next) => {
  try {
    // If student role, enforce reading only self
    if (req.user.role === 'STUDENT' && req.user.profileId !== req.params.id) {
      return sendError(res, 'Access denied: cannot view records of another student', null, 403);
    }

    const student = await Student.findById(req.params.id)
      .populate('department')
      .populate('user', 'email isActive');

    if (!student) return sendError(res, 'Student record not found', null, 404);
    return sendSuccess(res, 'Student details retrieved', student);
  } catch (err) { next(err); }
};
