const nodemailer = require('nodemailer');

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
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

async function sendPasswordResetCode({ toEmail, code, expiresInMinutes }) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    console.warn('[EmailService] SMTP is not configured. Reset code delivery skipped.');
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport(smtpConfig);
  const from = process.env.EMAIL_FROM || smtpConfig.auth.user;

  const subject = 'OneHOA Password Reset Code';
  const text = `Your OneHOA password reset code is: ${code}\n\nThis code expires in ${expiresInMinutes} minutes.`;
  const html = [
    '<p>Your OneHOA password reset code is:</p>',
    `<h2 style="letter-spacing:2px;">${code}</h2>`,
    `<p>This code expires in ${expiresInMinutes} minutes.</p>`,
  ].join('');

  await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    text,
    html,
  });

  return { delivered: true };
}

module.exports = {
  sendPasswordResetCode,
};
