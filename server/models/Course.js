import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      index: true
    },
    durationYears: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
      default: 4
    },
    totalSemesters: {
      type: Number,
      required: true,
      min: 1,
      max: 16,
      default: 8
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
  { timestamps: true }
);

courseSchema.index({ department: 1, isActive: 1 });

export default mongoose.model('Course', courseSchema);
