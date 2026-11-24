import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import Attendance from '../../models/Attendance.js';
import Result from '../../models/Result.js';
import ApiResponse from '../../utils/apiResponse.js';

const router = express.Router();

router.get('/attendance-summary', protect, authorizeRoles('admin', 'faculty'), async (req, res, next) => {
  try {
    const summary = await Attendance.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    return ApiResponse.success(res, summary, 'Attendance summary generated');
  } catch (err) { next(err); }
});

router.get('/result-analysis', protect, authorizeRoles('admin', 'faculty'), async (req, res, next) => {
  try {
    const gradeDistribution = await Result.aggregate([
      {
        $group: {
          _id: '$grade',
          count: { $sum: 1 },
          avgMarks: { $avg: '$totalMarks' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    return ApiResponse.success(res, gradeDistribution, 'Result analysis generated');
  } catch (err) { next(err); }
});

export default router;
