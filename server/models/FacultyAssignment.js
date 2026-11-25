import mongoose from 'mongoose';

const facultyAssignmentSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: true,
      index: true
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
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
      required: true,
      trim: true,
      index: true
    },
    assignmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'REVOKED'],
      default: 'ACTIVE',
      uppercase: true,
      index: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    statusUpdatedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Partial unique index preventing duplicate ACTIVE allocation for same faculty-subject-semester-section-year
facultyAssignmentSchema.index(
  { faculty: 1, subject: 1, semester: 1, section: 1, academicYear: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);
facultyAssignmentSchema.index({ faculty: 1, status: 1 });
facultyAssignmentSchema.index({ subject: 1, semester: 1, status: 1 });
facultyAssignmentSchema.index({ course: 1, semester: 1 });
facultyAssignmentSchema.index({ subject: 1, section: 1, academicYear: 1 });

// Auto-backfill course from subject when legacy internal callers omit course
facultyAssignmentSchema.pre('validate', async function (next) {
  if (!this.course && this.subject) {
    try {
      const sub = await mongoose.model('Subject').findById(this.subject).select('course').lean();
      if (sub?.course) this.course = sub.course;
    } catch {
      // Allow Mongoose required validator to report missing course if lookup fails
    }
  }
  next();
});

export default mongoose.model('FacultyAssignment', facultyAssignmentSchema);
