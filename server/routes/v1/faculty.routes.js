import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import {
  facultyIdParamSchema,
  listFacultyQuerySchema,
  createFacultySchema,
  updateFacultySchema,
  updateFacultyStatusSchema
} from '../../validators/facultyValidator.js';
import * as facultyCtrl from '../../controllers/facultyController.js';

const router = express.Router();

router.use(protect);

router.get(
  '/',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ query: listFacultyQuerySchema }),
  facultyCtrl.getFacultyList
);
router.get(
  '/:id',
  authorizeRoles('admin', 'faculty'),
  validateRequest({ params: facultyIdParamSchema }),
  facultyCtrl.getFacultyById
);
router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest({ body: createFacultySchema }),
  logAuditEvent('CREATE', 'Faculty'),
  facultyCtrl.createFaculty
);
router.patch(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: facultyIdParamSchema, body: updateFacultySchema }),
  logAuditEvent('UPDATE', 'Faculty'),
  facultyCtrl.updateFaculty
);
router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateRequest({ params: facultyIdParamSchema, body: updateFacultyStatusSchema }),
  logAuditEvent('UPDATE', 'Faculty'),
  facultyCtrl.updateFacultyStatus
);
router.delete(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: facultyIdParamSchema }),
  logAuditEvent('DELETE', 'Faculty'),
  facultyCtrl.deleteFaculty
);

export default router;
