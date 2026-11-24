import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as facultyCtrl from '../../controllers/facultyController.js';

const router = express.Router();

router.get('/', protect, authorizeRoles('admin', 'faculty'), facultyCtrl.getFacultyList);
router.post('/', protect, authorizeRoles('admin'), logAuditEvent('CREATE', 'Faculty'), facultyCtrl.createFaculty);

export default router;
