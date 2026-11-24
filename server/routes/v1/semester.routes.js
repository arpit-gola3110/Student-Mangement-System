import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as acadCtrl from '../../controllers/academicController.js';

const router = express.Router();

router.get('/', protect, acadCtrl.getSemesters);
router.post('/', protect, authorizeRoles('admin'), logAuditEvent('CREATE', 'Semester'), acadCtrl.createSemester);

export default router;
