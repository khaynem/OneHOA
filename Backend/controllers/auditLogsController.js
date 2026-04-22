const AuditLog = require('../models/auditLogs');

const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const search = String(req.query.search || '').trim();
    const actorRole = String(req.query.actor_role || '').trim().toLowerCase();

    const filter = {};

    if (search) {
      filter.$or = [
        { actor_email: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { path: { $regex: search, $options: 'i' } },
      ];
    }

    if (actorRole) {
      filter.actor_role = actorRole;
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor_user_id', '_id email role first_name last_name'),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch audit logs' });
  }
};

module.exports = {
  getAuditLogs,
};
