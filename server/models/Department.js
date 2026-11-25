import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true
    },
    headOfDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty'
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

departmentSchema.index({ isActive: 1, name: 1 });

export default mongoose.model('Department', departmentSchema);
