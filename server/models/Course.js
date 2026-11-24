import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required']
    },
    durationYears: {
      type: Number,
      required: true,
      default: 4
    },
    totalSemesters: {
      type: Number,
      required: true,
      default: 8
    }
  },
  { timestamps: true }
);

export default mongoose.model('Course', courseSchema);
