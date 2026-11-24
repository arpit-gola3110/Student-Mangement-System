import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import * as resultCtrl from '../../controllers/resultController.js';

const router = express.Router();

router.get('/', protect, resultCtrl.getExaminations);
router.post('/', protect, authorizeRoles('admin'), resultCtrl.createExamination);

export default router;
