import mongoose from 'mongoose';

const attendanceSessionSchema = new mongoose.Schema(
  {
    facultyAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultyAssignment',
      required: [true, 'Faculty assignment reference is required'],
      index: true
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Faculty reference is required'],
      index: true
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
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
      index: true
    },
    section: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      default: 'A'
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
      index: true
    },
    // Canonical local calendar date (YYYY-MM-DD, Asia/Kolkata) prevents timezone boundary drift
    sessionDate: {
      type: String,
      required: [true, 'Session date (YYYY-MM-DD) is required'],
      trim: true,
      index: true
    },
    dateObj: {
      type: Date,
      required: true,
      index: true
    },
    sessionNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      default: 1
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
    topic: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    status: {
      type: String,
      enum: ['OPEN', 'FINALIZED', 'CANCELLED'],
      uppercase: true,
      default: 'OPEN',
      index: true
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
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    finalizedAt: {
      type: Date
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: {
      type: Date
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

// Guarantees unique class session per subject/semester/section/academicYear/date/sessionNumber
// while supporting multiple distinct lecture/lab sessions on the same date.
attendanceSessionSchema.index(
  { subject: 1, semester: 1, section: 1, academicYear: 1, sessionDate: 1, sessionNumber: 1 },
  { unique: true }
);
attendanceSessionSchema.index({ faculty: 1, sessionDate: -1, status: 1 });
attendanceSessionSchema.index({ course: 1, semester: 1, academicYear: 1, status: 1 });

export default mongoose.model('AttendanceSession', attendanceSessionSchema);
