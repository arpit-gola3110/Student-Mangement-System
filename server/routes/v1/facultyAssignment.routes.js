import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import * as facultyCtrl from '../../controllers/facultyController.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'faculty'), facultyCtrl.getFacultyAssignments);
router.post('/', protect, authorizeRoles('admin'), facultyCtrl.createFacultyAssignment);

export default router;
