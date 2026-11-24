import mongoose from 'mongoose';

const examinationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true
    },
    examType: {
      type: String,
      enum: ['SESSIONAL_1', 'SESSIONAL_2', 'PRE_UNIVERSITY', 'END_SEMESTER'],
      required: true,
      uppercase: true
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
      enum: ['UPCOMING', 'ONGOING', 'COMPLETED', 'PUBLISHED'],
      default: 'UPCOMING',
      uppercase: true
    }
  },
  { timestamps: true }
);

// Compound unique index ensuring one exam type per semester per academic year
examinationSchema.index({ semester: 1, examType: 1, academicYear: 1 }, { unique: true });

export default mongoose.model('Examination', examinationSchema);
