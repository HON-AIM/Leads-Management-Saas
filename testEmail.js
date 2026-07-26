/**
 * Standalone email diagnostic script — completely separate from the main app.
 * Run: node testEmail.js
 *
 * Uses the exact same nodemailer transport config as src/services/emailService.js
 */

require('dotenv').config();

const nodemailer = require('nodemailer');

// ── 1. Print resolved env vars (password masked) ──────────────────────────

function mask(val) {
  if (!val) return '(empty / undefined)';
  const v = val.trim();
  if (v.length <= 4) return '****';
  return v.slice(0, 2) + '*'.repeat(v.length - 4) + v.slice(-2);
}

const rawUser = process.env.EMAIL_USER || '';
const rawPass = process.env.EMAIL_PASS || '';

console.log('╔══════════════════════════════════════════════════╗');
console.log('║        EMAIL DIAGNOSTIC — testEmail.js          ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');
console.log('Raw values from process.env:');
console.log(`  EMAIL_USER  = "${rawUser}"  (length: ${rawUser.length}, bytes: ${Buffer.byteLength(rawUser)})`);
console.log(`  EMAIL_PASS  = "${mask(rawPass)}"  (length: ${rawPass.length}, bytes: ${Buffer.byteLength(rawPass)})`);
console.log('');

// ── 2. Detect invisible problems ──────────────────────────────────────────

function hasSurroundingWhitespace(val) {
  return val !== val.trim();
}

function hasAccidentalQuotes(val) {
  return (val.startsWith('"') && val.endsWith('"')) ||
         (val.startsWith("'") && val.endsWith("'"));
}

const problems = [];

if (!rawUser) {
  problems.push('EMAIL_USER is empty or not set at all.');
} else {
  if (hasSurroundingWhitespace(rawUser))
    problems.push(`EMAIL_USER has leading/trailing whitespace. Raw: [${rawUser}]`);
  if (hasAccidentalQuotes(rawUser))
    problems.push(`EMAIL_USER has surrounding quote characters. Raw: [${rawUser}]`);
  if (rawUser !== rawUser.trim())
    problems.push(`EMAIL_USER contains extra whitespace (checked via trim).`);
}

if (!rawPass) {
  problems.push('EMAIL_PASS is empty or not set at all.');
} else {
  if (hasSurroundingWhitespace(rawPass))
    problems.push(`EMAIL_PASS has leading/trailing whitespace. Raw: [${rawPass}]`);
  if (hasAccidentalQuotes(rawPass))
    problems.push(`EMAIL_PASS has surrounding quote characters. Raw: [${rawPass}]`);
  if (rawPass !== rawPass.trim())
    problems.push(`EMAIL_PASS contains extra whitespace (checked via trim).`);
}

if (problems.length > 0) {
  console.log('⚠  PROBLEMS DETECTED:');
  problems.forEach(p => console.log(`   → ${p}`));
  console.log('');
} else {
  console.log('✓  No whitespace or quote issues detected in env vars.');
  console.log('');
}

// ── 3. Build transporter (exact same config as emailService.js) ────────────

const config = {
  service: 'gmail',
  auth: {
    user: rawUser,
    pass: rawPass,
  },
};

console.log('Transporter config:');
console.log(`  service:  gmail`);
console.log(`  auth.user: "${config.auth.user}"`);
console.log(`  auth.pass: "${mask(config.auth.pass)}"`);
console.log('');

const transporter = nodemailer.createTransport(config);

// ── 4. Verify connection + auth ───────────────────────────────────────────

async function run() {
  const testTo = rawUser; // send to self

  console.log('─'.repeat(52));
  console.log('Step 1: Verifying SMTP connection & authentication...');
  try {
    await transporter.verify();
    console.log('✓  SMTP connection verified successfully!');
    console.log('');
  } catch (err) {
    console.log('✗  SMTP verification FAILED. Full error object:');
    console.log('');
    console.log(JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.log('');
    console.log('Raw error for reference:');
    console.log(err);
    console.log('');
    process.exit(1);
  }

  console.log('─'.repeat(52));
  console.log(`Step 2: Sending test email to ${testTo}...`);
  try {
    const info = await transporter.sendMail({
      from: `"LeadFlowX Diagnostic" <${config.auth.user}>`,
      to: testTo,
      subject: 'LeadFlowX — Email Diagnostic Test',
      text: 'This is a diagnostic test email from testEmail.js. If you see this, email sending works.',
      html: '<h2>LeadFlowX Diagnostic</h2><p>This is a test email from <b>testEmail.js</b>. If you see this, email sending works.</p>',
    });
    console.log('✓  Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response:   ${info.response}`);
    console.log('');
  } catch (err) {
    console.log('✗  Email send FAILED. Full error object:');
    console.log('');
    console.log(JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.log('');
    console.log('Raw error for reference:');
    console.log(err);
    console.log('');
    process.exit(1);
  }

  console.log('═'.repeat(52));
  console.log('DIAGNOSTIC COMPLETE — Email sending appears to work.');
  console.log('═'.repeat(52));
}

run();
