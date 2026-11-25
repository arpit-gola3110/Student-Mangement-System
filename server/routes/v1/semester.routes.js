import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import {
  academicIdParamSchema,
  listSemestersQuerySchema,
  createSemesterSchema,
  updateSemesterSchema,
  updateSemesterStatusSchema
} from '../../validators/academicValidator.js';
import * as acadCtrl from '../../controllers/academicController.js';

const router = express.Router();

router.use(protect);

router.get('/', validateRequest({ query: listSemestersQuerySchema }), acadCtrl.getSemesters);
router.get('/:id', validateRequest({ params: academicIdParamSchema }), acadCtrl.getSemesterById);
router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest({ body: createSemesterSchema }),
  logAuditEvent('CREATE', 'Semester'),
  acadCtrl.createSemester
);
router.patch(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema, body: updateSemesterSchema }),
  logAuditEvent('UPDATE', 'Semester'),
  acadCtrl.updateSemester
);
router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema, body: updateSemesterStatusSchema }),
  logAuditEvent('UPDATE', 'Semester'),
  acadCtrl.updateSemesterStatus
);
router.delete(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema }),
  logAuditEvent('DELETE', 'Semester'),
  acadCtrl.deleteSemester
);

export default router;
