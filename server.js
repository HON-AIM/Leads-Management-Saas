require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const Client = require('./models/Client');
const Lead = require('./models/Lead');
const User = require('./models/User');
const Activity = require('./models/Activity');
const Tenant = require('./models/Tenant');
const Role = require('./models/Role');
const Permission = require('./models/Permission');
const AuditLog = require('./models/AuditLog');
const Campaign = require('./models/Campaign');

const { getQueueManager } = require('./queue/queueManager');
const { bootQueueSystem, shutdownQueueSystem } = require('./queue/bootstrap');
const { getSystemHealth } = require('./queue/monitoringHooks');
const analyticsRouter = require('./services/analytics/analyticsRouter');
const leadRoutes = require('./routes/leadRoutes');
const aiRoutes = require('./routes/aiRoutes');

const { routeLead } = require('./services/routingService');
const { getCapStatus, resetAllCounters: resetBuyerCaps } = require('./services/capService');
const { resetState: resetRoundRobinState, listStates: listRoutingStates, getStateInfo: getRoutingState } = require('./services/roundRobinStateManager');
const { deliverLeadToBuyer } = require('./services/deliveryService');
const { getDeliveryLogsForLead, getDeliveryLogsForTenant, getDeliveryStats } = require('./services/deliveryLogger');
const DeliveryLog = require('./models/DeliveryLog');

const AuthService = require('./services/authService');
const TenantService = require('./services/tenantService');
const UserService = require('./services/userService');
const RoleService = require('./services/roleService');
const AuditLogService = require('./services/auditLogService');
const { sendLeadAssignedEmail } = require('./services/emailService');

const {
  authenticate,
  authorize,
  requirePermission,
  tenantIsolation,
  optionalAuth,
  requireActiveTenant
} = require('./middleware/auth');
const { resolveTenant, checkTenantSubscription, optionalTenant } = require('./middleware/tenant');
const { generalLimiter, authLimiter, loginLimiter, passwordResetLimiter, apiLimiter } = require('./middleware/rateLimiter');

const locationRoutes = require('./routes/locationRoutes');

const app = express();

app.set('trust proxy', 1);

const accessJwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const requiredProductionEnvs = ['MONGO_URI', 'FRONTEND_URL'];
const missingProductionEnvs = requiredProductionEnvs.filter(key => !process.env[key]);
if (process.env.NODE_ENV === 'production' && missingProductionEnvs.length) {
  console.error('Missing required environment variables for production:', missingProductionEnvs.join(', '));
  process.exit(1);
}

app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean);
    const fallbackOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];
    const originWhitelist = allowedOrigins?.length ? allowedOrigins : fallbackOrigins;

    if (!origin || originWhitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const US_STATES = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC', 'washington dc': 'DC', 'washington d.c.': 'DC',
  'al': 'AL', 'ak': 'AK', 'az': 'AZ', 'ar': 'AR', 'ca': 'CA',
  'co': 'CO', 'ct': 'CT', 'de': 'DE', 'fl': 'FL', 'ga': 'GA',
  'hi': 'HI', 'id': 'ID', 'il': 'IL', 'in': 'IN', 'ia': 'IA',
  'ks': 'KS', 'ky': 'KY', 'la': 'LA', 'me': 'ME', 'md': 'MD',
  'ma': 'MA', 'mi': 'MI', 'mn': 'MN', 'ms': 'MS', 'mo': 'MO',
  'mt': 'MT', 'ne': 'NE', 'nv': 'NV', 'nh': 'NH', 'nj': 'NJ',
  'nm': 'NM', 'ny': 'NY', 'nc': 'NC', 'nd': 'ND', 'oh': 'OH',
  'ok': 'OK', 'or': 'OR', 'pa': 'PA', 'ri': 'RI', 'sc': 'SC',
  'sd': 'SD', 'tn': 'TN', 'tx': 'TX', 'ut': 'UT', 'vt': 'VT',
  'va': 'VA', 'wa': 'WA', 'wv': 'WV', 'wi': 'WI', 'wy': 'WY',
  'dc': 'DC'
};

function normalizeState(state) {
  if (state === null || state === undefined) return null;
  if (typeof state !== 'string') state = String(state);
  const trimmed = state.trim().toLowerCase();
  if (trimmed === '') return null;
  return US_STATES[trimmed] || null;
}

function isValidState(state) {
  if (!state) return false;
  return Object.values(US_STATES).includes(state.toUpperCase());
}

function log(entryPoint, leadData = {}, step, result, details = {}) {
  const timestamp = new Date().toISOString();
  const leadId = leadData.leadId || 'PENDING';
  const state = leadData.rawState || leadData.state || 'N/A';
  console.log(`[${entryPoint}] ${timestamp} | LeadID: ${leadId} | State: "${state}" | Step: ${step} | Result: ${result}`, details);
}

function logError(entryPoint, leadData, step, error) {
  const timestamp = new Date().toISOString();
  const leadId = leadData?.leadId || 'PENDING';
  const state = leadData?.rawState || 'N/A';
  console.error(`[${entryPoint}] ${timestamp} | LeadID: ${leadId} | State: "${state}" | Step: ${step} | ERROR: ${error.message}`, { stack: error.stack });
}

async function processLead(name, email, phone, rawState, source = 'form', tenantId = null) {
  const leadData = { rawState, name, email, source };
  log('processLead', leadData, 'START', 'INITIALIZED', { name, email, phone, rawState, source });

  if (!name && !email) {
    log('processLead', leadData, 'VALIDATION', 'REJECTED', { reason: 'missing_name_and_email' });
    return { assignedTo: null, status: 'unassigned', reason: 'missing_fields', clientName: null };
  }

  const normalizedState = normalizeState(rawState);
  if (!normalizedState) {
    log('processLead', leadData, 'STATE_VALIDATION', 'INVALID', { rawState });
    return { assignedTo: null, status: 'unassigned', reason: 'invalid_state', clientName: null };
  }

  const tempLead = {
    _id: 'temp',
    name,
    email,
    phone,
    state: normalizedState,
    source,
    tenantId,
    createdAt: new Date(),
  };

  const routeResult = await routeLead(tempLead, tenantId);

  return {
    assignedTo: routeResult.assignedTo,
    status: routeResult.status,
    reason: routeResult.reason,
    clientName: routeResult.assignedBuyer?.name || null,
    routingMode: routeResult.routingMode,
  };
}

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log("✅ MongoDB Connected");

  await RoleService.initializeSystemRoles();

  let defaultTenant = await Tenant.findOne({ slug: 'default' });
  if (!defaultTenant) {
    const crypto = require('crypto');
    defaultTenant = await Tenant.create({
      name: 'Default Organization',
      slug: 'default',
      domain: 'default',
      description: 'Default tenant for the system',
      status: 'active',
      settings: {
        maxUsers: 100,
        maxLeadsPerMonth: 10000,
        features: { emailNotifications: true, advancedAnalytics: false, apiAccess: true },
        defaultRole: 'buyer',
        requireEmailVerification: false
      },
      subscription: { plan: 'free' }
    });
    console.log("✅ Default tenant created");
  }

  const superAdminRole = await Role.findOne({ name: 'super_admin' });
  const tenantAdminRole = await Role.findOne({ name: 'tenant_admin' });
  const adminExists = await User.findOne({ username: 'admin' });
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const defaultTenantAdminPassword = process.env.DEFAULT_TENANT_ADMIN_PASSWORD;

  if (!adminExists && superAdminRole) {
    if (process.env.NODE_ENV === 'production' && !defaultAdminPassword) {
      console.warn('⚠️ DEFAULT_ADMIN_PASSWORD is not set. Skipping default super admin creation in production.');
    } else {
      const adminUser = new User({
        username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
        password: defaultAdminPassword || 'admin123',
        firstName: 'Super',
        lastName: 'Admin',
        tenantId: defaultTenant._id,
        role: superAdminRole._id,
        status: 'active',
        emailVerified: true
      });
      await adminUser.save();
      console.log(`✅ Default super admin created: ${adminUser.username} / ${defaultAdminPassword ? '[SECRET_PRIVATE]' : 'admin123'}`);
    }
  }

  const tenantAdminExists = await User.findOne({ username: process.env.DEFAULT_TENANT_ADMIN_USERNAME || 'tenantadmin' });
  if (!tenantAdminExists && tenantAdminRole) {
    if (process.env.NODE_ENV === 'production' && !defaultTenantAdminPassword) {
      console.warn('⚠️ DEFAULT_TENANT_ADMIN_PASSWORD is not set. Skipping default tenant admin creation in production.');
    } else {
      const taUser = new User({
        username: process.env.DEFAULT_TENANT_ADMIN_USERNAME || 'tenantadmin',
        email: process.env.DEFAULT_TENANT_ADMIN_EMAIL || 'tenantadmin@example.com',
        password: defaultTenantAdminPassword || 'tenant123',
        firstName: 'Tenant',
        lastName: 'Admin',
        tenantId: defaultTenant._id,
        role: tenantAdminRole._id,
        status: 'active',
        emailVerified: true
      });
      await taUser.save();
      console.log(`✅ Default tenant admin created: ${taUser.username} / ${defaultTenantAdminPassword ? '[SECRET_PRIVATE]' : 'tenant123'}`);
    }
  }

  try {
    await bootQueueSystem();
    console.log("✅ Queue system initialized");
  } catch (queueErr) {
    console.error('❌ Queue system initialization failed:', queueErr.message);
  }
})
.catch(err => {
  console.error('❌ MongoDB Connection Failed:', err.message);
});

app.get('/api/debug/clients', async (req, res) => {
  try {
    const clients = await Client.find({}).sort({ state: 1, name: 1 });
    res.json({ count: clients.length, clients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', authenticate, tenantIsolation, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const [totalLeads, totalClients, leadsToday, unassignedLeads, totalAssignedLeads, assignedClients, activeClients] = await Promise.all([
      Lead.countDocuments({ tenantId }),
      Client.countDocuments({ tenantId }),
      (async () => { const today = new Date(); today.setHours(0, 0, 0, 0); return Lead.countDocuments({ tenantId, createdAt: { $gte: today } }); })(),
      Lead.countDocuments({ tenantId, assignedTo: null }),
      Lead.countDocuments({ tenantId, assignedTo: { $ne: null } }),
      Client.countDocuments({ tenantId, leadsReceived: { $gt: 0 } }),
      Client.countDocuments({ tenantId, status: 'active' })
    ]);
    res.json({ totalLeads, totalClients, leadsToday, unassignedLeads, totalAssignedLeads, assignedClients, activeClients });
  } catch (err) {
    console.error('❌ STATS ERROR:', err);
    res.status(500).json(err);
  }
});

app.use('/api/analytics', analyticsRouter);
app.use('/api/leads', leadRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/campaigns', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const campaigns = await Campaign.find({ tenantId: req.tenantId })
      .populate('assignedBuyers.buyerId', 'name email state')
      .populate('stateRouting.buyerId', 'name email state')
      .sort({ createdAt: -1 });
    res.json({ success: true, campaigns });
  } catch (err) {
    console.error('❌ GET_CAMPAIGNS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/campaigns', authenticate, tenantIsolation, requirePermission('leads', 'create'), async (req, res) => {
  try {
    const campaign = await Campaign.create({ ...req.body, tenantId: req.tenantId, createdBy: req.user._id });
    await Activity.create({ type: 'campaign_created', message: `Campaign created: ${campaign.name}`, tenantId: req.tenantId });
    res.json({ success: true, campaign });
  } catch (err) {
    console.error('❌ CREATE_CAMPAIGN ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/campaigns/:id', authenticate, tenantIsolation, requirePermission('leads', 'update'), async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true }
    ).populate('assignedBuyers.buyerId', 'name email state')
     .populate('stateRouting.buyerId', 'name email state');
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    await Activity.create({ type: 'campaign_updated', message: `Campaign updated: ${campaign.name}`, tenantId: req.tenantId });
    res.json({ success: true, campaign });
  } catch (err) {
    console.error('❌ UPDATE_CAMPAIGN ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/campaigns/:id', authenticate, tenantIsolation, requirePermission('leads', 'delete'), async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    await Activity.create({ type: 'campaign_deleted', message: `Campaign deleted: ${campaign.name}`, tenantId: req.tenantId });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ DELETE_CAMPAIGN ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/campaigns/:id/toggle', authenticate, tenantIsolation, requirePermission('leads', 'update'), async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    campaign.status = campaign.status === 'active' ? 'inactive' : 'active';
    await campaign.save();
    await Activity.create({ type: 'campaign_toggled', message: `Campaign ${campaign.name} ${campaign.status}`, tenantId: req.tenantId });
    res.json({ success: true, campaign });
  } catch (err) {
    console.error('❌ TOGGLE_CAMPAIGN ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/activities', authenticate, tenantIsolation, async (req, res) => {
  try {
    const activities = await Activity.find({ tenantId: req.tenantId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('clientId', 'name')
      .populate('leadId', 'name email');
    res.json(activities);
  } catch (err) {
    console.error('❌ ACTIVITIES ERROR:', err);
    res.status(500).json(err);
  }
});



app.post('/api/webhooks/lead', async (req, res) => {
  try {
    const body = req.body;
    const data = body.data || body.payload || body.lead || body.contact || body;
    const rawState = data.state || data.state_province || data.location_state || data.location?.state || data.address?.state || body.state;
    const contact_name = data.contact_name || data.name || body.name;
    const firstName = data.firstName || data.first_name || body.firstName;
    const lastName = data.lastName || data.last_name || body.lastName;
    const email = data.email || body.email;
    const phone = data.phone || data.phoneNumber || body.phone;
    const source = data.source || body.source || 'webhook';
    const leadName = contact_name || `${firstName || ''} ${lastName || ''}`.trim() || email || 'Unknown';

    const processResult = await processLead(leadName, email, phone, rawState, source);
    const normalizedState = normalizeState(rawState);

    const lead = await Lead.create({
      name: leadName || 'Unknown',
      email: email || 'no-email@webhook.local',
      phone: phone || null,
      state: normalizedState || 'UNKNOWN',
      source: source || 'webhook',
      assignedTo: processResult.assignedTo,
      status: processResult.status
    });

    await Activity.create({
      type: processResult.status === 'assigned' ? 'lead_assigned' : 'lead_received',
      message: processResult.status === 'assigned' ? `Webhook lead ${leadName} → ${processResult.clientName}` : `Webhook lead received: ${leadName} (${processResult.reason})`,
      leadId: lead._id,
      clientId: processResult.assignedTo
    });

    res.json({ success: true, lead, assignedTo: processResult.clientName, status: processResult.status, reason: processResult.reason });
  } catch (err) {
    console.error('❌ WEBHOOK ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/leads/:id', authenticate, tenantIsolation, requirePermission('leads', 'delete'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (lead.assignedTo) {
      const client = await Client.findById(lead.assignedTo);
      if (client && client.leadsReceived > 0) {
        await Client.findByIdAndUpdate(lead.assignedTo, { $inc: { leadsReceived: -1 } });
      }
    }

    await Lead.findByIdAndDelete(req.params.id);
    await Activity.create({ type: 'lead_deleted', message: `Lead deleted: ${lead.name}`, leadId: null, clientId: lead.assignedTo });
    res.json({ success: true, message: "Lead deleted successfully" });
  } catch (err) {
    console.error('❌ DELETE_LEAD ERROR:', err);
    res.status(500).json({ success: false, message: "Error deleting lead" });
  }
});

app.get('/api/leads', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const { status, state, assignedTo, page = 1, limit = 50 } = req.query;
    const query = { tenantId: req.tenantId };
    if (status) query.status = status;
    if (state) query.state = state;
    if (assignedTo) query.assignedTo = assignedTo;

    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)).populate('assignedTo', 'name email state'),
      Lead.countDocuments(query)
    ]);
    res.json({ leads, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('❌ GET_LEADS ERROR:', err);
    res.status(500).json(err);
  }
});

app.get('/api/clients', authenticate, tenantIsolation, requirePermission('clients', 'read'), async (req, res) => {
  try {
    const clients = await Client.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    console.error('❌ GET_CLIENTS ERROR:', err);
    res.status(500).json(err);
  }
});

app.post('/api/clients', authenticate, tenantIsolation, requirePermission('clients', 'create'), async (req, res) => {
  try {
    const { name, email, state, leadCap, status = 'active', notes } = req.body;
    const normalizedState = normalizeState(state);
    if (!normalizedState) {
      return res.status(400).json({ success: false, error: `Invalid state: "${state}"` });
    }
    const cap = parseInt(leadCap) || 0;
    if (cap <= 0) return res.status(400).json({ success: false, error: 'Lead cap must be a positive number' });

    const client = await Client.create({
      name, email: email || '', state: normalizedState, leadCap: cap, leadsReceived: 0,
      status: status || 'active', notes: notes || '', tenantId: req.tenantId, createdBy: req.user._id
    });

    await Activity.create({ type: 'client_created', message: `New client: ${client.name} (${client.state})`, clientId: client._id, tenantId: req.tenantId });
    res.json(client);
  } catch (err) {
    console.error('❌ ADD_CLIENT ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/clients/:id', authenticate, tenantIsolation, requirePermission('clients', 'update'), async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const updateData = { ...req.body };
    if (updateData.state) {
      const normalizedState = normalizeState(updateData.state);
      if (!normalizedState) return res.status(400).json({ success: false, error: `Invalid state: "${updateData.state}"` });
      updateData.state = normalizedState;
    }
    if (updateData.leadCap) updateData.leadCap = parseInt(updateData.leadCap);

    const updated = await Client.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      updateData,
      { new: true }
    );

    await Activity.create({ type: 'client_updated', message: `Client updated: ${updated.name}`, clientId: updated._id, tenantId: req.tenantId });
    res.json(updated);
  } catch (err) {
    console.error('❌ UPDATE_CLIENT ERROR:', err);
    res.status(500).json(err);
  }
});

app.delete('/api/clients/:id', authenticate, tenantIsolation, requirePermission('clients', 'delete'), async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    await Client.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    await Activity.create({ type: 'client_deleted', message: `Client deleted: ${client.name}`, clientId: null, tenantId: req.tenantId });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ DELETE_CLIENT ERROR:', err);
    res.status(500).json(err);
  }
});

app.post('/api/clients/:id/reset', authenticate, tenantIsolation, requirePermission('clients', 'update'), async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    client.leadsReceived = 0;
    client.status = 'active';
    await client.save();
    await Activity.create({ type: 'lead_cap_reset', message: `Lead count reset for ${client.name}`, clientId: client._id, tenantId: req.tenantId });
    res.json(client);
  } catch (err) {
    console.error('❌ RESET_CLIENT ERROR:', err);
    res.status(500).json(err);
  }
});

app.post('/api/clients/:id/pause', authenticate, tenantIsolation, requirePermission('clients', 'update'), async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: { isPaused: true, pausedAt: new Date(), pausedReason: req.body.reason || '' } },
      { new: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    await Activity.create({ type: 'client_updated', message: `Buyer paused: ${client.name}`, clientId: client._id, tenantId: req.tenantId });
    res.json({ success: true, client });
  } catch (err) {
    console.error('❌ PAUSE_CLIENT ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:id/resume', authenticate, tenantIsolation, requirePermission('clients', 'update'), async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: { isPaused: false }, $unset: { pausedAt: '', pausedReason: '' } },
      { new: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    await Activity.create({ type: 'client_updated', message: `Buyer resumed: ${client.name}`, clientId: client._id, tenantId: req.tenantId });
    res.json({ success: true, client });
  } catch (err) {
    console.error('❌ RESUME_CLIENT ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/clients/:id/cap-status', authenticate, tenantIsolation, requirePermission('clients', 'read'), async (req, res) => {
  try {
    const status = await getCapStatus(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, ...status });
  } catch (err) {
    console.error('❌ CAP_STATUS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:id/reset-caps', authenticate, tenantIsolation, requirePermission('clients', 'update'), async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    await resetBuyerCaps(req.params.id);
    await Activity.create({ type: 'lead_cap_reset', message: `Caps reset for ${client.name}`, clientId: client._id, tenantId: req.tenantId });
    res.json({ success: true, message: 'Caps reset successfully' });
  } catch (err) {
    console.error('❌ RESET_CAPS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/routing/state', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const states = await listRoutingStates(req.tenantId);
    res.json({ success: true, states });
  } catch (err) {
    console.error('❌ ROUTING_STATE ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/routing/state/:state', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const state = await getRoutingState(req.tenantId, req.params.state);
    if (!state) return res.status(404).json({ success: false, message: 'No routing state for this state' });
    res.json({ success: true, state });
  } catch (err) {
    console.error('❌ ROUTING_STATE_ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/routing/state/reset', authenticate, tenantIsolation, requirePermission('leads', 'update'), async (req, res) => {
  try {
    const { state } = req.body;
    if (state) {
      await resetRoundRobinState(req.tenantId, state);
    }
    await Activity.create({ type: 'client_updated', message: `Routing state reset${state ? ` for ${state}` : ' for all states'}`, tenantId: req.tenantId });
    res.json({ success: true, message: state ? `Routing state reset for ${state}` : 'All routing states reset' });
  } catch (err) {
    console.error('❌ RESET_ROUTING ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/buyer/me', authenticate, tenantIsolation, async (req, res) => {
  try {
    const buyer = await Client.findOne({ email: req.user.email, tenantId: req.tenantId });
    if (!buyer) return res.status(404).json({ success: false, message: 'Buyer profile not found' });
    res.json({ success: true, buyer });
  } catch (err) {
    console.error('❌ BUYER_PROFILE ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/buyer/leads', authenticate, tenantIsolation, async (req, res) => {
  try {
    const buyer = await Client.findOne({ email: req.user.email, tenantId: req.tenantId });
    if (!buyer) return res.status(404).json({ success: false, message: 'Buyer profile not found' });
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const skip = (page - 1) * limit;
    const { status, state } = req.query;
    const filter = { tenantId: req.tenantId, assignedTo: buyer._id };
    if (status) filter.status = status;
    if (state) filter.state = state.toUpperCase();
    const [leads, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('assignedTo', 'name email state').lean(),
      Lead.countDocuments(filter),
    ]);
    res.json({ success: true, leads, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('❌ BUYER_LEADS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/buyer/stats', authenticate, tenantIsolation, async (req, res) => {
  try {
    const buyer = await Client.findOne({ email: req.user.email, tenantId: req.tenantId });
    if (!buyer) return res.status(404).json({ success: false, message: 'Buyer profile not found' });
    const totalLeads = buyer.leadsReceived;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [leadsToday, deliveredCount, failedCount, recent] = await Promise.all([
      Lead.countDocuments({ tenantId: req.tenantId, assignedTo: buyer._id, createdAt: { $gte: today } }),
      Lead.countDocuments({ tenantId: req.tenantId, assignedTo: buyer._id, deliveryStatus: 'delivered' }),
      Lead.countDocuments({ tenantId: req.tenantId, assignedTo: buyer._id, deliveryStatus: 'failed' }),
      Lead.find({ tenantId: req.tenantId, assignedTo: buyer._id }).sort({ createdAt: -1 }).limit(5).select('name email state status createdAt').lean(),
    ]);
    const deliveryRate = totalLeads > 0 ? (deliveredCount / totalLeads) * 100 : 0;
    res.json({
      success: true,
      stats: {
        totalLeads,
        leadsToday,
        deliveredCount,
        failedCount,
        deliveryRate: Math.round(deliveryRate * 10) / 10,
        leadCap: buyer.leadCap,
        dailyCap: buyer.dailyCap,
        monthlyCap: buyer.monthlyCap,
        dailyLeadsReceived: buyer.dailyLeadsReceived,
        monthlyLeadsReceived: buyer.monthlyLeadsReceived,
        status: buyer.status,
        isPaused: buyer.isPaused,
      },
      recent,
    });
  } catch (err) {
    console.error('❌ BUYER_STATS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/buyer/cap-usage', authenticate, tenantIsolation, async (req, res) => {
  try {
    const buyer = await Client.findOne({ email: req.user.email, tenantId: req.tenantId });
    if (!buyer) return res.status(404).json({ success: false, message: 'Buyer profile not found' });
    const totalPct = buyer.leadCap > 0 ? (buyer.leadsReceived / buyer.leadCap) * 100 : 0;
    const dailyPct = buyer.dailyCap > 0 ? (buyer.dailyLeadsReceived / buyer.dailyCap) * 100 : 0;
    const monthlyPct = buyer.monthlyCap > 0 ? (buyer.monthlyLeadsReceived / buyer.monthlyCap) * 100 : 0;
    res.json({
      success: true,
      usage: {
        total: { used: buyer.leadsReceived, cap: buyer.leadCap, percent: Math.round(totalPct * 10) / 10 },
        daily: { used: buyer.dailyLeadsReceived, cap: buyer.dailyCap, percent: Math.round(dailyPct * 10) / 10 },
        monthly: { used: buyer.monthlyLeadsReceived, cap: buyer.monthlyCap, percent: Math.round(monthlyPct * 10) / 10 },
      },
    });
  } catch (err) {
    console.error('❌ BUYER_CAP ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/buyer/activities', authenticate, tenantIsolation, async (req, res) => {
  try {
    const buyer = await Client.findOne({ email: req.user.email, tenantId: req.tenantId });
    if (!buyer) return res.status(404).json({ success: false, message: 'Buyer profile not found' });
    const activities = await Activity.find({ tenantId: req.tenantId, clientId: buyer._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('leadId', 'name email')
      .lean();
    res.json({ success: true, activities });
  } catch (err) {
    console.error('❌ BUYER_ACTIVITIES ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/delivery/trigger/:leadId', authenticate, tenantIsolation, requirePermission('leads', 'update'), async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.leadId, tenantId: req.tenantId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const result = await deliverLeadToBuyer(lead._id, req.tenantId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('❌ DELIVERY_TRIGGER ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/delivery/retry/:logId', authenticate, tenantIsolation, requirePermission('leads', 'update'), async (req, res) => {
  try {
    const log = await DeliveryLog.findOne({ _id: req.params.logId, tenantId: req.tenantId });
    if (!log) return res.status(404).json({ success: false, message: 'Delivery log not found' });
    const result = await deliverLeadToBuyer(log.leadId, req.tenantId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('❌ DELIVERY_RETRY ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/delivery/trends', authenticate, tenantIsolation, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const trends = await DeliveryLog.aggregate([
      { $match: { tenantId: req.tenantId, createdAt: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
        success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        retrying: { $sum: { $cond: [{ $eq: ['$status', 'retrying'] }, 1, 0] } },
        avgDuration: { $avg: '$duration' },
        maxDuration: { $max: '$duration' },
      }},
      { $sort: { _id: 1 } },
    ]);
    const hourly = await DeliveryLog.aggregate([
      { $match: { tenantId: req.tenantId, createdAt: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d-%H', date: '$createdAt' } },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
      }},
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, trends, hourly, days });
  } catch (err) {
    console.error('❌ DELIVERY_TRENDS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/delivery/logs/:leadId', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const logs = await getDeliveryLogsForLead(req.params.leadId);
    res.json({ success: true, logs });
  } catch (err) {
    console.error('❌ DELIVERY_LOGS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/delivery/logs', authenticate, tenantIsolation, requirePermission('leads', 'read'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const { status, buyerId, provider, dateFrom, dateTo } = req.query;
    const filter = { tenantId: req.tenantId };
    if (status) filter.status = status;
    if (buyerId) filter.buyerId = buyerId;
    if (provider) filter.provider = provider;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    const [logs, total] = await Promise.all([
      DeliveryLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('leadId', 'name email phone state')
        .populate('buyerId', 'name'),
      DeliveryLog.countDocuments(filter),
    ]);
    res.json({ success: true, logs, total, limit, skip });
  } catch (err) {
    console.error('❌ DELIVERY_LOGS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/delivery/stats', authenticate, tenantIsolation, requirePermission('analytics', 'read'), async (req, res) => {
  try {
    const stats = await getDeliveryStats(req.tenantId);
    res.json({ success: true, ...stats });
  } catch (err) {
    console.error('❌ DELIVERY_STATS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/queue/health', authenticate, authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const health = await getSystemHealth(getQueueManager());
    res.json({ success: true, ...health });
  } catch (err) {
    console.error('❌ QUEUE_HEALTH ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/queue/metrics', authenticate, authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const metrics = await getQueueManager().getMetrics();
    res.json({ success: true, ...metrics });
  } catch (err) {
    console.error('❌ QUEUE_METRICS ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/queue/pause/:name', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    await getQueueManager().pauseQueue(req.params.name);
    res.json({ success: true, message: `Queue ${req.params.name} paused` });
  } catch (err) {
    console.error('❌ QUEUE_PAUSE ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/queue/resume/:name', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    await getQueueManager().resumeQueue(req.params.name);
    res.json({ success: true, message: `Queue ${req.params.name} resumed` });
  } catch (err) {
    console.error('❌ QUEUE_RESUME ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/queue/retry/:name/:jobId', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const result = await getQueueManager().retryFailedJob(req.params.name, req.params.jobId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('❌ QUEUE_RETRY ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/queue/recover/:name', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const max = parseInt(req.query.max) || 10;
    const result = await getQueueManager().recoverFromDeadLetter(req.params.name, max);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('❌ QUEUE_RECOVER ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await AuthService.login(username, password, userAgent, ipAddress);

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ user: result.user, message: 'Login successful' });
  } catch (error) {
    console.error('❌ LOGIN ERROR:', error.message);
    res.status(401).json({ message: error.message });
  }
});

app.post('/api/auth/register', optionalTenant, async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    const tenantId = req.tenantId || req.tenant?._id;
    if (!tenantId) return res.status(400).json({ message: 'Tenant context required' });

    const result = await AuthService.register({ username, email, password, firstName, lastName }, tenantId);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ REGISTER ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    const result = await AuthService.refreshToken(refreshToken);

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000, path: '/'
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/'
    });

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('❌ REFRESH ERROR:', error.message);
    res.status(401).json({ message: error.message });
  }
});

app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    await AuthService.logout(req.user._id, refreshToken);
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ LOGOUT ERROR:', error.message);
    res.status(500).json({ message: 'Logout failed' });
  }
});

app.post('/api/auth/logout-all', authenticate, async (req, res) => {
  try {
    await AuthService.logoutAll(req.user._id);
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    console.error('❌ LOGOUT ALL ERROR:', error.message);
    res.status(500).json({ message: 'Logout failed' });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    const result = await AuthService.verifyEmail(token);
    res.json(result);
  } catch (error) {
    console.error('❌ VERIFY EMAIL ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/auth/resend-verification', authenticate, async (req, res) => {
  try {
    const result = await AuthService.resendVerificationEmail(req.user._id);
    res.json(result);
  } catch (error) {
    console.error('❌ RESEND VERIFICATION ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await AuthService.requestPasswordReset(email);
    res.json(result);
  } catch (error) {
    console.error('❌ FORGOT PASSWORD ERROR:', error.message);
    res.status(500).json({ message: 'Failed to process request' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const result = await AuthService.resetPassword(token, newPassword);
    res.json(result);
  } catch (error) {
    console.error('❌ RESET PASSWORD ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(req.user._id, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    console.error('❌ CHANGE PASSWORD ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const profile = await UserService.getUserProfile(req.user._id);
    res.json(profile);
  } catch (error) {
    console.error('❌ GET PROFILE ERROR:', error.message);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

app.put('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const profile = await UserService.updateUserProfile(req.user._id, { firstName, lastName, phone });
    res.json(profile);
  } catch (error) {
    console.error('❌ UPDATE PROFILE ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/auth/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await AuthService.getActiveSessions(req.user._id);
    res.json({ sessions });
  } catch (error) {
    console.error('❌ GET SESSIONS ERROR:', error.message);
    res.status(500).json({ message: 'Failed to get sessions' });
  }
});

app.post('/api/auth/sessions/:token/revoke', authenticate, async (req, res) => {
  try {
    await AuthService.revokeToken(req.user._id, req.params.token);
    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('❌ REVOKE SESSION ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/tenants', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const tenant = await TenantService.createTenant(req.body, req.user._id);
    res.status(201).json(tenant);
  } catch (error) {
    console.error('❌ CREATE TENANT ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/tenants/onboard', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { tenant, admin } = req.body;
    const result = await TenantService.onboardTenant(tenant, admin);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ ONBOARD TENANT ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/tenants', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { page, limit, status, plan } = req.query;
    const result = await TenantService.listTenants({ status, plan }, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('❌ LIST TENANTS ERROR:', error.message);
    res.status(500).json({ message: 'Failed to list tenants' });
  }
});

app.get('/api/tenants/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const tenant = await TenantService.getTenantById(req.params.id);
    res.json(tenant);
  } catch (error) {
    console.error('❌ GET TENANT ERROR:', error.message);
    res.status(404).json({ message: error.message });
  }
});

app.put('/api/tenants/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const tenant = await TenantService.updateTenant(req.params.id, req.body, req.user._id);
    res.json(tenant);
  } catch (error) {
    console.error('❌ UPDATE TENANT ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/tenants/:id/suspend', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const tenant = await TenantService.suspendTenant(req.params.id, req.user._id, reason);
    res.json(tenant);
  } catch (error) {
    console.error('❌ SUSPEND TENANT ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/tenants/:id/activate', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const tenant = await TenantService.activateTenant(req.params.id, req.user._id);
    res.json(tenant);
  } catch (error) {
    console.error('❌ ACTIVATE TENANT ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/tenants/:id/stats', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const stats = await TenantService.getTenantStats(req.params.id);
    res.json(stats);
  } catch (error) {
    console.error('❌ GET TENANT STATS ERROR:', error.message);
    res.status(500).json({ message: 'Failed to get tenant stats' });
  }
});

app.delete('/api/tenants/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const result = await TenantService.deleteTenant(req.params.id, req.user._id);
    res.json(result);
  } catch (error) {
    console.error('❌ DELETE TENANT ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/users', authenticate, tenantIsolation, authorize('tenant_admin', 'super_admin'), async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, roleId } = req.body;
    const user = await UserService.createUser({ username, email, password, firstName, lastName, roleId }, req.tenantId, req.user._id);
    res.status(201).json(user);
  } catch (error) {
    console.error('❌ CREATE USER ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/users', authenticate, tenantIsolation, async (req, res) => {
  try {
    const { page, limit, status, role } = req.query;
    const result = await UserService.getUsersInTenant(req.tenantId, { status, role }, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('❌ LIST USERS ERROR:', error.message);
    res.status(500).json({ message: 'Failed to list users' });
  }
});

app.get('/api/users/:id', authenticate, tenantIsolation, async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id, req.tenantId);
    res.json(user);
  } catch (error) {
    console.error('❌ GET USER ERROR:', error.message);
    res.status(404).json({ message: error.message });
  }
});

app.put('/api/users/:id', authenticate, tenantIsolation, async (req, res) => {
  try {
    const user = await UserService.updateUser(req.params.id, req.tenantId, req.body, req.user._id);
    res.json(user);
  } catch (error) {
    console.error('❌ UPDATE USER ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/users/:id', authenticate, tenantIsolation, authorize('tenant_admin', 'super_admin'), async (req, res) => {
  try {
    const result = await UserService.deleteUser(req.params.id, req.tenantId, req.user._id);
    res.json(result);
  } catch (error) {
    console.error('❌ DELETE USER ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.patch('/api/users/:id/status', authenticate, tenantIsolation, authorize('tenant_admin', 'super_admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const user = await UserService.setUserStatus(req.params.id, req.tenantId, status, req.user._id);
    res.json(user);
  } catch (error) {
    console.error('❌ SET USER STATUS ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/users/:id/reset-password', authenticate, tenantIsolation, authorize('tenant_admin', 'super_admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    const result = await UserService.resetUserPassword(req.params.id, req.tenantId, newPassword, req.user._id);
    res.json(result);
  } catch (error) {
    console.error('❌ RESET USER PASSWORD ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/users/:id/unlock', authenticate, tenantIsolation, authorize('tenant_admin', 'super_admin'), async (req, res) => {
  try {
    const result = await AuthService.unlockAccount(req.params.id, req.user._id);
    res.json(result);
  } catch (error) {
    console.error('❌ UNLOCK USER ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/roles', authenticate, tenantIsolation, async (req, res) => {
  try {
    const roles = await RoleService.getAllRoles(req.tenantId);
    res.json(roles);
  } catch (error) {
    console.error('❌ LIST ROLES ERROR:', error.message);
    res.status(500).json({ message: 'Failed to list roles' });
  }
});

app.get('/api/permissions', authenticate, tenantIsolation, async (req, res) => {
  try {
    const permissions = await RoleService.getPermissionsByCategory();
    res.json(permissions);
  } catch (error) {
    console.error('❌ LIST PERMISSIONS ERROR:', error.message);
    res.status(500).json({ message: 'Failed to list permissions' });
  }
});

app.post('/api/roles', authenticate, tenantIsolation, authorize('tenant_admin', 'super_admin'), async (req, res) => {
  try {
    const { name, description, permissionIds } = req.body;
    const role = await RoleService.createTenantRole(req.tenantId, { name, description, permissionIds }, req.user._id);
    res.status(201).json(role);
  } catch (error) {
    console.error('❌ CREATE ROLE ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/roles/:id', authenticate, tenantIsolation, authorize('tenant_admin', 'super_admin'), async (req, res) => {
  try {
    const role = await RoleService.updateRole(req.params.id, req.body, req.user._id);
    res.json(role);
  } catch (error) {
    console.error('❌ UPDATE ROLE ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/roles/:id', authenticate, tenantIsolation, authorize('tenant_admin', 'super_admin'), async (req, res) => {
  try {
    const result = await RoleService.deleteRole(req.params.id, req.user._id);
    res.json(result);
  } catch (error) {
    console.error('❌ DELETE ROLE ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/users/:userId/roles/:roleId', authenticate, tenantIsolation, authorize('tenant_admin', 'super_admin'), async (req, res) => {
  try {
    const user = await RoleService.assignRoleToUser(req.params.userId, req.params.roleId, req.user._id);
    res.json(user);
  } catch (error) {
    console.error('❌ ASSIGN ROLE ERROR:', error.message);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/audit-logs', authenticate, tenantIsolation, authorize('tenant_admin', 'super_admin'), async (req, res) => {
  try {
    const { page, limit, action, resource, status } = req.query;
    const result = await AuditLogService.getLogs(req.tenantId, { action, resource, status }, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('❌ GET AUDIT LOGS ERROR:', error.message);
    res.status(500).json({ message: 'Failed to get audit logs' });
  }
});

app.get('/api/audit-logs/recent', authenticate, tenantIsolation, async (req, res) => {
  try {
    const logs = await AuditLogService.getRecentActivity(req.tenantId, 20);
    res.json(logs);
  } catch (error) {
    console.error('❌ GET RECENT ACTIVITY ERROR:', error.message);
    res.status(500).json({ message: 'Failed to get recent activity' });
  }
});

app.post('/api/test/lead', optionalTenant, async (req, res) => {
  try {
    const { name, email, phone, state, source = 'test' } = req.body;
    const tenantId = req.tenantId || req.tenant?._id;
    const normalizedState = normalizeState(state);

    const clientQuery = { state: normalizedState, status: { $ne: 'inactive' } };
    if (tenantId) clientQuery.tenantId = tenantId;
    const matchingClients = await Client.find(clientQuery);
    const eligibleClients = matchingClients.filter(c => c.leadsReceived < c.leadCap);

    res.json({
      input: { name, state },
      normalizedState,
      normalizationSuccess: !!normalizedState,
      tenantId,
      matchingClients: matchingClients.map(c => ({ name: c.name, state: c.state, capacity: `${c.leadsReceived}/${c.leadCap}` })),
      wouldAssign: eligibleClients.length > 0,
      assignedTo: eligibleClients.length > 0 ? eligibleClients[0].name : null
    });
  } catch (err) {
    console.error('❌ TEST_ENDPOINT ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/normalize-states', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const clients = await Client.find({});
    const results = [];
    let updated = 0;

    for (const client of clients) {
      const oldState = client.state;
      const newState = normalizeState(oldState);
      if (newState && oldState !== newState) {
        client.state = newState;
        await client.save();
        updated++;
        results.push({ name: client.name, old: oldState, new: newState, fixed: true });
      } else if (!newState) {
        results.push({ name: client.name, old: oldState, new: 'INVALID', fixed: false });
      } else {
        results.push({ name: client.name, old: oldState, new: newState, fixed: false });
      }
    }

    res.json({ success: true, total: clients.length, updated, results });
  } catch (err) {
    console.error('❌ ADMIN_NORMALIZE ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Location Intelligence API Routes ──────────────────────────────────────────
app.use('/api/locations', locationRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
