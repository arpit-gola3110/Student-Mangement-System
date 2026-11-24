import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import * as dashCtrl from '../../controllers/dashboardController.js';

const router = express.Router();

router.get('/admin', protect, authorizeRoles('admin'), dashCtrl.getAdminDashboardStats);
router.get('/faculty', protect, authorizeRoles('faculty', 'admin'), dashCtrl.getFacultyDashboardStats);
router.get('/student', protect, authorizeRoles('student', 'admin'), dashCtrl.getStudentDashboardStats);

export default router;
