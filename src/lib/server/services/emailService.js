import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = process.env.SMTP_LOGIN;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  };
}

export async function sendPasswordResetCode({ toEmail, code, expiresInMinutes }) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    console.warn("[EmailService] SMTP is not configured. Reset code delivery skipped.");
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport(smtpConfig);
  const from = process.env.EMAIL_FROM || smtpConfig.auth.user;

  const subject = "OneHOA Password Reset Code";
  const text = `Your OneHOA password reset code is: ${code}\n\nThis code expires in ${expiresInMinutes} minutes.`;
  const html = [
    "<p>Your OneHOA password reset code is:</p>",
    `<h2 style=\"letter-spacing:2px;\">${code}</h2>`,
    `<p>This code expires in ${expiresInMinutes} minutes.</p>`,
  ].join("");

  await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    text,
    html,
  });

  return { delivered: true };
}

export async function sendRegistrationStatusEmail({ toEmail, status, fullName, declineReason }) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig || !toEmail) {
    console.warn("[EmailService] SMTP is not configured or email is missing. Registration status delivery skipped.");
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport(smtpConfig);
  const from = process.env.EMAIL_FROM || smtpConfig.auth.user;

  let subject = "";
  let html = "";
  let text = "";

  if (status === "approved") {
    subject = "OneHOA Registration Approved";
    text = `Hello ${fullName},\n\nYour registration request has been approved. You are now officially a part of OneHOA.\n\nThank you!`;
    html = [
      `<p>Hello ${fullName},</p>`,
      `<p>Your registration request has been <strong>approved</strong>. Your details have been recorded in the masterlist record of OneHOA.</p>`,
      `<p>Thank you!</p>`,
    ].join("");
  } else if (status === "declined") {
    subject = "OneHOA Registration Declined";
    text = `Hello ${fullName},\n\nYour registration request has been declined.\nReason: ${declineReason}\n\nPlease contact the administrator for more information.`;
    html = [
      `<p>Hello ${fullName},</p>`,
      `<p>Your registration request has been <strong>declined</strong>.</p>`,
      `<p><strong>Reason:</strong> ${declineReason}</p>`,
      `<p>Please contact the administrator for more information.</p>`,
    ].join("");
  }

  if (!subject) return { delivered: false };

  try {
    await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text,
      html,
    });
    return { delivered: true };
  } catch (err) {
    console.error("[EmailService] Failed to send registration status email:", err);
    return { delivered: false };
  }
}
