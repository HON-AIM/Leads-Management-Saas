const { getQueueManager } = require('./queueManager');

const LOG_PREFIX = '[NotificationsQueue]';

function log(step, details = {}) {
  const ts = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${ts} | Step: ${step}`, details);
}

const QUEUE_NAME = 'notifications';

async function registerNotificationsQueue() {
  const mgr = getQueueManager();

  mgr.registerQueue(QUEUE_NAME, {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 200,
      removeOnFail: 50,
    },
  });

  const worker = mgr.registerWorker(QUEUE_NAME, async (job) => {
    const { type, channel, recipient, subject, template, data } = job.data;

    log('PROCESSING', { type, channel, recipient, jobId: job.id });

    switch (type) {
      case 'email_notification':
        return await sendEmailNotification(recipient, subject, template, data);
      case 'lead_assigned_alert':
        return await sendLeadAssignedAlert(recipient, data);
      case 'buyer_cap_alert':
        return await sendCapAlert(recipient, data);
      case 'delivery_failure_alert':
        return await sendDeliveryFailureAlert(recipient, data);
      default:
        log('UNKNOWN_TYPE', { type });
        return { skipped: true, reason: `unknown_notification_type_${type}` };
    }
  }, { concurrency: 3 });

  log('REGISTERED', { queue: QUEUE_NAME });
  return mgr.getQueue(QUEUE_NAME);
}

async function sendEmailNotification(recipient, subject, template, data) {
  try {
    const emailService = require('../services/emailService');
    await emailService.sendEmail({ to: recipient, subject, html: template });
    log('EMAIL_SENT', { recipient, subject });
    return { sent: true, channel: 'email', recipient };
  } catch (err) {
    log('EMAIL_FAILED', { recipient, error: err.message });
    throw err;
  }
}

async function sendLeadAssignedAlert(recipient, data) {
  const { leadName, buyerName } = data || {};
  log('LEAD_ASSIGNED_ALERT', { recipient, leadName, buyerName });
  const emailService = require('../services/emailService');
  await emailService.sendLeadAssignedEmail(
    { email: recipient, name: buyerName || recipient },
    { name: leadName, email: '', phone: '', state: '', createdAt: new Date() }
  );
  return { sent: true, type: 'lead_assigned_alert' };
}

async function sendCapAlert(recipient, data) {
  const { buyerName, capType, current, limit } = data || {};
  log('CAP_ALERT', { recipient, buyerName, capType, current, limit });
  return { sent: true, type: 'cap_alert' };
}

async function sendDeliveryFailureAlert(recipient, data) {
  const { leadId, buyerName, error, attempts } = data || {};
  log('DELIVERY_FAILURE_ALERT', { recipient, leadId, buyerName, error, attempts });
  return { sent: true, type: 'delivery_failure_alert' };
}

async function pushNotification(type, channel, recipient, data, opts = {}) {
  const mgr = getQueueManager();
  const queue = mgr.getQueue(QUEUE_NAME);
  if (!queue) throw new Error('Notifications queue not registered');

  const job = await queue.add('send-notification', {
    type,
    channel,
    recipient,
    subject: data.subject || '',
    template: data.template || '',
    data,
  }, {
    priority: data.priority || 0,
    ...opts,
  });

  return job;
}

module.exports = {
  registerNotificationsQueue,
  pushNotification,
  sendEmailNotification,
  sendLeadAssignedAlert,
  sendCapAlert,
  sendDeliveryFailureAlert,
};
