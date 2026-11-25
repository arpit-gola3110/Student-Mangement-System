import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester reference is required'],
      index: true
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: 1,
      max: 6,
      default: 3
    },
    type: {
      type: String,
      enum: ['THEORY', 'PRACTICAL', 'ELECTIVE', 'PROJECT'],
      default: 'THEORY',
      uppercase: true
    },
    maxInternalMarks: {
      type: Number,
      min: 0,
      max: 50,
      default: 30
    },
    maxExternalMarks: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

subjectSchema.index({ course: 1, semester: 1, isActive: 1 });

subjectSchema.virtual('totalMaxMarks').get(function () {
  return (this.maxInternalMarks ?? 30) + (this.maxExternalMarks ?? 70);
});

export default mongoose.model('Subject', subjectSchema);
