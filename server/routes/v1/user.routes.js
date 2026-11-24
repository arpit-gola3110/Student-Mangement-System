import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import {
  userIdParamSchema,
  listUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema
} from '../../validators/userValidator.js';
import * as userCtrl from '../../controllers/userController.js';

const router = express.Router();

// All User Management operations are strictly restricted to ADMIN
router.use(protect, authorizeRoles('admin'));

router.get('/', validateRequest({ query: listUsersQuerySchema }), userCtrl.getUsers);
router.get('/:id', validateRequest({ params: userIdParamSchema }), userCtrl.getUserById);
router.post(
  '/',
  validateRequest({ body: createUserSchema }),
  logAuditEvent('CREATE', 'User'),
  userCtrl.createUser
);
router.patch(
  '/:id',
  validateRequest({ params: userIdParamSchema, body: updateUserSchema }),
  logAuditEvent('UPDATE', 'User'),
  userCtrl.updateUser
);
router.patch(
  '/:id/status',
  validateRequest({ params: userIdParamSchema, body: updateUserStatusSchema }),
  logAuditEvent('UPDATE', 'User'),
  userCtrl.updateUserStatus
);

export default router;
