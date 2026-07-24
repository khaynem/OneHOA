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

export async function sendRegistrationVerificationCode({ toEmail, code, expiresInMinutes }) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig || !toEmail) {
    console.warn("[EmailService] SMTP is not configured or email is missing. Verification code delivery skipped.");
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport(smtpConfig);
  const from = process.env.EMAIL_FROM || smtpConfig.auth.user;

  const subject = "OneHOA Homeowner Registration Verification Code";
  const text = `Your OneHOA email verification code is: ${code}\n\nThis code expires in ${expiresInMinutes} minutes. If you did not request this, please ignore this email.`;
  const html = [
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e8ed; border-radius: 8px;">',
    '  <div style="background-color: #003B75; color: #ffffff; padding: 16px; border-radius: 6px 6px 0 0; text-align: center;">',
    '    <h2 style="margin: 0; font-size: 20px;">OneHOA Email Verification</h2>',
    '  </div>',
    '  <div style="padding: 24px; color: #333333; line-height: 1.6;">',
    '    <p style="font-size: 16px;">Hello,</p>',
    '    <p style="font-size: 15px;">Your verification code for homeowner registration is:</p>',
    '    <div style="text-align: center; margin: 24px 0;">',
    '      <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0070C4; background: #f0f7ff; padding: 12px 24px; border-radius: 8px; border: 1px dashed #0070C4; display: inline-block;">' + code + '</span>',
    '    </div>',
    '    <p style="font-size: 14px; color: #64748b;">This code is valid for <strong>' + expiresInMinutes + ' minutes</strong>.</p>',
    '    <p style="font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 24px;">If you did not request this verification code, please ignore this email.</p>',
    '  </div>',
    '</div>',
  ].join("\n");

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
    console.error("[EmailService] Failed to send registration verification code:", err);
    return { delivered: false };
  }
}

export async function sendRegistrationSubmittedEmail({ toEmail, fullName }) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig || !toEmail) {
    console.warn("[EmailService] SMTP is not configured or email is missing. Registration submission notice skipped.");
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport(smtpConfig);
  const from = process.env.EMAIL_FROM || smtpConfig.auth.user;

  const subject = "OneHOA Homeowner Registration Received";
  const text = `Hello ${fullName || "Resident"},\n\nYour homeowner registration request has been successfully submitted to Fiesta Community Hanjin Village Association (FVHOA).\n\nYour application is now pending verification by HOA officers. We will notify you once your registration is reviewed.\n\nThank you!\nOneHOA Board of Officers`;
  const html = [
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e8ed; border-radius: 8px;">',
    '  <div style="background-color: #003B75; color: #ffffff; padding: 16px; border-radius: 6px 6px 0 0; text-align: center;">',
    '    <h2 style="margin: 0; font-size: 20px;">Registration Submitted Successfully</h2>',
    '  </div>',
    '  <div style="padding: 24px; color: #333333; line-height: 1.6;">',
    '    <p style="font-size: 16px;">Hello ' + (fullName || "Resident") + ',</p>',
    '    <p style="font-size: 15px;">Your homeowner registration request has been successfully submitted to <strong>Fiesta Community Hanjin Village Association (FVHOA)</strong>.</p>',
    '    <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border-left: 4px solid #0070C4; border-radius: 4px;">',
    '      <p style="margin: 0; font-weight: bold; color: #003B75;">Next Step: Officer Verification</p>',
    '      <p style="margin: 6px 0 0 0; font-size: 14px; color: #475569;">The HOA officers will review your residency details and uploaded documents. You will receive an update once your registration is verified and processed.</p>',
    '    </div>',
    '    <p style="font-size: 14px; color: #64748b;">Thank you for registering with OneHOA!</p>',
    '    <p style="margin-top: 24px; font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">OneHOA Board of Officers</p>',
    '  </div>',
    '</div>',
  ].join("\n");

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
    console.error("[EmailService] Failed to send registration submission email:", err);
    return { delivered: false };
  }
}


export async function sendAccountActivationEmail({ toEmail, fullName, activationCode, activationUrl, expiresInHours = 72 }) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig || !toEmail) {
    console.warn("[EmailService] SMTP is not configured or email is missing. Account activation email delivery skipped.");
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport(smtpConfig);
  const from = process.env.EMAIL_FROM || smtpConfig.auth.user;

  const subject = "Welcome to OneHOA - Activate Your Homeowner Account";
  const text = `Hello ${fullName || "Homeowner"},\n\n` +
    `Congratulations! Your homeowner registration request for Fiesta Community Hanjin Village has been approved by the HOA Officers.\n\n` +
    `To activate your account and set up your password, please click the link below or enter your activation code on the activation page:\n\n` +
    `Activation Link: ${activationUrl}\n` +
    `Activation Code: ${activationCode}\n\n` +
    `This activation link and code will expire in ${expiresInHours} hours.\n\n` +
    `Thank you!\nOneHOA Board of Officers`;

  const html = [
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e8ed; border-radius: 12px; background-color: #ffffff;">',
    '  <div style="background: linear-gradient(135deg, #003B75 0%, #0070C4 100%); color: #ffffff; padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">',
    '    <h2 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">Welcome to OneHOA!</h2>',
    '    <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Fiesta Community Hanjin Village Association</p>',
    '  </div>',
    '  <div style="padding: 28px; color: #1e293b; line-height: 1.6;">',
    '    <p style="font-size: 16px; font-weight: 600; margin-top: 0;">Hello ' + (fullName || "Homeowner") + ',</p>',
    '    <p style="font-size: 15px; color: #334155;">Great news! Your homeowner registration has been officially <strong>approved</strong> by the HOA Officers.</p>',
    '    <p style="font-size: 15px; color: #334155;">Please set up your personal password to activate your homeowner account and access OneHOA services.</p>',
    '    <div style="text-align: center; margin: 30px 0;">',
    '      <a href="' + activationUrl + '" style="background-color: #0070C4; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 16px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 112, 196, 0.25);">',
    '        Set Account Password & Activate',
    '      </a>',
    '    </div>',
    '    <div style="background-color: #f8fafc; border: 1px dashed #0070C4; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">',
    '      <span style="font-size: 13px; color: #64748b; display: block; margin-bottom: 6px;">Your 6-Digit Activation Code:</span>',
    '      <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #003B75;">' + activationCode + '</span>',
    '    </div>',
    '    <p style="font-size: 13px; color: #64748b;">This activation link and code will expire in <strong>' + expiresInHours + ' hours</strong>.</p>',
    '    <p style="font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">If you did not submit this registration, please contact the HOA administration immediately.</p>',
    '  </div>',
    '</div>',
  ].join("\n");

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
    console.error("[EmailService] Failed to send account activation email:", err);
    return { delivered: false };
  }
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

