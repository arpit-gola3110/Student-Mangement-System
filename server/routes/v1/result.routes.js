import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as resultCtrl from '../../controllers/resultController.js';

const router = express.Router();

router.post('/marks', protect, authorizeRoles('faculty', 'admin'), logAuditEvent('UPDATE', 'Result'), resultCtrl.submitMarksBatch);
router.get('/student/:studentId', protect, resultCtrl.getStudentResults);
router.get('/my-results', protect, authorizeRoles('student'), resultCtrl.getStudentResults);

export default router;
