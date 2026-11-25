import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as attdCtrl from '../../controllers/attendanceController.js';
import {
  attendanceIdParamSchema,
  listSessionsQuerySchema,
  createSessionSchema,
  updateSessionSchema,
  updateSessionStatusSchema,
  bulkAttendanceSchema,
  listAttendanceQuerySchema,
  correctAttendanceSchema,
  reportQuerySchema
} from '../../validators/attendanceValidator.js';

const router = express.Router();

router.use(protect);

// === FACULTY SELF-SCOPED ENDPOINTS ===
router.get('/my-subjects', authorizeRoles('faculty'), attdCtrl.getMySubjects);
router.get(
  '/my-sessions',
  authorizeRoles('faculty'),
  validateRequest({ query: listSessionsQuerySchema }),
  attdCtrl.listMySessions
);
router.get(
  '/my-history',
  authorizeRoles('faculty'),
  validateRequest({ query: listAttendanceQuerySchema }),
  attdCtrl.listMyHistory
);

// === STUDENT SELF-SCOPED ENDPOINTS ===
router.get(
  '/my',
  authorizeRoles('student'),
  validateRequest({ query: listAttendanceQuerySchema }),
  attdCtrl.getMyAttendance
);
router.get('/my/summary', authorizeRoles('student'), attdCtrl.getMySummary);
router.get('/my-summary', authorizeRoles('student'), attdCtrl.getMySummary);
router.get('/my/subjects', authorizeRoles('student'), attdCtrl.getMySubjectsAttendance);
router.get('/student/:studentId', authorizeRoles('admin', 'faculty', 'student'), attdCtrl.getStudentAttendanceSummary);

// === REPORTS ===
router.get(
  '/reports/overview',
  authorizeRoles('admin'),
  validateRequest({ query: reportQuerySchema }),
  attdCtrl.getOverviewReport
);
router.get(
  '/reports/subjects',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ query: reportQuerySchema }),
  attdCtrl.getSubjectsReport
);
router.get(
  '/reports/students',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ query: reportQuerySchema }),
  attdCtrl.getStudentsReport
);
router.get(
  '/reports/faculty',
  authorizeRoles('admin'),
  validateRequest({ query: reportQuerySchema }),
  attdCtrl.getFacultyReport
);

// === ATTENDANCE SESSIONS ===
router.get(
  '/sessions',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ query: listSessionsQuerySchema }),
  attdCtrl.listSessions
);
router.get(
  '/sessions/:id',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ params: attendanceIdParamSchema }),
  attdCtrl.getSessionById
);
router.post(
  '/sessions',
  authorizeRoles('faculty', 'admin'),
  validateRequest({ body: createSessionSchema }),
  logAuditEvent('CREATE', 'ATTENDANCE_SESSION'),
  attdCtrl.createSession
);
router.patch(
  '/sessions/:id',
  authorizeRoles('faculty', 'admin'),
  validateRequest({ params: attendanceIdParamSchema, body: updateSessionSchema }),
  logAuditEvent('UPDATE', 'ATTENDANCE_SESSION'),
  attdCtrl.updateSession
);
router.patch(
  '/sessions/:id/status',
  authorizeRoles('faculty', 'admin'),
  validateRequest({ params: attendanceIdParamSchema, body: updateSessionStatusSchema }),
  logAuditEvent('OVERRIDE', 'ATTENDANCE_SESSION'),
  attdCtrl.updateSessionStatus
);

// === BULK ATTENDANCE SUBMISSION ===
router.post(
  '/bulk',
  authorizeRoles('faculty', 'admin'),
  validateRequest({ body: bulkAttendanceSchema }),
  logAuditEvent('CREATE', 'ATTENDANCE_BATCH'),
  attdCtrl.submitBulkAttendance
);

// === INDIVIDUAL ATTENDANCE HISTORY & CORRECTION ===
router.get(
  '/',
  authorizeRoles('admin', 'faculty', 'student'),
  validateRequest({ query: listAttendanceQuerySchema }),
  attdCtrl.listAttendance
);
router.get(
  '/:id',
  authorizeRoles('admin', 'faculty', 'student'),
  validateRequest({ params: attendanceIdParamSchema }),
  attdCtrl.getAttendanceById
);
router.patch(
  '/:id',
  authorizeRoles('faculty', 'admin'),
  validateRequest({ params: attendanceIdParamSchema, body: correctAttendanceSchema }),
  logAuditEvent('OVERRIDE', 'ATTENDANCE_RECORD'),
  attdCtrl.correctAttendance
);

export default router;
