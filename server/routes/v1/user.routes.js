import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import User from '../../models/User.js';
import ApiResponse from '../../utils/apiResponse.js';
import ApiError from '../../utils/ApiError.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return ApiResponse.success(res, users, 'Users retrieved');
  } catch (err) { next(err); }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return next(ApiError.forbidden('Access denied: cannot view another user account'));
    }
    const user = await User.findById(req.params.id);
    if (!user) return ApiResponse.error(res, 'User not found', [], 404);
    return ApiResponse.success(res, user, 'User details');
  } catch (err) { next(err); }
});

export default router;
