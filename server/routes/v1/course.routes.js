import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import {
  academicIdParamSchema,
  listCoursesQuerySchema,
  createCourseSchema,
  updateCourseSchema,
  updateBooleanStatusSchema
} from '../../validators/academicValidator.js';
import * as acadCtrl from '../../controllers/academicController.js';

const router = express.Router();

router.use(protect);

router.get('/', validateRequest({ query: listCoursesQuerySchema }), acadCtrl.getCourses);
router.get('/:id', validateRequest({ params: academicIdParamSchema }), acadCtrl.getCourseById);
router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest({ body: createCourseSchema }),
  logAuditEvent('CREATE', 'Course'),
  acadCtrl.createCourse
);
router.patch(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema, body: updateCourseSchema }),
  logAuditEvent('UPDATE', 'Course'),
  acadCtrl.updateCourse
);
router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema, body: updateBooleanStatusSchema }),
  logAuditEvent('UPDATE', 'Course'),
  acadCtrl.updateCourseStatus
);
router.delete(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: academicIdParamSchema }),
  logAuditEvent('DELETE', 'Course'),
  acadCtrl.deleteCourse
);

export default router;
