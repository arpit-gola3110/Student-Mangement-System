import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as assignmentCtrl from '../../controllers/assignmentController.js';
import {
  assignmentIdParamSchema,
  listAssignmentsQuerySchema,
  createAssignmentSchema,
  updateAssignmentSchema,
  updateAssignmentStatusSchema
} from '../../validators/assignmentValidator.js';

const router = express.Router();

router.use(protect);

// Faculty self-read route (must be declared before /:id)
router.get(
  '/my',
  authorizeRoles('faculty'),
  validateRequest({ query: listAssignmentsQuerySchema }),
  assignmentCtrl.getMyAssignments
);

router.get(
  '/',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ query: listAssignmentsQuerySchema }),
  assignmentCtrl.getAssignments
);

router.get(
  '/:id',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ params: assignmentIdParamSchema }),
  assignmentCtrl.getAssignmentById
);

router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest({ body: createAssignmentSchema }),
  logAuditEvent('CREATE', 'FACULTY_ASSIGNMENT'),
  assignmentCtrl.createAssignment
);

router.patch(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: assignmentIdParamSchema, body: updateAssignmentSchema }),
  logAuditEvent('UPDATE', 'FACULTY_ASSIGNMENT'),
  assignmentCtrl.updateAssignment
);

router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateRequest({ params: assignmentIdParamSchema, body: updateAssignmentStatusSchema }),
  logAuditEvent('UPDATE', 'FACULTY_ASSIGNMENT'),
  assignmentCtrl.updateAssignmentStatus
);

router.delete(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: assignmentIdParamSchema }),
  logAuditEvent('DELETE', 'FACULTY_ASSIGNMENT'),
  assignmentCtrl.deleteAssignment
);

export default router;
