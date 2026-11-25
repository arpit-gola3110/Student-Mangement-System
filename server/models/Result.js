import mongoose from 'mongoose';

const revisionEntrySchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    internalMarks: { type: Number },
    externalMarks: { type: Number },
    totalMarks: { type: Number },
    maxMarks: { type: Number },
    percentage: { type: Number },
    grade: { type: String },
    gradePoints: { type: Number },
    resultStatus: { type: String },
    calculationStatus: { type: String },
    publicationStatus: { type: String },
    reason: { type: String, trim: true },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    modifiedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const sourceAssessmentSnapshotSchema = new mongoose.Schema(
  {
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'InternalAssessment' },
    markId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentMark' },
    name: { type: String },
    obtained: { type: Number },
    maxMarks: { type: Number }
  },
  { _id: false }
);

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
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      index: true
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      index: true
    },
    academicYear: {
      type: String,
      trim: true,
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
      ref: 'Faculty'
    },
    internalMarks: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    externalMarks: {
      type: Number,
      min: 0,
      default: 0
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0
    },
    internalMaxMarks: {
      type: Number,
      min: 0,
      default: 30
    },
    externalMaxMarks: {
      type: Number,
      min: 0,
      default: 70
    },
    maxMarks: {
      type: Number,
      min: 1,
      default: 100
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C', 'D', 'P', 'F', 'AB', 'IC', 'WH'],
      required: true,
      uppercase: true
    },
    gradePoints: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    internalPass: {
      type: Boolean,
      default: true
    },
    externalPass: {
      type: Boolean,
      default: true
    },
    attendanceState: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'WITHHELD'],
      default: 'PRESENT',
      uppercase: true
    },
    resultStatus: {
      type: String,
      enum: ['PASS', 'FAIL', 'ABSENT', 'INCOMPLETE', 'WITHHELD'],
      default: 'PASS',
      uppercase: true,
      index: true
    },
    calculationStatus: {
      type: String,
      enum: ['PENDING', 'CALCULATED', 'REQUIRES_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'CALCULATED',
      uppercase: true,
      index: true
    },
    publicationStatus: {
      type: String,
      enum: ['UNPUBLISHED', 'PUBLISHED', 'WITHDRAWN'],
      default: 'UNPUBLISHED',
      uppercase: true,
      index: true
    },
    validationWarnings: {
      type: [String],
      default: []
    },
    sourceAssessmentMarks: {
      type: [sourceAssessmentSnapshotSchema],
      default: []
    },
    policy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicResultPolicy'
    },
    policySnapshot: {
      type: mongoose.Schema.Types.Mixed
    },
    calculationVersion: {
      type: Number,
      default: 1,
      min: 1
    },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: {
      type: Date
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    publishedAt: {
      type: Date
    },
    withdrawnBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    withdrawnAt: {
      type: Date
    },
    withdrawalReason: {
      type: String,
      trim: true
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    revisionHistory: {
      type: [revisionEntrySchema],
      default: []
    }
  },
  { timestamps: true }
);

// Auto-backfill course/semester/academicYear when omitted by internal/legacy callers
resultSchema.pre('validate', async function (next) {
  if ((!this.course || !this.semester || !this.academicYear) && this.examination) {
    try {
      const exam = await mongoose
        .model('Examination')
        .findById(this.examination)
        .select('course semester academicYear')
        .lean();
      if (exam) {
        if (!this.course && exam.course) this.course = exam.course;
        if (!this.semester && exam.semester) this.semester = exam.semester;
        if (!this.academicYear && exam.academicYear) this.academicYear = exam.academicYear;
      }
    } catch {
      // Allow validation to handle invalid reference
    }
  }
  if (!this.course && this.subject) {
    try {
      const sub = await mongoose.model('Subject').findById(this.subject).select('course semester').lean();
      if (sub) {
        if (!this.course && sub.course) this.course = sub.course;
        if (!this.semester && sub.semester) this.semester = sub.semester;
      }
    } catch {
      // Ignore
    }
  }
  next();
});

// Unique index preventing duplicate results for same student in same exam and subject
resultSchema.index({ examination: 1, student: 1, subject: 1 }, { unique: true });
resultSchema.index({ student: 1, examination: 1 });
resultSchema.index({ course: 1, semester: 1, academicYear: 1, publicationStatus: 1 });
resultSchema.index({ calculationStatus: 1, publicationStatus: 1 });

export default mongoose.model('Result', resultSchema);
