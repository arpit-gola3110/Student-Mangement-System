import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actorRole: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
    },
    entity: {
      type: String,
      required: true // 'Student', 'Attendance', etc.
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    },
    ipAddress: {
      type: String,
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

auditLogSchema.index({ timestamp: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
