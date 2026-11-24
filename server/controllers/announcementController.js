import Announcement from '../models/Announcement.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const getAnnouncements = async (req, res, next) => {
  try {
    const role = (req.user.role || '').toLowerCase();
    const query = {
      $or: [
        { targetAudience: 'ALL' },
        { targetAudience: role === 'student' ? 'STUDENTS' : 'FACULTY' }
      ]
    };

    const announcements = await Announcement.find(query).populate('author', 'email').sort({ isPinned: -1, createdAt: -1 });
    return sendSuccess(res, 'Announcements retrieved', announcements);
  } catch (err) { next(err); }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, targetAudience, targetDepartment, isPinned } = req.body;
    const notice = await Announcement.create({
      title,
      content,
      author: req.user.userId,
      targetAudience: targetAudience || 'ALL',
      targetDepartment: targetDepartment || null,
      isPinned: Boolean(isPinned)
    });
    return sendSuccess(res, 'Announcement published', notice, null, 201);
  } catch (err) { next(err); }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    return sendSuccess(res, 'Announcement deleted');
  } catch (err) { next(err); }
};
