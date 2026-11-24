import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    targetAudience: {
      type: String,
      enum: ['ALL', 'FACULTY', 'STUDENTS', 'DEPARTMENT'],
      default: 'ALL'
    },
    targetDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    expiresAt: {
      type: Date
    },
    isPinned: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model('Announcement', announcementSchema);
