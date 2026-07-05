import nodemailer from "nodemailer";
import Record from "../models/records";
import { connectToDatabase } from "../db";

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

export async function broadcastAnnouncementEmail(announcement) {
  try {
    await connectToDatabase();

    const records = await Record.find({
      email: { $ne: null, $exists: true },
      archived: { $ne: true },
    })
      .select("email first_name last_name")
      .lean();

    const emails = [
      ...new Set(
        records
          .map((r) => String(r.email || "").trim().toLowerCase())
          .filter((e) => e && e.includes("@"))
      ),
    ];

    if (emails.length === 0) {
      console.log("[EmailService] No registered homeowner emails found for broadcast.");
      return { delivered: false, recipientCount: 0 };
    }

    const smtpConfig = getSmtpConfig();
    if (!smtpConfig) {
      console.warn("[EmailService] SMTP is not configured. Announcement broadcast skipped.");
      return { delivered: false, recipientCount: emails.length };
    }

    const transporter = nodemailer.createTransport(smtpConfig);
    const from = process.env.EMAIL_FROM || smtpConfig.auth.user;

    const eventDateStr = announcement.date
      ? new Date(announcement.date).toLocaleDateString("en-PH", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

    const announcementTitle = String(announcement.title || "");
    const announcementContent = String(announcement.content || "");

    const subject = "OneHOA Announcement: " + announcementTitle;

    const textParts = [
      "Hello Hanjin Village Resident,",
      "",
      "We have a new community announcement:",
      "",
      "Title: " + announcementTitle,
      "",
      "Details:",
      announcementContent,
      "",
    ];
    if (eventDateStr) {
      textParts.push("Event Date: " + eventDateStr);
      textParts.push("");
    }
    textParts.push("Thank you!");
    textParts.push("OneHOA Board of Officers");
    const text = textParts.join("\n");

    let eventDateBlock = "";
    if (eventDateStr) {
      eventDateBlock = [
        '<div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #4f46e5; border-radius: 4px;">',
        "  <strong>Event Date:</strong> " + eventDateStr,
        "</div>",
      ].join("");
    }

    const html = [
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e8ed; border-radius: 8px; background-color: #ffffff;">',
      '  <div style="background-color: #4f46e5; color: #ffffff; padding: 20px; border-radius: 6px 6px 0 0; text-align: center;">',
      '    <h2 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">OneHOA Announcement</h2>',
      '    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Fiesta Community Hanjin Village</p>',
      "  </div>",
      '  <div style="padding: 24px; color: #333333; line-height: 1.6;">',
      '    <h3 style="color: #4f46e5; margin-top: 0; font-size: 20px; font-weight: bold; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">' + announcementTitle + "</h3>",
      '    <p style="font-size: 16px; white-space: pre-wrap;">' + announcementContent + "</p>",
      eventDateBlock,
      '    <p style="margin-top: 30px; font-size: 14px; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 15px;">',
      "      Posted by: OneHOA Board of Officers",
      "    </p>",
      "  </div>",
      "</div>",
    ].join("\n");

    const CHUNK_SIZE = 90;
    const chunks = [];
    for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
      chunks.push(emails.slice(i, i + CHUNK_SIZE));
    }

    console.log(
      "[EmailService] Broadcasting announcement to " +
        emails.length +
        " homeowners in " +
        chunks.length +
        " batches."
    );

    await Promise.all(
      chunks.map((chunk) =>
        transporter.sendMail({
          from,
          to: from,
          bcc: chunk,
          subject,
          text,
          html,
        })
      )
    );

    console.log("[EmailService] Announcement email broadcast completed successfully.");
    return { delivered: true, recipientCount: emails.length };
  } catch (error) {
    console.error("[EmailService] Failed to broadcast announcement email:", error);
    return { delivered: false, error: error.message };
  }
}

