import mongoose from 'mongoose';

const assessmentMarkSchema = new mongoose.Schema(
  {
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InternalAssessment',
      required: [true, 'Assessment component reference is required'],
      index: true
    },
    examination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
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
      trim: true,
      index: true
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true
    },
    marksObtained: {
      type: Number,
      required: [true, 'Marks obtained value is required'],
      min: [0, 'Marks cannot be negative']
    },
    maxMarks: {
      type: Number,
      required: [true, 'Maximum marks reference is required'],
      min: [1, 'Maximum marks must be positive']
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    },
    entryStatus: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'FINALIZED'],
      default: 'SUBMITTED',
      uppercase: true,
      index: true
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastCorrectionReason: {
      type: String,
      trim: true,
      maxlength: 300
    }
  },
  { timestamps: true }
);

// Prevent duplicate marks for the same student and internal assessment component
assessmentMarkSchema.index({ assessment: 1, student: 1 }, { unique: true });
assessmentMarkSchema.index({ student: 1, subject: 1, semester: 1 });
assessmentMarkSchema.index({ faculty: 1, assessment: 1 });

export default mongoose.model('AssessmentMark', assessmentMarkSchema);
