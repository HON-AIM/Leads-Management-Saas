const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.email.user || !config.email.pass) return null;

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  return transporter;
}

function isEmailConfigured() {
  return !!(config.email.user && config.email.pass);
}

if (!isEmailConfigured()) {
  logger.warn('EMAIL_USER and/or EMAIL_PASS not set — team invite emails will fail until configured.');
}

async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) {
    throw new Error('Email is not configured. Set EMAIL_USER and EMAIL_PASS in your environment to enable invite emails.');
  }

  await transport.sendMail({
    from: `"LeadFlowX" <${config.email.from}>`,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  });

  logger.info('Email sent', { to, subject });
}

async function sendTeamInviteEmail(toEmail, toName, inviterName, tenantName, inviteLink, role) {
  const roleLabel = role === 'admin' ? 'Admin' : role === 'super_admin' ? 'Owner' : 'Member';
  const platformName = 'LeadFlowX';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f4f6fb;font-family:Inter,system-ui,-apple-system,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
              <tr>
                <td style="background:linear-gradient(135deg,#3b82f6,#06b6d4);padding:32px 40px;text-align:center;">
                  <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;">${platformName}</h1>
                  <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0;">${tenantName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px;">
                  <h2 style="color:#1e293b;font-size:18px;font-weight:600;margin:0 0 12px;">You've been invited to join ${tenantName}</h2>
                  <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 28px;">
                    ${inviterName} has invited you to join ${tenantName} on ${platformName} as a <strong>${roleLabel}</strong>.
                    Click the button below to set your password and activate your account.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:8px;">
                              <a href="${inviteLink}" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;">
                                Accept Invitation &amp; Set Your Password
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0 0 12px;">
                    If the button doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="color:#3b82f6;font-size:12px;word-break:break-all;margin:0 0 28px;">
                    <a href="${inviteLink}" style="color:#3b82f6;text-decoration:underline;">${inviteLink}</a>
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
                    <tr>
                      <td style="padding:12px 16px;">
                        <p style="color:#92400e;font-size:12px;line-height:1.5;margin:0;">
                          This link expires in <strong>7 days</strong>. If you didn't expect this invite, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                  <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">
                    This is an automated message from ${platformName}. Please do not reply.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const plainText = [
    `You've been invited to join ${tenantName}`,
    '',
    `${inviterName} has invited you to join ${tenantName} on ${platformName} as a ${roleLabel}.`,
    '',
    'Click the link below to set your password and activate your account:',
    inviteLink,
    '',
    'This link expires in 7 days.',
  ].join('\n');

  await sendEmail({
    to: toEmail,
    subject: `${inviterName} invited you to join ${tenantName} on ${platformName}`,
    html,
    text: plainText,
  });
}

module.exports = { sendEmail, sendTeamInviteEmail, isEmailConfigured };
