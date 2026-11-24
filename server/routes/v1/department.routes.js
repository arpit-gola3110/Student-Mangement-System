import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as acadCtrl from '../../controllers/academicController.js';

const router = express.Router();

router.get('/', protect, acadCtrl.getDepartments);
router.post('/', protect, authorizeRoles('admin'), logAuditEvent('CREATE', 'Department'), acadCtrl.createDepartment);
router.put('/:id', protect, authorizeRoles('admin'), logAuditEvent('UPDATE', 'Department'), acadCtrl.updateDepartment);

export default router;
