import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as studentCtrl from '../../controllers/studentController.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'faculty'), studentCtrl.getStudents);
router.post('/', protect, authorizeRoles('admin'), logAuditEvent('CREATE', 'Student'), studentCtrl.createStudent);
router.get('/:id', protect, studentCtrl.getStudentById);

export default router;
