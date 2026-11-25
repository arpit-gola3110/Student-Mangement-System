import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as examCtrl from '../../controllers/examinationController.js';
import {
  idParamSchema,
  listExaminationsQuerySchema,
  createExaminationSchema,
  updateExaminationSchema,
  updateExaminationStatusSchema
} from '../../validators/examAssessmentValidator.js';

const router = express.Router();

router.use(protect);

router.get(
  '/',
  authorizeRoles('admin', 'faculty', 'student'),
  validateRequest({ query: listExaminationsQuerySchema }),
  examCtrl.getExaminations
);

router.get(
  '/:id',
  authorizeRoles('admin', 'faculty', 'student'),
  validateRequest({ params: idParamSchema }),
  examCtrl.getExaminationById
);

router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest({ body: createExaminationSchema }),
  logAuditEvent('CREATE', 'EXAMINATION'),
  examCtrl.createExamination
);

router.patch(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema, body: updateExaminationSchema }),
  logAuditEvent('UPDATE', 'EXAMINATION'),
  examCtrl.updateExamination
);

router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema, body: updateExaminationStatusSchema }),
  logAuditEvent('OVERRIDE', 'EXAMINATION'),
  examCtrl.updateExaminationStatus
);

router.delete(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema }),
  logAuditEvent('DELETE', 'EXAMINATION'),
  examCtrl.deleteExamination
);

export default router;
