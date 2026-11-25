import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
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
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: true,
      index: true
    },
    section: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'A'
    },
    academicYear: {
      type: String,
      trim: true,
      index: true
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      index: true
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
      required: true,
      default: 'PRESENT',
      uppercase: true,
      index: true
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    },
    lastCorrectionReason: {
      type: String,
      trim: true,
      maxlength: 300
    }
  },
  { timestamps: true }
);

// Session-scoped unique constraint (permits multiple sessions on the same date)
attendanceSchema.index(
  { session: 1, student: 1 },
  { unique: true, partialFilterExpression: { session: { $type: 'objectId' } } }
);
attendanceSchema.index({ subject: 1, date: -1 });
attendanceSchema.index({ student: 1, status: 1 });
attendanceSchema.index({ faculty: 1, date: -1 });
attendanceSchema.index({ course: 1, semester: 1, academicYear: 1 });

export default mongoose.model('Attendance', attendanceSchema);
