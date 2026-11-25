import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import {
  academicIdParamSchema,
  listSubjectsQuerySchema,
  createSubjectSchema,
  updateSubjectSchema,
  updateBooleanStatusSchema
} from '../../validators/academicValidator.js';
import * as acadCtrl from '../../controllers/academicController.js';

const router = express.Router();

router.use(protect);

router.get('/', validateRequest({ query: listSubjectsQuerySchema }), acadCtrl.getSubjects);
router.get('/:id', validateRequest({ params: academicIdParamSchema }), acadCtrl.getSubjectById);
router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest({ body: createSubjectSchema }),
  logAuditEvent('CREATE', 'Subject'),
  acadCtrl.createSubject
);
router.patch(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema, body: updateSubjectSchema }),
  logAuditEvent('UPDATE', 'Subject'),
  acadCtrl.updateSubject
);
router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema, body: updateBooleanStatusSchema }),
  logAuditEvent('UPDATE', 'Subject'),
  acadCtrl.updateSubjectStatus
);
router.delete(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema }),
  logAuditEvent('DELETE', 'Subject'),
  acadCtrl.deleteSubject
);

export default router;
