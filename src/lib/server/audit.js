import AuditLog from "./models/auditLogs";
import Notification from "./models/notifications";
import User from "./models/users";

const IGNORED_PATH_PREFIXES = ["/api/health", "/api/audit-logs"];

function shouldIgnorePath(pathname, method) {
  const normalizedPath = String(pathname || "");
  const normalizedMethod = String(method || "").toUpperCase();

  if (IGNORED_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    return true;
  }

  // Ignore reading notifications (GET) but allow marking them read (PATCH/POST)
  if (normalizedPath.startsWith("/api/notifications") && normalizedMethod === "GET") {
    return true;
  }

  return false;
}

function actionFromMethod(method) {
  const normalized = String(method || "").toUpperCase();

  if (normalized === "POST") return "created";
  if (normalized === "PUT" || normalized === "PATCH") return "updated";
  if (normalized === "DELETE") return "deleted";

  return "changed";
}

function actionFromAuthPath(pathname) {
  const normalized = String(pathname || "");

  if (normalized.endsWith("/login")) {
    return "logged in";
  }

  if (normalized.endsWith("/logout")) {
    return "logged out";
  }

  return "";
}

export function getHumanReadableMessage({ actorRole, actorName, action, entity, detailSummary, method, path }) {
  const roleLabels = {
    admin: "Super Admin",
    president: "HOA President",
    officer: "Officer",
  };
  const roleDisplay = roleLabels[String(actorRole).toLowerCase()] || "User";
  const actor = actorName ? `${roleDisplay} ${actorName}` : roleDisplay;

  if (detailSummary) {
    let cleanDetail = String(detailSummary).trim();
    const verbs = ["created", "updated", "deleted", "recorded", "approved", "rejected", "uploaded", "changed"];
    const words = cleanDetail.split(/\s+/);
    if (words.length > 0) {
      const firstWord = words[0].toLowerCase();
      if (verbs.includes(firstWord)) {
        cleanDetail = firstWord + " " + words.slice(1).join(" ");
      }
    }
    if (cleanDetail.endsWith(".")) {
      cleanDetail = cleanDetail.slice(0, -1);
    }
    return `${actor} ${cleanDetail}.`;
  }

  // Handle standard auth actions
  const normalizedAction = String(action || "").toLowerCase();
  if (normalizedAction === "logged in") {
    return `${actor} logged in.`;
  }
  if (normalizedAction === "logged out") {
    return `${actor} logged out.`;
  }

  const entityLabels = {
    users: "user accounts",
    records: "homeowner records",
    payments: "payment logs",
    "pending-registrations": "pending registrations",
    activities: "announcements",
    settings: "settings",
    analytics: "analytics",
    notifications: "notifications",
  };
  const entityDisplay = entityLabels[String(entity).toLowerCase()] || entity || "resource";

  const cleanPath = String(path || "");
  if (cleanPath.includes("/api/settings/dues")) {
    return `${actor} updated the monthly dues settings.`;
  }
  if (cleanPath.includes("/api/settings/registration-fields")) {
    return `${actor} updated the registration fields settings.`;
  }
  if (cleanPath.includes("/api/notifications/mark-all-read")) {
    return `${actor} marked all notifications as read.`;
  }
  if (cleanPath.includes("/api/notifications/") && cleanPath.endsWith("/read")) {
    return `${actor} marked a notification as read.`;
  }

  return `${actor} ${action} ${entityDisplay}.`;
}

async function createPresidentNotifications({ auditLogId, actorUserId, actorName, actorRole, action, entity, detailSummary, method, path }) {
  // Exclude the actor themselves from notification recipients
  const presidents = await User.find({
    role: "president",
    status: "active",
    _id: { $ne: actorUserId }
  }).select("_id").lean();

  if (!presidents.length) {
    return;
  }

  const title = "Officer Activity Update";
  const message = getHumanReadableMessage({
    actorRole,
    actorName,
    action,
    entity,
    detailSummary,
    method,
    path
  });

  const payload = presidents.map((president) => ({
    recipient_user_id: president._id,
    audit_log_id: auditLogId,
    title,
    message,
  }));

  await Notification.insertMany(payload, { ordered: false });
}

export async function writeAuditLog({
  request,
  user,
  statusCode,
  detailSummary,
  metadata,
}) {
  const method = String(request.method || "").toUpperCase();
  const path = String(request.nextUrl?.pathname || "");

  if (shouldIgnorePath(path, method)) {
    return;
  }

  if (!user) {
    return;
  }

  if (Number(statusCode || 0) >= 400) {
    return;
  }

  const action = actionFromAuthPath(path) || actionFromMethod(method);
  const pathParts = path.split("/").filter(Boolean);
  const apiIndex = pathParts.indexOf("api");
  const entity = apiIndex >= 0 ? pathParts[apiIndex + 1] || "" : pathParts[0] || "";
  const entityId = apiIndex >= 0 ? pathParts[apiIndex + 2] || "" : pathParts[1] || "";
  const actorName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || user.id;

  const summary = getHumanReadableMessage({
    actorRole: user.role,
    actorName,
    action,
    entity,
    detailSummary,
    method,
    path,
  });

  const auditMetadata = {
    ip: request.headers.get("x-forwarded-for") || "",
    userAgent: request.headers.get("user-agent") || "",
    ...(metadata ? { details: metadata } : {}),
  };

  const auditLog = await AuditLog.create({
    actor_user_id: user.id,
    actor_email: user.email || "",
    actor_role: user.role,
    action,
    method,
    path,
    status_code: statusCode,
    entity,
    entity_id: entityId,
    summary,
    metadata: auditMetadata,
  });

  await createPresidentNotifications({
    auditLogId: auditLog._id,
    actorUserId: user.id,
    actorName,
    actorRole: user.role,
    action,
    entity,
    detailSummary: detailSummary || "",
    method,
    path,
  });
}
