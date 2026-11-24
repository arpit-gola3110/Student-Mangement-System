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
      required: true,
      index: true
    },
    targetAudience: {
      type: String,
      enum: ['ALL', 'FACULTY', 'STUDENTS', 'DEPARTMENT'],
      default: 'ALL',
      uppercase: true
    },
    targetDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true
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

// Query indexes for feed retrieval
announcementSchema.index({ targetAudience: 1, createdAt: -1 });
announcementSchema.index({ expiresAt: 1 });

export default mongoose.model('Announcement', announcementSchema);
