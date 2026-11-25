import mongoose from 'mongoose';

const internalAssessmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Assessment component name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters']
    },
    componentType: {
      type: String,
      enum: ['CLASS_TEST', 'ASSIGNMENT', 'QUIZ', 'PRACTICAL', 'VIVA', 'PROJECT', 'OTHER'],
      required: true,
      uppercase: true,
      index: true
    },
    examination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
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
    maxMarks: {
      type: Number,
      required: [true, 'Maximum marks is required'],
      min: [1, 'Maximum marks must be at least 1'],
      max: [500, 'Maximum marks cannot exceed 500']
    },
    assessmentDate: {
      type: Date,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 600,
      default: ''
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'FINALIZED', 'PUBLISHED', 'CANCELLED'],
      default: 'ACTIVE',
      uppercase: true,
      index: true
    },
    isCancelled: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    finalizedAt: {
      type: Date
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    publishedAt: {
      type: Date
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reopenedAt: {
      type: Date
    },
    reopenReason: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

internalAssessmentSchema.pre('validate', function (next) {
  this.isCancelled = this.status === 'CANCELLED';
  next();
});

internalAssessmentSchema.index(
  { subject: 1, semester: 1, academicYear: 1, name: 1 },
  { unique: true, partialFilterExpression: { isCancelled: false } }
);
internalAssessmentSchema.index({ course: 1, semester: 1, subject: 1, status: 1 });

export default mongoose.model('InternalAssessment', internalAssessmentSchema);
