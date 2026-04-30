const mongoose = require('mongoose');
const Notification = require('../models/notifications');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { recipient_user_id: req.user.id };

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('audit_log_id'),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, read: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipient_user_id: req.user.id },
      { read: true, read_at: new Date() },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update notification' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient_user_id: req.user.id, read: false },
      { read: true, read_at: new Date() }
    );

    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update notifications' });
  }
};

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
