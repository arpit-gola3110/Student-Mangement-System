import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import {
  studentIdParamSchema,
  listStudentsQuerySchema,
  createStudentSchema,
  updateStudentSchema,
  updateStudentStatusSchema
} from '../../validators/studentValidator.js';
import * as studentCtrl from '../../controllers/studentController.js';

const router = express.Router();

router.use(protect);

router.get(
  '/',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ query: listStudentsQuerySchema }),
  studentCtrl.getStudents
);
router.get(
  '/:id',
  validateRequest({ params: studentIdParamSchema }),
  studentCtrl.getStudentById
);
router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest({ body: createStudentSchema }),
  logAuditEvent('CREATE', 'Student'),
  studentCtrl.createStudent
);
router.patch(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: studentIdParamSchema, body: updateStudentSchema }),
  logAuditEvent('UPDATE', 'Student'),
  studentCtrl.updateStudent
);
router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateRequest({ params: studentIdParamSchema, body: updateStudentStatusSchema }),
  logAuditEvent('UPDATE', 'Student'),
  studentCtrl.updateStudentStatus
);
router.delete(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: studentIdParamSchema }),
  logAuditEvent('DELETE', 'Student'),
  studentCtrl.deleteStudent
);

export default router;
