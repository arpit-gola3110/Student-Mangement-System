import mongoose from 'mongoose';

const facultyAssignmentSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: true
    },
    section: {
      type: String,
      required: true,
      uppercase: true,
      default: 'A'
    },
    academicYear: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'REVOKED'],
      default: 'ACTIVE'
    }
  },
  { timestamps: true }
);

facultyAssignmentSchema.index({ faculty: 1, subject: 1, semester: 1, section: 1, academicYear: 1 }, { unique: true });

export default mongoose.model('FacultyAssignment', facultyAssignmentSchema);
