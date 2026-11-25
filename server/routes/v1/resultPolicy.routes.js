import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as policyCtrl from '../../controllers/resultPolicyController.js';
import {
  idParamSchema,
  createPolicySchema,
  updatePolicySchema,
  updatePolicyStatusSchema
} from '../../validators/resultValidator.js';

const router = express.Router();

router.use(protect);

router.get('/', authorizeRoles('admin', 'faculty'), policyCtrl.listPolicies);
router.get('/:id', authorizeRoles('admin', 'faculty'), validateRequest({ params: idParamSchema }), policyCtrl.getPolicyById);

router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest({ body: createPolicySchema }),
  logAuditEvent('CREATE', 'RESULT_POLICY'),
  policyCtrl.createPolicy
);

router.patch(
  '/:id',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema, body: updatePolicySchema }),
  logAuditEvent('UPDATE', 'RESULT_POLICY'),
  policyCtrl.updatePolicy
);

router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateRequest({ params: idParamSchema, body: updatePolicyStatusSchema }),
  logAuditEvent('OVERRIDE', 'RESULT_POLICY'),
  policyCtrl.updatePolicyStatus
);

export default router;
