import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import {
  academicIdParamSchema,
  listDepartmentsQuerySchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  updateBooleanStatusSchema
} from '../../validators/academicValidator.js';
import * as acadCtrl from '../../controllers/academicController.js';

const router = express.Router();

router.use(protect);

router.get('/', validateRequest({ query: listDepartmentsQuerySchema }), acadCtrl.getDepartments);
router.get('/:id', validateRequest({ params: academicIdParamSchema }), acadCtrl.getDepartmentById);
router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest({ body: createDepartmentSchema }),
  logAuditEvent('CREATE', 'Department'),
  acadCtrl.createDepartment
);
router.patch(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema, body: updateDepartmentSchema }),
  logAuditEvent('UPDATE', 'Department'),
  acadCtrl.updateDepartment
);
router.put(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema, body: updateDepartmentSchema }),
  logAuditEvent('UPDATE', 'Department'),
  acadCtrl.updateDepartment
);
router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema, body: updateBooleanStatusSchema }),
  logAuditEvent('UPDATE', 'Department'),
  acadCtrl.updateDepartmentStatus
);
router.delete(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema }),
  logAuditEvent('DELETE', 'Department'),
  acadCtrl.deleteDepartment
);

export default router;
