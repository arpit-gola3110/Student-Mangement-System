import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as resultCtrl from '../../controllers/resultController.js';
import {
  idParamSchema,
  readinessQuerySchema,
  calculateResultsSchema,
  recalculateResultSchema,
  listResultsQuerySchema,
  reasonOptionalSchema,
  reasonRequiredSchema,
  batchResultIdsSchema,
  correctResultSchema
} from '../../validators/resultValidator.js';

const router = express.Router();

router.use(protect);

// === STUDENT PERSONAL ROUTES (must precede /:id) ===
router.get('/my', authorizeRoles('student'), resultCtrl.getMyResults);
router.get('/my-results', authorizeRoles('student'), resultCtrl.getMyResults);
router.get('/my/semester-summary', authorizeRoles('student'), resultCtrl.getMySemesterSummary);
router.get('/my/subject-summary', authorizeRoles('student'), resultCtrl.getMySubjectSummary);
router.get('/student/:studentId', authorizeRoles('admin', 'faculty', 'student'), resultCtrl.getStudentResults);

// === FACULTY SCOPED ROUTES ===
router.get('/faculty/assigned-subjects', authorizeRoles('faculty'), resultCtrl.getFacultyAssignedSubjects);
router.get('/faculty/overview', authorizeRoles('faculty'), resultCtrl.getFacultyResultsOverview);

// === ADMIN REPORTS ===
router.get('/reports/overview', authorizeRoles('admin'), resultCtrl.getReportsOverview);
router.get('/reports/subjects', authorizeRoles('admin'), resultCtrl.getReportsOverview);
router.get('/reports/semesters', authorizeRoles('admin'), resultCtrl.getReportsOverview);
router.get('/reports/grades', authorizeRoles('admin'), resultCtrl.getReportsOverview);

// === CALCULATION & WORKFLOW (ADMIN ONLY) ===
router.get(
  '/readiness',
  authorizeRoles('admin'),
  validateRequest({ query: readinessQuerySchema }),
  resultCtrl.checkReadiness
);
router.post(
  '/calculate',
  authorizeRoles('admin'),
  validateRequest({ body: calculateResultsSchema }),
  logAuditEvent('CREATE', 'RESULT_BATCH'),
  resultCtrl.calculateResults
);
router.post(
  '/recalculate',
  authorizeRoles('admin'),
  validateRequest({ body: recalculateResultSchema }),
  logAuditEvent('OVERRIDE', 'RESULT_RECALCULATION'),
  resultCtrl.recalculateResults
);
router.post(
  '/batch-approve',
  authorizeRoles('admin'),
  validateRequest({ body: batchResultIdsSchema }),
  logAuditEvent('UPDATE', 'RESULT_BATCH_APPROVE'),
  resultCtrl.batchApproveResults
);
router.post(
  '/batch-publish',
  authorizeRoles('admin'),
  validateRequest({ body: batchResultIdsSchema }),
  logAuditEvent('OVERRIDE', 'RESULT_BATCH_PUBLISH'),
  resultCtrl.batchPublishResults
);

// === RESULT LISTING & RECORD ACTIONS ===
router.get(
  '/',
  authorizeRoles('admin', 'faculty', 'student'),
  validateRequest({ query: listResultsQuerySchema }),
  resultCtrl.listResults
);
router.get(
  '/:id',
  authorizeRoles('admin', 'faculty', 'student'),
  validateRequest({ params: idParamSchema }),
  resultCtrl.getResultById
);
router.get(
  '/:id/history',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ params: idParamSchema }),
  resultCtrl.getResultHistory
);
router.post(
  '/:id/approve',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema, body: reasonOptionalSchema }),
  logAuditEvent('UPDATE', 'RESULT_APPROVE'),
  resultCtrl.approveResult
);
router.post(
  '/:id/reject',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema, body: reasonRequiredSchema }),
  logAuditEvent('OVERRIDE', 'RESULT_REJECT'),
  resultCtrl.rejectResult
);
router.post(
  '/:id/publish',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema, body: reasonOptionalSchema }),
  logAuditEvent('OVERRIDE', 'RESULT_PUBLISH'),
  resultCtrl.publishResult
);
router.post(
  '/:id/withdraw',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema, body: reasonRequiredSchema }),
  logAuditEvent('OVERRIDE', 'RESULT_WITHDRAW'),
  resultCtrl.withdrawResult
);
router.patch(
  '/:id/correct',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema, body: correctResultSchema }),
  logAuditEvent('OVERRIDE', 'RESULT_CORRECTION'),
  resultCtrl.correctResult
);

export default router;
