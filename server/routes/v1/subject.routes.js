import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as acadCtrl from '../../controllers/academicController.js';

const router = express.Router();

router.get('/', protect, acadCtrl.getSubjects);
router.post('/', protect, authorizeRoles('admin'), logAuditEvent('CREATE', 'Subject'), acadCtrl.createSubject);

export default router;
