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
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('Subject', subjectSchema);
