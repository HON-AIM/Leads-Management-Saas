const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    console.warn('[EmailService] Email credentials not configured. Emails will be logged to console.');
    transporter = {
      sendMail: async (options) => {
        console.log('[EmailService - DEV MODE] Email would be sent:', JSON.stringify(options, null, 2));
        return { messageId: 'dev-mode-' + Date.now() };
      }
    };
  }

  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Lead Distribution SaaS" <noreply@leadsaas.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    });
    console.log(`[EmailService] Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}: ${error.message}`);
    return false;
  }
}

async function sendVerificationEmail(user, verificationUrl) {
  return sendEmail({
    to: user.email,
    subject: 'Verify Your Email - Lead Distribution SaaS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Lead Distribution SaaS!</h2>
        <p>Hi ${user.firstName || user.username},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p style="margin: 20px 0;">
          <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
      </div>
    `
  });
}

async function sendPasswordResetEmail(user, resetUrl) {
  return sendEmail({
    to: user.email,
    subject: 'Password Reset - Lead Distribution SaaS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Password Reset Request</h2>
        <p>Hi ${user.firstName || user.username},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `
  });
}

async function sendLeadAssignedEmail(client, lead) {
  return sendEmail({
    to: client.email,
    subject: 'New Lead Assigned',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">New Lead Assigned to You!</h2>
        <p>Hi ${client.name},</p>
        <p>You have been assigned a new lead:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Name:</strong> ${lead.name || 'N/A'}</p>
          <p><strong>Email:</strong> ${lead.email || 'N/A'}</p>
          <p><strong>Phone:</strong> ${lead.phone || 'N/A'}</p>
          <p><strong>State:</strong> ${lead.state || 'N/A'}</p>
          <p><strong>Assigned:</strong> ${new Date(lead.createdAt).toLocaleString()}</p>
        </div>
      </div>
    `
  });
}

async function sendAccountLockedEmail(user) {
  return sendEmail({
    to: user.email,
    subject: 'Account Locked - Lead Distribution SaaS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Account Locked</h2>
        <p>Hi ${user.firstName || user.username},</p>
        <p>Your account has been temporarily locked due to too many failed login attempts.</p>
        <p>The lock will be automatically removed in 2 hours. If you need immediate access, please contact support.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px;">If this was not you, please secure your account immediately.</p>
      </div>
    `
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendLeadAssignedEmail,
  sendAccountLockedEmail
};
