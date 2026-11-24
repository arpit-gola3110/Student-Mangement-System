import Faculty from '../models/Faculty.js';
import User from '../models/User.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const getFacultyList = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.department) query.department = req.query.department;
    if (req.query.search) {
      query.$or = [
        { employeeId: { $regex: req.query.search, $options: 'i' } },
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const faculty = await Faculty.find(query)
      .populate('department')
      .populate('user', 'email isActive')
      .sort({ firstName: 1 });

    return sendSuccess(res, 'Faculty members retrieved', faculty);
  } catch (err) { next(err); }
};

export const createFaculty = async (req, res, next) => {
  try {
    const { email, password, employeeId, firstName, lastName, department, designation, qualification, contactNumber } = req.body;

    const user = await User.create({
      email: email.toLowerCase(),
      password: password || 'Faculty@123',
      role: 'faculty'
    });

    const faculty = await Faculty.create({
      user: user._id,
      employeeId,
      firstName,
      lastName,
      department,
      designation,
      qualification,
      contactNumber
    });

    return sendSuccess(res, 'Faculty registered successfully', faculty, null, 201);
  } catch (err) { next(err); }
};

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
  } catch (err) { next(err); }
};

export const createFacultyAssignment = async (req, res, next) => {
  try {
    const assignment = await FacultyAssignment.create(req.body);
    return sendSuccess(res, 'Faculty assignment created', assignment, null, 201);
  } catch (err) { next(err); }
};
