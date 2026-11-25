import mongoose from 'mongoose';

const examinationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    examType: {
      type: String,
      enum: [
        'INTERNAL_ASSESSMENT',
        'MID_TERM',
        'PRACTICAL',
        'EXTERNAL',
        'END_SEMESTER',
        'SESSIONAL_1',
        'SESSIONAL_2',
        'PRE_UNIVERSITY'
      ],
      required: true,
      uppercase: true,
      index: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
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
      index: true
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    examDate: {
      type: Date,
      index: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      trim: true,
      default: ''
    },
    endTime: {
      type: String,
      trim: true,
      default: ''
    },
    maxMarks: {
      type: Number,
      min: 1,
      max: 500,
      default: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'PUBLISHED', 'UPCOMING', 'ONGOING'],
      default: 'DRAFT',
      uppercase: true,
      index: true
    },
    isCancelled: {
      type: Boolean,
      default: false,
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
    publishedAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Auto-sync course from semester and startDate/endDate from examDate for compatibility
examinationSchema.pre('validate', async function (next) {
  if (!this.course && this.semester) {
    try {
      const semDoc = await mongoose.model('Semester').findById(this.semester).select('course').lean();
      if (semDoc?.course) this.course = semDoc.course;
    } catch {
      // Allow validation to handle missing/invalid refs
    }
  }
  if (this.examDate && !this.startDate) this.startDate = this.examDate;
  if (this.examDate && !this.endDate) this.endDate = this.examDate;
  if (!this.examDate && this.startDate) this.examDate = this.startDate;
  this.isCancelled = this.status === 'CANCELLED';
  next();
});

// Prevent duplicate active/non-cancelled examination configuration for same subject/semester/type/year
examinationSchema.index(
  { semester: 1, subject: 1, examType: 1, academicYear: 1, title: 1 },
  { unique: true, partialFilterExpression: { isCancelled: false } }
);
examinationSchema.index({ course: 1, semester: 1, academicYear: 1, status: 1 });

export default mongoose.model('Examination', examinationSchema);
