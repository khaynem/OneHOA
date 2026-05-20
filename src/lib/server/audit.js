import AuditLog from "./models/auditLogs";
import Notification from "./models/notifications";
import User from "./models/users";

const IGNORED_PATH_PREFIXES = ["/api/health", "/api/notifications", "/api/audit-logs"];

function shouldIgnorePath(pathname) {
  return IGNORED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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

function buildNotificationMessage({ actorName, action, entity, detailSummary }) {
  const normalizedAction = String(action || "").toLowerCase();
  const isAuthAction = normalizedAction === "logged in" || normalizedAction === "logged out";
  const baseMessage = isAuthAction
    ? `Officer ${actorName || "account"} ${action}.`
    : `Officer ${actorName || "account"} ${action} ${entity || "a resource"}.`;

  return detailSummary ? `${baseMessage} ${detailSummary}` : baseMessage;
}

async function createPresidentNotifications({ auditLogId, actorName, action, entity, detailSummary }) {
  const presidents = await User.find({ role: "president", status: "active" }).select("_id").lean();
  if (!presidents.length) {
    return;
  }

  const title = "Officer Activity Update";
  const message = buildNotificationMessage({ actorName, action, entity, detailSummary });

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

  if (shouldIgnorePath(path)) {
    return;
  }

  if (!user || String(user.role || "").toLowerCase() !== "officer") {
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
  const summary = action === "logged in" || action === "logged out"
    ? `Officer ${actorName} ${action}.`
    : detailSummary
      ? `Officer ${actorName} ${action} ${entity || "resource"} - ${detailSummary}`
      : `Officer ${actorName} ${action} ${entity || "resource"} via ${method} ${path}`;

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
    actorName,
    action,
    entity,
    detailSummary: detailSummary || "",
  });
}
