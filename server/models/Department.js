import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true
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
    }
  },
  { timestamps: true }
);

export default mongoose.model('Department', departmentSchema);
