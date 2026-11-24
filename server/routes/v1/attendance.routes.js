import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as attdCtrl from '../../controllers/attendanceController.js';

const router = express.Router();

router.post('/', protect, authorizeRoles('faculty', 'admin'), logAuditEvent('CREATE', 'Attendance'), attdCtrl.submitAttendanceBatch);
router.get('/student/:studentId', protect, attdCtrl.getStudentAttendanceSummary);
router.get('/my-summary', protect, authorizeRoles('student'), attdCtrl.getStudentAttendanceSummary);

export default router;
