import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import Enrollment from '../../models/Enrollment.js';
import ApiResponse from '../../utils/apiResponse.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'faculty'), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.student) filter.student = req.query.student;
    if (req.query.semester) filter.semester = req.query.semester;
    if (req.query.course) filter.course = req.query.course;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;

    const enrollments = await Enrollment.find(filter)
      .populate('student')
      .populate('course')
      .populate('semester')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, enrollments, 'Enrollments retrieved');
  } catch (err) { next(err); }
});

router.post('/', protect, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const enrollment = await Enrollment.create(req.body);
    return ApiResponse.created(res, enrollment, 'Student enrolled successfully');
  } catch (err) { next(err); }
});

export default router;
