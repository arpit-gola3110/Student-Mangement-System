import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as enrollmentCtrl from '../../controllers/enrollmentController.js';
import {
  enrollmentIdParamSchema,
  listEnrollmentsQuerySchema,
  createEnrollmentSchema,
  updateEnrollmentSchema,
  updateEnrollmentStatusSchema
} from '../../validators/enrollmentValidator.js';

const router = express.Router();

router.use(protect);

// Student self-read route (must be declared before /:id)
router.get(
  '/my',
  authorizeRoles('student'),
  validateRequest({ query: listEnrollmentsQuerySchema }),
  enrollmentCtrl.getMyEnrollments
);

router.get(
  '/',
  authorizeRoles('admin', 'faculty', 'student'),
  validateRequest({ query: listEnrollmentsQuerySchema }),
  enrollmentCtrl.getEnrollments
);

router.get(
  '/:id',
  authorizeRoles('admin', 'faculty', 'student'),
  validateRequest({ params: enrollmentIdParamSchema }),
  enrollmentCtrl.getEnrollmentById
);

router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest({ body: createEnrollmentSchema }),
  logAuditEvent('CREATE', 'ENROLLMENT'),
  enrollmentCtrl.createEnrollments
);

router.patch(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: enrollmentIdParamSchema, body: updateEnrollmentSchema }),
  logAuditEvent('UPDATE', 'ENROLLMENT'),
  enrollmentCtrl.updateEnrollment
);

router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateRequest({ params: enrollmentIdParamSchema, body: updateEnrollmentStatusSchema }),
  logAuditEvent('UPDATE', 'ENROLLMENT'),
  enrollmentCtrl.updateEnrollmentStatus
);

router.delete(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: enrollmentIdParamSchema }),
  logAuditEvent('DELETE', 'ENROLLMENT'),
  enrollmentCtrl.deleteEnrollment
);

export default router;
