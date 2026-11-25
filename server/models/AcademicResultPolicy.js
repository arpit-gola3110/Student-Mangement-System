import mongoose from 'mongoose';

export const DEFAULT_GRADE_BOUNDARIES = [
  { grade: 'A+', gradePoints: 10, minPercentage: 90, maxPercentage: 100, description: 'Outstanding', isPassing: true },
  { grade: 'A', gradePoints: 9, minPercentage: 80, maxPercentage: 89.9999, description: 'Excellent', isPassing: true },
  { grade: 'B+', gradePoints: 8, minPercentage: 70, maxPercentage: 79.9999, description: 'Very Good', isPassing: true },
  { grade: 'B', gradePoints: 7, minPercentage: 65, maxPercentage: 69.9999, description: 'Good', isPassing: true },
  { grade: 'C', gradePoints: 6, minPercentage: 55, maxPercentage: 64.9999, description: 'Above Average', isPassing: true },
  { grade: 'D', gradePoints: 5, minPercentage: 50, maxPercentage: 54.9999, description: 'Average', isPassing: true },
  { grade: 'P', gradePoints: 4, minPercentage: 40, maxPercentage: 49.9999, description: 'Pass', isPassing: true },
  { grade: 'F', gradePoints: 0, minPercentage: 0, maxPercentage: 39.9999, description: 'Fail', isPassing: false }
];

const gradeBoundarySchema = new mongoose.Schema(
  {
    grade: { type: String, required: true, trim: true, uppercase: true },
    gradePoints: { type: Number, required: true, min: 0, max: 10 },
    minPercentage: { type: Number, required: true, min: 0, max: 100 },
    maxPercentage: { type: Number, required: true, min: 0, max: 100 },
    description: { type: String, trim: true, default: '' },
    isPassing: { type: Boolean, default: true }
  },
  { _id: false }
);

const academicResultPolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Policy name is required'],
      trim: true,
      maxlength: 140
    },
    code: {
      type: String,
      required: [true, 'Policy code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    academicYear: {
      type: String,
      trim: true,
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
    evaluationMode: {
      type: String,
      enum: ['COMBINED', 'INTERNAL_ONLY', 'EXTERNAL_ONLY'],
      default: 'COMBINED',
      uppercase: true
    },
    useSubjectMaxMarks: {
      type: Boolean,
      default: true
    },
    internalMaxMarks: {
      type: Number,
      min: 0,
      max: 500,
      default: 30
    },
    externalMaxMarks: {
      type: Number,
      min: 0,
      max: 500,
      default: 70
    },
    internalWeightage: {
      type: Number,
      min: 0,
      max: 10,
      default: 1
    },
    externalWeightage: {
      type: Number,
      min: 0,
      max: 10,
      default: 1
    },
    totalMaxMarks: {
      type: Number,
      min: 1,
      max: 1000,
      default: 100
    },
    // Provisional passing thresholds requiring institutional confirmation unless overridden by admin
    minInternalPassPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    minExternalPassPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 30
    },
    minTotalPassPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 40
    },
    roundingPolicy: {
      type: String,
      enum: ['DECIMAL_2', 'HALF_UP_INT', 'CEIL_INT'],
      default: 'DECIMAL_2',
      uppercase: true
    },
    requireAllInternalAssessments: {
      type: Boolean,
      default: false
    },
    sgpaEnabled: {
      type: Boolean,
      default: true
    },
    cgpaEnabled: {
      type: Boolean,
      default: false
    },
    gradeBoundaries: {
      type: [gradeBoundarySchema],
      default: () => DEFAULT_GRADE_BOUNDARIES
    },
    isProvisional: {
      type: Boolean,
      default: true
    },
    policyVersion: {
      type: Number,
      default: 1,
      min: 1
    },
    effectiveDate: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

academicResultPolicySchema.index({ academicYear: 1, course: 1, semester: 1, isActive: 1 });

export default mongoose.model('AcademicResultPolicy', academicResultPolicySchema);
