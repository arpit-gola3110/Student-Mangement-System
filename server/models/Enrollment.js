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
    academicYear: {
      type: String,
      required: true,
      trim: true
    },
    section: {
      type: String,
      required: true,
      default: 'A',
      uppercase: true
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['ENROLLED', 'PROMOTED', 'DETAINED', 'WITHDRAWN'],
      default: 'ENROLLED',
      uppercase: true
    }
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate enrollments
enrollmentSchema.index({ student: 1, semester: 1, academicYear: 1 }, { unique: true });
enrollmentSchema.index({ semester: 1, section: 1 });

export default mongoose.model('Enrollment', enrollmentSchema);
