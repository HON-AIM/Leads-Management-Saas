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

async function sendInviteEmail({ name, email, password, loginUrl }) {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('Email not configured — skipping invite email', { email });
    return false;
  }

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
                  <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;">LeadFlowX</h1>
                  <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0;">Lead Distribution Platform</p>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px;">
                  <h2 style="color:#1e293b;font-size:18px;font-weight:600;margin:0 0 8px;">Welcome to the team${name ? ', ' + name : ''}!</h2>
                  <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
                    An account has been created for you. Here are your login details:
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Email</p>
                        <p style="color:#1e293b;font-size:14px;font-weight:500;margin:0;">${email}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 20px 16px;">
                        <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Password</p>
                        <p style="color:#1e293b;font-size:14px;font-weight:500;margin:0;font-family:monospace;letter-spacing:0.5px;">${password}</p>
                      </td>
                    </tr>
                  </table>

                  <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;">
                    Log In to Your Account
                  </a>

                  <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:28px 0 0;">
                    For security, we recommend changing your password after your first login.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                  <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">
                    This is an automated message from LeadFlowX. Please do not reply.
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

  try {
    await transport.sendMail({
      from: `"LeadFlowX" <${config.email.from}>`,
      to: email,
      subject: 'Your LeadFlowX Account — Login Details',
      html,
    });

    logger.info('Invite email sent', { email, name });
    return true;
  } catch (err) {
    logger.warn('Failed to send invite email', { email, error: err.message });
    return false;
  }
}

module.exports = { sendInviteEmail, isEmailConfigured };
