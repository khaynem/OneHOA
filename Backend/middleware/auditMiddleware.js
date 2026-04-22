const AuditLog = require('../models/auditLogs');
const Notification = require('../models/notifications');
const User = require('../models/users');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const IGNORED_PATH_PREFIXES = [
  '/api/health',
  '/api/notifications',
  '/api/audit-logs',
];

function shouldIgnorePath(pathname) {
  return IGNORED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function extractEntityAndId(pathname) {
  const cleaned = String(pathname || '').split('?')[0];
  const parts = cleaned.split('/').filter(Boolean);

  const apiIndex = parts.indexOf('api');
  const entity = apiIndex >= 0 ? parts[apiIndex + 1] || '' : parts[0] || '';
  const entityId = apiIndex >= 0 ? parts[apiIndex + 2] || '' : parts[1] || '';

  return {
    entity,
    entityId,
  };
}

function actionFromMethod(method) {
  const normalized = String(method || '').toUpperCase();

  if (normalized === 'POST') return 'created';
  if (normalized === 'PUT' || normalized === 'PATCH') return 'updated';
  if (normalized === 'DELETE') return 'deleted';

  return 'changed';
}

async function createPresidentNotifications({ auditLogId, actorEmail, action, entity }) {
  const presidents = await User.find({ role: 'president', status: 'active' }).select('_id').lean();
  if (!presidents.length) {
    return;
  }

  const title = 'Officer Activity Update';
  const message = `Officer ${actorEmail || 'account'} ${action} ${entity || 'a resource'}.`;

  const payload = presidents.map((president) => ({
    recipient_user_id: president._id,
    audit_log_id: auditLogId,
    title,
    message,
  }));

  await Notification.insertMany(payload, { ordered: false });
}

function auditOfficerActivity() {
  return (req, res, next) => {
    const method = String(req.method || '').toUpperCase();
    const path = String(req.originalUrl || req.path || '');
    const pathWithoutQuery = path.split('?')[0];

    const shouldTrackRequest = MUTATING_METHODS.has(method)
      && pathWithoutQuery.startsWith('/api/')
      && !shouldIgnorePath(pathWithoutQuery);

    if (!shouldTrackRequest) {
      return next();
    }

    res.on('finish', () => {
      const user = req.user || null;
      if (!user || String(user.role).toLowerCase() !== 'officer') {
        return;
      }

      const statusCode = Number(res.statusCode || 0);
      if (statusCode >= 400) {
        return;
      }

      const { entity, entityId } = extractEntityAndId(pathWithoutQuery);
      const action = actionFromMethod(method);
      const summary = `Officer ${user.email || user.id} ${action} ${entity || 'resource'} via ${method} ${pathWithoutQuery}`;

      const metadata = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
      };

      AuditLog.create({
        actor_user_id: user.id,
        actor_email: user.email || '',
        actor_role: user.role,
        action,
        method,
        path: pathWithoutQuery,
        status_code: statusCode,
        entity,
        entity_id: entityId,
        summary,
        metadata,
      })
        .then((auditLog) => createPresidentNotifications({
          auditLogId: auditLog._id,
          actorEmail: user.email || '',
          action,
          entity,
        }))
        .catch((error) => {
          console.error('Failed to write officer audit log or notifications:', error.message);
        });
    });

    return next();
  };
}

module.exports = {
  auditOfficerActivity,
};
