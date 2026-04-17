require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const Client = require('./models/Client');
const Lead = require('./models/Lead');
const User = require('./models/User');
const Activity = require('./models/Activity');

const app = express();
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ============================================
// HEALTH CHECK (place this early to verify routes load)
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// STATE NORMALIZATION MODULE
// ============================================

// Bidirectional state mapping - handles both abbreviations AND full names
const US_STATES = {
  // Full names -> Abbreviations (lowercase keys for normalization)
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
  
  // Abbreviations (both cases)
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

/**
 * Normalizes a state input to a standardized 2-letter US state code.
 * Handles: "Texas", "TEXAS", "texas", "TX", "tx" -> "TX"
 * 
 * @param {string|number} state - The state input to normalize
 * @returns {string|null} - Normalized state code or null if invalid
 */
function normalizeState(state) {
  // Handle null, undefined, or non-string inputs
  if (state === null || state === undefined) {
    console.log(`[normalizeState] Input: null/undefined -> null`);
    return null;
  }
  
  if (typeof state !== 'string') {
    console.log(`[normalizeState] Input type: ${typeof state}, converting to string`);
    state = String(state);
  }
  
  // Trim whitespace and convert to lowercase for matching
  const trimmed = state.trim().toLowerCase();
  
  // Check for empty string
  if (trimmed === '') {
    console.log(`[normalizeState] Input: empty string -> null`);
    return null;
  }
  
  // Look up in state map
  const normalized = US_STATES[trimmed];
  
  if (normalized) {
    console.log(`[normalizeState] "${state}" -> "${normalized}" ✓`);
    return normalized;
  }
  
  // State not found in map - log warning
  console.warn(`[normalizeState] "${state}" -> INVALID STATE (not found in map)`);
  return null;
}

/**
 * Validates if a state code is valid US state
 * @param {string} state 
 * @returns {boolean}
 */
function isValidState(state) {
  if (!state) return false;
  return Object.values(US_STATES).includes(state.toUpperCase());
}

// ============================================
// LOGGING HELPER
// ============================================
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
  
  console.error(`[${entryPoint}] ${timestamp} | LeadID: ${leadId} | State: "${state}" | Step: ${step} | ERROR: ${error.message}`, {
    stack: error.stack
  });
}

// ============================================
// LEAD DISTRIBUTION ENGINE
// ============================================
async function processLead(name, email, phone, rawState, source = 'form') {
  const results = {
    assignedTo: null,
    status: 'unassigned',
    reason: 'unknown',
    clientName: null
  };

  const leadData = { rawState, name, email, source };
  
  log('processLead', leadData, 'START', 'INITIALIZED', { name, email, phone, rawState, source });

  // Step 1: Validate required fields
  if (!name && !email) {
    log('processLead', leadData, 'VALIDATION', 'REJECTED', { reason: 'missing_name_and_email' });
    results.reason = 'missing_fields';
    return results;
  }

  // Step 2: Normalize state - CRITICAL STEP
  const normalizedState = normalizeState(rawState);
  log('processLead', { ...leadData, normalizedState }, 'STATE_NORMALIZATION', normalizedState ? 'SUCCESS' : 'FAILED', {
    rawState,
    normalizedState,
    reason: !normalizedState ? 'state_not_found_in_map' : null
  });

  // Step 3: Validate normalized state
  if (!normalizedState) {
    log('processLead', leadData, 'STATE_VALIDATION', 'INVALID', {
      rawState,
      type: typeof rawState,
      reason: 'state_not_mapped_to_valid_us_state_code'
    });
    results.reason = 'invalid_state';
    return results;
  }

  // Step 4: Fetch ALL clients from database for debugging
  log('processLead', { ...leadData, normalizedState }, 'FETCH_ALL_CLIENTS', 'QUERYING', {});
  
  let allClients = [];
  try {
    allClients = await Client.find({});
    log('processLead', { ...leadData, normalizedState }, 'FETCH_ALL_CLIENTS', 'SUCCESS', { count: allClients.length });
    
    console.log('\n📋 ALL CLIENTS IN DATABASE:');
    allClients.forEach(c => {
      console.log(`  - "${c.state}" | ${c.name} | ${c.status} | ${c.leadsReceived}/${c.leadCap}`);
    });
  } catch (error) {
    logError('processLead', { ...leadData, normalizedState }, 'FETCH_ALL_CLIENTS', error);
    results.reason = 'db_error';
    return results;
  }

  // Step 5: Find clients matching normalized state
  // Using exact match with normalized state code
  log('processLead', { ...leadData, normalizedState }, 'QUERY_MATCHING', 'EXECUTING', {
    normalizedState,
    query: { state: normalizedState, status: { $ne: 'inactive' } }
  });
  
  let availableClients = [];
  try {
    // EXACT MATCH: Normalized state code must match exactly (e.g., "TX")
    availableClients = await Client.find({
      state: normalizedState,  // Direct match on normalized code
      status: { $ne: 'inactive' }
    });
    
    log('processLead', { ...leadData, normalizedState }, 'QUERY_MATCHING', availableClients.length > 0 ? 'FOUND' : 'ZERO_RESULTS', {
      normalizedState,
      matchCount: availableClients.length,
      allStates: [...new Set(allClients.map(c => c.state))]
    });
    
    if (availableClients.length === 0) {
      console.log(`\n⚠️ NO CLIENTS MATCH "${normalizedState}"`);
      console.log('Available state codes in database:');
      const stateGroups = {};
      allClients.forEach(c => {
        if (!stateGroups[c.state]) stateGroups[c.state] = [];
        stateGroups[c.state].push(c.name);
      });
      Object.entries(stateGroups).forEach(([state, clients]) => {
        console.log(`  ${state}: ${clients.join(', ')}`);
      });
    } else {
      console.log(`\n✅ Found ${availableClients.length} client(s) for "${normalizedState}":`);
      availableClients.forEach(c => {
        console.log(`  - ${c.name}: ${c.leadsReceived}/${c.leadCap} (${c.status})`);
      });
    }
  } catch (error) {
    logError('processLead', { ...leadData, normalizedState }, 'QUERY_MATCHING', error);
    results.reason = 'db_error';
    return results;
  }

  // Step 6: Filter for capacity
  const eligibleClients = availableClients
    .filter(c => {
      // Type safety check
      if (typeof c.leadCap !== 'number' || typeof c.leadsReceived !== 'number') {
        log('processLead', { ...leadData, normalizedState }, 'CAPACITY_CHECK', 'SKIPPED', {
          client: c.name,
          reason: 'invalid_number_type',
          leadCap: c.leadCap,
          leadsReceived: c.leadsReceived
        });
        return false;
      }
      
      const hasCapacity = c.leadsReceived < c.leadCap;
      if (!hasCapacity) {
        console.log(`  ⛔ ${c.name} at capacity (${c.leadsReceived}/${c.leadCap})`);
      }
      return hasCapacity;
    })
    .sort((a, b) => a.leadsReceived - b.leadsReceived);

  log('processLead', { ...leadData, normalizedState }, 'CAPACITY_FILTER', 'COMPLETE', {
    matchingClients: availableClients.length,
    eligibleClients: eligibleClients.length
  });

  if (eligibleClients.length > 0) {
    console.log(`\n✅ Eligible clients with capacity: ${eligibleClients.length}`);
    eligibleClients.forEach(c => {
      console.log(`  - ${c.name}: ${c.leadsReceived}/${c.leadCap}`);
    });
  }

  // Step 7: Assign to best client
  let assignedClient = null;
  
  if (eligibleClients.length > 0) {
    // Pick client with fewest leads (round-robin)
    assignedClient = eligibleClients[0];
    log('processLead', { ...leadData, normalizedState }, 'CLIENT_SELECTED', 'SUCCESS', {
      clientName: assignedClient.name,
      clientState: assignedClient.state,
      currentLeads: assignedClient.leadsReceived,
      capacity: assignedClient.leadCap
    });
  } else if (availableClients.length > 0) {
    log('processLead', { ...leadData, normalizedState }, 'CLIENT_SELECTED', 'NONE_ELIGIBLE', {
      reason: 'all_clients_at_capacity',
      matchingClients: availableClients.length
    });
    results.reason = 'all_clients_full';
    return results;
  } else {
    log('processLead', { ...leadData, normalizedState }, 'CLIENT_SELECTED', 'NO_MATCH', {
      reason: 'no_clients_for_state',
      searchedState: normalizedState
    });
    results.reason = 'no_client_for_state';
    return results;
  }

  // Step 8: Atomic assignment
  log('processLead', { ...leadData, normalizedState }, 'ATOMIC_ASSIGN', 'EXECUTING', {
    clientId: assignedClient._id,
    clientName: assignedClient.name,
    expectedLeads: assignedClient.leadsReceived,
    capacity: assignedClient.leadCap
  });
  
  try {
    const updatedClient = await Client.findOneAndUpdate(
      { 
        _id: assignedClient._id,
        leadsReceived: { $lt: assignedClient.leadCap }
      },
      { $inc: { leadsReceived: 1 } },
      { new: true }
    );

    if (updatedClient) {
      // Success!
      results.assignedTo = assignedClient._id;
      results.status = 'assigned';
      results.clientName = assignedClient.name;
      results.reason = 'assigned';
      
      log('processLead', { ...leadData, normalizedState }, 'ASSIGNMENT', 'SUCCESS', {
        clientName: assignedClient.name,
        newLeadsReceived: updatedClient.leadsReceived,
        capacity: updatedClient.leadCap
      });
      
      // Update status to full if at capacity
      if (updatedClient.leadsReceived >= updatedClient.leadCap) {
        await Client.findByIdAndUpdate(assignedClient._id, { status: 'full' });
        log('processLead', { ...leadData, normalizedState }, 'CLIENT_FULL', 'UPDATED', { clientName: assignedClient.name });
      }
      
      // Create activity
      await Activity.create({
        type: 'lead_assigned',
        message: `Lead ${name} assigned to ${assignedClient.name}`,
        clientId: assignedClient._id
      });
    } else {
      // Race condition - client became full
      log('processLead', { ...leadData, normalizedState }, 'ASSIGNMENT', 'RACE_CONDITION', {
        reason: 'client_became_full_during_assignment'
      });
      results.reason = 'race_condition';
    }
  } catch (error) {
    logError('processLead', { ...leadData, normalizedState }, 'ATOMIC_ASSIGN', error);
    results.reason = 'db_error';
  }

  log('processLead', { ...leadData, normalizedState }, 'COMPLETE', results.status.toUpperCase(), {
    assignedTo: results.clientName,
    reason: results.reason
  });

  return results;
}

// ============================================
// MONGODB CONNECTION
// ============================================
mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log("✅ MongoDB Connected");
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    await User.create({ username: 'admin', password: 'admin123' });
    console.log("✅ Default admin created: admin / admin123");
  }
})
.catch(err => {
  console.error('❌ MongoDB Connection Failed:', err.message);
});

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ============================================
// ENDPOINTS
// ============================================

// 🔍 DEBUG: Check clients in database
app.get('/api/debug/clients', async (req, res) => {
  try {
    const clients = await Client.find({}).sort({ state: 1, name: 1 });
    
    console.log('\n📋 DEBUG: Clients in database:');
    clients.forEach(c => {
      console.log(`  "${c.state}" | ${c.name.padEnd(20)} | ${c.status.padEnd(8)} | ${c.leadsReceived}/${c.leadCap}`);
    });
    
    // Check for non-normalized states
    const nonNormalized = clients.filter(c => c.state !== c.state?.toUpperCase() || c.state.length !== 2);
    if (nonNormalized.length > 0) {
      console.log('\n⚠️ CLIENTS WITH NON-NORMALIZED STATES:');
      nonNormalized.forEach(c => {
        console.log(`  "${c.state}" (${c.state.length} chars) - ${c.name}`);
      });
    }
    
    res.json({ count: clients.length, clients });
  } catch (err) {
    console.error('❌ DEBUG ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

// 📊 STATS
app.get('/api/stats', auth, async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const totalClients = await Client.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leadsToday = await Lead.countDocuments({ createdAt: { $gte: today } });
    const unassignedLeads = await Lead.countDocuments({ assignedTo: null });
    
    res.json({ totalLeads, totalClients, leadsToday, unassignedLeads });
  } catch (err) {
    console.error('❌ STATS ERROR:', err);
    res.status(500).json(err);
  }
});

// 📋 ACTIVITY FEED
app.get('/api/activities', auth, async (req, res) => {
  try {
    const activities = await Activity.find()
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

// 🔥 RECEIVE LEAD (form submission)
app.post('/api/leads', async (req, res) => {
  console.log('\n========================================');
  console.log('[LEADS_ENDPOINT] New lead received');
  console.log(`[LEADS_ENDPOINT] Raw body: ${JSON.stringify(req.body)}`);
  
  try {
    const { name, email, phone, state, source = 'form', notes, metadata } = req.body;

    // Process the lead
    const processResult = await processLead(name, email, phone, state, source);

    // Create the lead with NORMALIZED state
    const normalizedState = normalizeState(state);
    const lead = await Lead.create({
      name: name || 'Unknown',
      email: email || 'no-email@system.local',
      phone: phone || null,
      state: normalizedState || 'UNKNOWN',
      source,
      assignedTo: processResult.assignedTo,
      status: processResult.status,
      notes,
      metadata
    });

    // Create activity
    await Activity.create({
      type: processResult.status === 'assigned' ? 'lead_assigned' : 'lead_received',
      message: processResult.status === 'assigned' 
        ? `Lead ${name} assigned to ${processResult.clientName}` 
        : `Lead received: ${name} (${processResult.reason})`,
      leadId: lead._id,
      clientId: processResult.assignedTo
    });

    res.json({
      success: true,
      lead,
      assignedTo: processResult.clientName,
      status: processResult.status,
      reason: processResult.reason
    });

  } catch (err) {
    console.error('❌ LEADS_ENDPOINT ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// WEBHOOK ENDPOINT FOR GHL
// ============================================
app.post('/api/webhooks/lead', async (req, res) => {
  console.log('\n========================================');
  console.log('🌐 WEBHOOK RECEIVED');
  console.log('========================================');
  console.log('RAW PAYLOAD:', JSON.stringify(req.body, null, 2));
  console.log('========================================\n');

  try {
    const body = req.body;
    
    // Handle nested payload structures from GHL
    const data = body.data || body.payload || body.lead || body.contact || body;
    
    console.log('[WEBHOOK] Payload structure:');
    console.log('  body keys:', Object.keys(body));
    console.log('  data keys:', Object.keys(data));

    // Extract state from multiple possible locations
    const rawState = 
      data.state || 
      data.state_province || 
      data.location_state ||
      data.location?.state ||
      data.address?.state ||
      data.address?.state_province ||
      data.customFields?.state ||
      data.custom_fields?.state ||
      body.state ||
      body.state_province;

    console.log('[WEBHOOK] State extraction:');
    console.log('  rawState found:', rawState);

    // Extract other fields
    const contact_name = data.contact_name || data.name || body.contact_name || body.name;
    const firstName = data.firstName || data.first_name || body.firstName;
    const lastName = data.lastName || data.last_name || body.lastName;
    const email = data.email || body.email;
    const phone = data.phone || data.phoneNumber || data.phone_number || body.phone;
    const source = data.source || body.source || 'webhook';

    const leadName = contact_name || 
                     `${firstName || ''} ${lastName || ''}`.trim() || 
                     email || 
                     'Unknown';

    console.log('[WEBHOOK] Extracted data:');
    console.log('  name:', leadName);
    console.log('  email:', email);
    console.log('  state:', rawState);

    // Validate state exists
    if (!rawState) {
      console.warn('[WEBHOOK] ⚠️ WARNING: No state found in payload');
      console.warn('[WEBHOOK] Available fields:', Object.keys(data));
    }

    // Process the lead
    const processResult = await processLead(leadName, email, phone, rawState, source);

    // Create the lead with NORMALIZED state
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

    // Create activity
    await Activity.create({
      type: processResult.status === 'assigned' ? 'lead_assigned' : 'lead_received',
      message: processResult.status === 'assigned' 
        ? `Webhook lead ${leadName} → ${processResult.clientName}` 
        : `Webhook lead received: ${leadName} (${processResult.reason})`,
      leadId: lead._id,
      clientId: processResult.assignedTo
    });

    console.log('\n🌐 WEBHOOK RESULT:', {
      success: true,
      leadId: lead._id,
      status: processResult.status,
      assignedTo: processResult.clientName,
      reason: processResult.reason
    });
    
    res.json({
      success: true,
      lead,
      assignedTo: processResult.clientName,
      status: processResult.status,
      reason: processResult.reason
    });

  } catch (err) {
    console.error('❌ WEBHOOK ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🗑️ DELETE LEAD
app.delete('/api/leads/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.assignedTo) {
      await Client.findByIdAndUpdate(lead.assignedTo, {
        $inc: { leadsReceived: -1 }
      });
    }

    await Lead.findByIdAndDelete(req.params.id);

    await Activity.create({
      type: 'lead_deleted',
      message: `Lead deleted: ${lead.name}`,
      leadId: null,
      clientId: lead.assignedTo
    });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ DELETE_LEAD ERROR:', err);
    res.status(500).json(err);
  }
});

// 📊 GET LEADS
app.get('/api/leads', auth, async (req, res) => {
  try {
    const { status, state, assignedTo, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (state) query.state = state;
    if (assignedTo) query.assignedTo = assignedTo;

    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('assignedTo', 'name email state');

    const total = await Lead.countDocuments(query);

    res.json({ leads, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('❌ GET_LEADS ERROR:', err);
    res.status(500).json(err);
  }
});

// 📊 GET CLIENTS
app.get('/api/clients', auth, async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    console.error('❌ GET_CLIENTS ERROR:', err);
    res.status(500).json(err);
  }
});

// ➕ ADD CLIENT - WITH STATE NORMALIZATION
app.post('/api/clients', auth, async (req, res) => {
  try {
    const { name, email, state, leadCap, status = 'active', notes } = req.body;

    // CRITICAL: Normalize state before storing
    const normalizedState = normalizeState(state);
    
    if (!normalizedState) {
      console.warn(`[ADD_CLIENT] Invalid state: "${state}"`);
      return res.status(400).json({ 
        success: false, 
        error: `Invalid state: "${state}". Please use a valid US state abbreviation or name.`
      });
    }

    const cap = parseInt(leadCap) || 0;
    if (cap <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Lead cap must be a positive number' 
      });
    }

    const client = await Client.create({
      name,
      email: email || '',
      state: normalizedState,  // Always store normalized code
      leadCap: cap,
      leadsReceived: 0,
      status: status || 'active',
      notes: notes || ''
    });
    
    console.log(`✅ Client created: ${client.name} | State: "${client.state}"`);
    
    await Activity.create({
      type: 'client_created',
      message: `New client: ${client.name} (${client.state})`,
      clientId: client._id
    });

    res.json(client);
  } catch (err) {
    console.error('❌ ADD_CLIENT ERROR:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✏️ UPDATE CLIENT - WITH STATE NORMALIZATION
app.put('/api/clients/:id', auth, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Normalize state if provided
    if (updateData.state) {
      const normalizedState = normalizeState(updateData.state);
      if (!normalizedState) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid state: "${updateData.state}"` 
        });
      }
      updateData.state = normalizedState;
    }
    
    if (updateData.leadCap) {
      updateData.leadCap = parseInt(updateData.leadCap);
    }
    
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    console.log(`✅ Client updated: ${client.name} | State: "${client.state}"`);
    
    await Activity.create({
      type: 'client_updated',
      message: `Client updated: ${client.name}`,
      clientId: client._id
    });

    res.json(client);
  } catch (err) {
    console.error('❌ UPDATE_CLIENT ERROR:', err);
    res.status(500).json(err);
  }
});

// 🗑️ DELETE CLIENT
app.delete('/api/clients/:id', auth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    
    await Client.findByIdAndDelete(req.params.id);

    await Activity.create({
      type: 'client_deleted',
      message: `Client deleted: ${client.name}`,
      clientId: null
    });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ DELETE_CLIENT ERROR:', err);
    res.status(500).json(err);
  }
});

// 🔄 RESET CLIENT LEAD COUNT
app.post('/api/clients/:id/reset', auth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    client.leadsReceived = 0;
    client.status = 'active';
    await client.save();

    await Activity.create({
      type: 'lead_cap_reset',
      message: `Lead count reset for ${client.name}`,
      clientId: client._id
    });

    res.json(client);
  } catch (err) {
    console.error('❌ RESET_CLIENT ERROR:', err);
    res.status(500).json(err);
  }
});

// 👤 AUTH - LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('❌ LOGIN ERROR:', err);
    res.status(500).json(err);
  }
});

// 🧪 TEST ENDPOINT
app.post('/api/test/lead', async (req, res) => {
  try {
    const { name, email, phone, state, source = 'test' } = req.body;
    
    console.log(`\n🧪 TEST: name="${name}" state="${state}"`);
    
    const normalizedState = normalizeState(state);
    
    // Check for matching clients
    const matchingClients = await Client.find({
      state: normalizedState,
      status: { $ne: 'inactive' }
    });
    
    const eligibleClients = matchingClients.filter(c => 
      c.leadsReceived < c.leadCap
    );
    
    res.json({
      input: { name, state },
      normalizedState,
      normalizationSuccess: !!normalizedState,
      matchingClients: matchingClients.map(c => ({
        name: c.name,
        state: c.state,
        capacity: `${c.leadsReceived}/${c.leadCap}`
      })),
      wouldAssign: eligibleClients.length > 0,
      assignedTo: eligibleClients.length > 0 ? eligibleClients[0].name : null
    });
  } catch (err) {
    console.error('❌ TEST_ENDPOINT ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

// 👤 AUTH - REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.create({ username, password });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ REGISTER ERROR:', err);
    res.status(500).json(err);
  }
});

// 🔧 ADMIN: Normalize ALL existing client states
app.post('/api/admin/normalize-states', auth, async (req, res) => {
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
    
    console.log(`\n🔧 Normalized ${updated}/${clients.length} clients`);
    res.json({ success: true, total: clients.length, updated, results });
  } catch (err) {
    console.error('❌ ADMIN_NORMALIZE ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
