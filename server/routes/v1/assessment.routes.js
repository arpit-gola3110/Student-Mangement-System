import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as assessCtrl from '../../controllers/assessmentController.js';
import {
  idParamSchema,
  markIdParamSchema,
  listAssessmentsQuerySchema,
  createAssessmentSchema,
  updateAssessmentSchema,
  updateAssessmentStatusSchema,
  bulkMarksSchema,
  listMarksQuerySchema,
  correctMarkSchema
} from '../../validators/examAssessmentValidator.js';

const router = express.Router();

router.use(protect);

// === STUDENT PERSONAL PUBLISHED MARKS (must precede /:id) ===
router.get('/my-marks', authorizeRoles('student'), assessCtrl.getMyPublishedMarks);

// === MARKS LISTING & AUDIT-LOGGED CORRECTION (must precede /:id) ===
router.get(
  '/marks',
  authorizeRoles('admin', 'faculty', 'student'),
  validateRequest({ query: listMarksQuerySchema }),
  assessCtrl.listMarks
);
router.get(
  '/marks/:markId',
  authorizeRoles('admin', 'faculty', 'student'),
  validateRequest({ params: markIdParamSchema }),
  assessCtrl.getMarkById
);
router.patch(
  '/marks/:markId',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ params: markIdParamSchema, body: correctMarkSchema }),
  logAuditEvent('OVERRIDE', 'ASSESSMENT_MARK'),
  assessCtrl.correctMark
);

// === INTERNAL ASSESSMENT COMPONENTS ===
router.get(
  '/',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ query: listAssessmentsQuerySchema }),
  assessCtrl.listAssessments
);
router.get(
  '/:id',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ params: idParamSchema }),
  assessCtrl.getAssessmentWithRoster
);
router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest({ body: createAssessmentSchema }),
  logAuditEvent('CREATE', 'INTERNAL_ASSESSMENT'),
  assessCtrl.createAssessment
);
router.patch(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema, body: updateAssessmentSchema }),
  logAuditEvent('UPDATE', 'INTERNAL_ASSESSMENT'),
  assessCtrl.updateAssessment
);
router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema, body: updateAssessmentStatusSchema }),
  logAuditEvent('OVERRIDE', 'INTERNAL_ASSESSMENT'),
  assessCtrl.updateAssessmentStatus
);

// === BULK / INDIVIDUAL MARKS ENTRY FOR AN ASSESSMENT ===
router.post(
  '/:id/marks/bulk',
  authorizeRoles('faculty', 'admin'),
  validateRequest({ params: idParamSchema, body: bulkMarksSchema }),
  logAuditEvent('CREATE', 'ASSESSMENT_MARKS_BATCH'),
  assessCtrl.submitMarksBulk
);

export default router;
