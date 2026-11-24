import mongoose from 'mongoose';

const semesterSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true
    },
    semesterNumber: {
      type: Number,
      required: [true, 'Semester number is required'],
      min: 1,
      max: 10
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'], // e.g. '2026-2027'
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'ACTIVE', 'COMPLETED'],
      default: 'UPCOMING',
      uppercase: true
    }
  },
  { timestamps: true }
);

// Compound unique index ensuring one record per semester per academic year per course
semesterSchema.index({ course: 1, semesterNumber: 1, academicYear: 1 }, { unique: true });

export default mongoose.model('Semester', semesterSchema);
