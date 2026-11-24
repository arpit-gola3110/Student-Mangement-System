import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    enrollmentNumber: {
      type: String,
      required: [true, 'Enrollment number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      uppercase: true,
      required: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    currentSemester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
      default: 1
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED'],
      uppercase: true,
      default: 'ACTIVE'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for department and semester cohort queries
studentSchema.index({ department: 1, currentSemester: 1 });

// Full name virtual helper
studentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

export default mongoose.model('Student', studentSchema);
