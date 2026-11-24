import express from 'express';
import { protect } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/rbacMiddleware.js';
import { logAuditEvent } from '../../middleware/auditMiddleware.js';
import * as noticeCtrl from '../../controllers/announcementController.js';

const router = express.Router();

router.get('/', protect, noticeCtrl.getAnnouncements);
router.post('/', protect, authorizeRoles('admin', 'faculty'), logAuditEvent('CREATE', 'Announcement'), noticeCtrl.createAnnouncement);
router.delete('/:id', protect, authorizeRoles('admin'), noticeCtrl.deleteAnnouncement);

export default router;
