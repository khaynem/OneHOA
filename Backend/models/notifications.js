const mongoose = require('mongoose');

const notificationsSchema = new mongoose.Schema(
  {
    recipient_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    audit_log_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AuditLog',
      default: null,
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    read_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'notifications',
  }
);

notificationsSchema.index({ recipient_user_id: 1, read: 1, createdAt: -1 });
notificationsSchema.index({ audit_log_id: 1 });

module.exports = mongoose.model('Notification', notificationsSchema);
