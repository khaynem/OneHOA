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

function actionFromAuthPath(pathname) {
  const normalized = String(pathname || '');

  if (normalized.endsWith('/login')) {
    return 'logged in';
  }

  if (normalized.endsWith('/logout')) {
    return 'logged out';
  }

  return '';
}

function buildNotificationMessage({ actorEmail, action, entity, detailSummary }) {
  const normalizedAction = String(action || '').toLowerCase();
  const isAuthAction = normalizedAction === 'logged in' || normalizedAction === 'logged out';
  const baseMessage = isAuthAction
    ? `Officer ${actorEmail || 'account'} ${action}.`
    : `Officer ${actorEmail || 'account'} ${action} ${entity || 'a resource'}.`;

  return detailSummary ? `${baseMessage} ${detailSummary}` : baseMessage;
}

async function createPresidentNotifications({ auditLogId, actorEmail, action, entity, detailSummary }) {
  const presidents = await User.find({ role: 'president', status: 'active' }).select('_id').lean();
  if (!presidents.length) {
    return;
  }

  const title = 'Officer Activity Update';
  const message = buildNotificationMessage({ actorEmail, action, entity, detailSummary });

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
      const authAction = actionFromAuthPath(pathWithoutQuery);
      const action = authAction || actionFromMethod(method);
      const detailSummary = res.locals && res.locals.auditDetails ? String(res.locals.auditDetails.summary || '') : '';
      const summary = authAction
        ? `Officer ${user.email || user.id} ${action}.`
        : detailSummary
          ? `Officer ${user.email || user.id} ${action} ${entity || 'resource'} - ${detailSummary}`
          : `Officer ${user.email || user.id} ${action} ${entity || 'resource'} via ${method} ${pathWithoutQuery}`;

      const metadata = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
      };

      if (res.locals && res.locals.auditDetails && res.locals.auditDetails.metadata) {
        metadata.details = res.locals.auditDetails.metadata;
      }

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
          detailSummary: detailSummary || '',
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
