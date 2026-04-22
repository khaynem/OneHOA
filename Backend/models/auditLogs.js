const mongoose = require('mongoose');

const auditLogsSchema = new mongoose.Schema(
  {
    actor_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actor_email: {
      type: String,
      trim: true,
      default: '',
    },
    actor_role: {
      type: String,
      trim: true,
      required: true,
      default: 'officer',
    },
    action: {
      type: String,
      trim: true,
      required: true,
    },
    method: {
      type: String,
      trim: true,
      required: true,
    },
    path: {
      type: String,
      trim: true,
      required: true,
    },
    status_code: {
      type: Number,
      required: true,
    },
    entity: {
      type: String,
      trim: true,
      default: '',
    },
    entity_id: {
      type: String,
      trim: true,
      default: '',
    },
    summary: {
      type: String,
      trim: true,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'audit_logs',
  }
);

auditLogsSchema.index({ actor_user_id: 1, createdAt: -1 });
auditLogsSchema.index({ actor_role: 1, createdAt: -1 });
auditLogsSchema.index({ entity: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogsSchema);
