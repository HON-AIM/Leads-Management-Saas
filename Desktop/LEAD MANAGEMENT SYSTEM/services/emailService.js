const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendLeadAssignedEmail(client, lead) {
  const emailContent = `
You have a new lead assigned to you!

Lead Details:
-------------
Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone || 'N/A'}
State: ${lead.state}
Assigned At: ${new Date(lead.createdAt).toLocaleString()}

---
This is an automated notification from the Lead Distribution System.
`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: client.email,
      subject: 'New Lead Assigned',
      text: emailContent
    });
    console.log(`✅ Email sent to ${client.email} for lead: ${lead.name}`);
    return true;
  } catch (error) {
    console.error(`❌ Email failed for ${client.email}:`, error.message);
    return false;
  }
}

module.exports = {
  transporter,
  sendLeadAssignedEmail
};