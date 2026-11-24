import mongoose from 'mongoose';

const facultyAssignmentSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
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
    section: {
      type: String,
      required: true,
      uppercase: true,
      default: 'A'
    },
    academicYear: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'REVOKED'],
      default: 'ACTIVE',
      uppercase: true
    }
  },
  { timestamps: true }
);

// Compound unique index preventing duplicate faculty allocation
facultyAssignmentSchema.index({ faculty: 1, subject: 1, semester: 1, section: 1, academicYear: 1 }, { unique: true });
facultyAssignmentSchema.index({ subject: 1, section: 1, academicYear: 1 });

export default mongoose.model('FacultyAssignment', facultyAssignmentSchema);
