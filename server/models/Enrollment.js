import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: true
    },
    academicYear: {
      type: String,
      required: true // e.g. '2026-2027'
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
      default: 'ENROLLED'
    }
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, semester: 1, academicYear: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);
