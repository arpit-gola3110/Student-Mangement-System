import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: true,
      index: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    section: {
      type: String,
      required: true,
      default: 'A',
      uppercase: true,
      trim: true
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'DROPPED', 'CANCELLED'],
      default: 'ACTIVE',
      uppercase: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    statusUpdatedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Partial unique index: prevent duplicate ACTIVE enrollment for the same student-subject-semester-year
// while preserving historical DROPPED/CANCELLED/COMPLETED enrollment records.
enrollmentSchema.index(
  { student: 1, subject: 1, semester: 1, academicYear: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);
enrollmentSchema.index({ student: 1, status: 1 });
enrollmentSchema.index({ subject: 1, semester: 1, status: 1 });
enrollmentSchema.index({ course: 1, semester: 1 });
enrollmentSchema.index({ semester: 1, section: 1 });

export default mongoose.model('Enrollment', enrollmentSchema);
