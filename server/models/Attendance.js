import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
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
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true
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
      uppercase: true
    },
    remarks: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

// Strict unique index: one attendance status per student per subject per date per semester
attendanceSchema.index({ student: 1, subject: 1, date: 1, semester: 1 }, { unique: true });
attendanceSchema.index({ subject: 1, date: 1 });
attendanceSchema.index({ student: 1, status: 1 });

export default mongoose.model('Attendance', attendanceSchema);
