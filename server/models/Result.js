import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema(
  {
    examination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true
    },
    internalMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 50,
      default: 0
    },
    externalMarks: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C', 'D', 'P', 'F'],
      required: true,
      uppercase: true
    },
    gradePoints: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    remarks: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

// Unique index preventing duplicate marks for same student in same exam and subject
resultSchema.index({ examination: 1, student: 1, subject: 1 }, { unique: true });
resultSchema.index({ student: 1, examination: 1 });

export default mongoose.model('Result', resultSchema);
