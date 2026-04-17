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
// STATE NORMALIZATION HELPER
// ============================================
function normalizeState(state) {
  if (!state) return null;
  
  const trimmed = String(state).trim().toUpperCase();
  
  const stateAbbreviations = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
    'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
    'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
    'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
    'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
    'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
    'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
    'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY',
    'DISTRICT OF COLUMBIA': 'DC', 'WASHINGTON DC': 'DC', 'WASHINGTON D.C.': 'DC'
  };

  if (trimmed.length === 2) {
    return trimmed;
  }
  
  return stateAbbreviations[trimmed] || trimmed;
}

// ============================================
// LEAD DISTRIBUTION ENGINE (Shared Logic)
// ============================================
async function processLead(name, email, phone, rawState, source = 'form') {
  const results = {
    assignedTo: null,
    status: 'unassigned',
    reason: 'unknown',
    clientName: null
  };

  console.log('\n========================================');
  console.log('=== LEAD DISTRIBUTION ENGINE ===');
  console.log('========================================');
  console.log('Incoming Lead Data:');
  console.log('  Name:', name);
  console.log('  Email:', email);
  console.log('  Phone:', phone);
  console.log('  State (raw):', rawState);
  console.log('  Source:', source);

  // Validate required fields
  if (!name && !email) {
    console.error('❌ REJECTED: Missing name and email');
    results.reason = 'missing_fields';
    return results;
  }

  // Normalize state
  const normalizedState = normalizeState(rawState);
  console.log('  State (normalized):', normalizedState);

  if (!normalizedState) {
    console.warn('⚠️ WARNING: No state provided');
    results.reason = 'no_state';
    return results;
  }

  // Get all clients and log their states for debugging
  const allClients = await Client.find({});
  console.log('\n📋 ALL CLIENTS IN DATABASE:');
  console.log('  Total clients:', allClients.length);
  allClients.forEach(c => {
    console.log(`  - ${c.name} | State: "${c.state}" | Status: ${c.status} | Cap: ${c.leadCap} | Received: ${c.leadsReceived}`);
  });

  // Find clients matching state using case-insensitive regex
  const availableClients = await Client.find({
    state: { $regex: new RegExp('^' + normalizedState + '$', 'i') },
    status: { $ne: 'inactive' }
  });

  console.log(`\n🔍 Clients matching state "${normalizedState}": ${availableClients.length}`);
  
  if (availableClients.length > 0) {
    console.log('Matching clients details:');
    availableClients.forEach(c => {
      console.log(`  - ${c.name}: ${c.leadsReceived}/${c.leadCap} (${c.status})`);
    });
  }

  // Filter for clients with available capacity
  const eligibleClients = availableClients
    .filter(c => {
      const hasCapacity = c.leadsReceived < c.leadCap;
      if (!hasCapacity) {
        console.log(`  ⛔ ${c.name} has NO capacity (${c.leadsReceived}/${c.leadCap})`);
      }
      return hasCapacity;
    })
    .sort((a, b) => a.leadsReceived - b.leadsReceived);

  console.log(`\n✅ Eligible clients with capacity: ${eligibleClients.length}`);
  eligibleClients.forEach(c => {
    console.log(`  - ${c.name}: ${c.leadsReceived}/${c.leadCap}`);
  });

  // Assign to first eligible client
  let assignedClient = null;
  let assignmentReason = 'no_eligible_client';

  if (eligibleClients.length > 0) {
    assignedClient = eligibleClients[0];
    assignmentReason = 'assigned';
    console.log(`\n🎯 Primary candidate: ${assignedClient.name}`);
  } else if (availableClients.length === 0) {
    console.log(`\n❌ NO CLIENT MATCH for state "${normalizedState}"`);
    assignmentReason = 'no_client_for_state';
  } else {
    console.log(`\n❌ ALL MATCHING CLIENTS ARE FULL`);
    assignmentReason = 'all_clients_full';
  }

  // Atomic assignment with capacity check
  if (assignedClient) {
    console.log(`\n⚡ Attempting atomic assignment to: ${assignedClient.name}`);
    
    const updatedClient = await Client.findOneAndUpdate(
      { 
        _id: assignedClient._id,
        leadsReceived: { $lt: assignedClient.leadCap }
      },
      { $inc: { leadsReceived: 1 } },
      { new: true }
    );

    if (updatedClient) {
      results.assignedTo = assignedClient._id;
      results.status = 'assigned';
      results.clientName = assignedClient.name;
      results.reason = 'assigned';
      console.log(`✅ SUCCESS: Lead assigned to ${assignedClient.name}`);
      console.log(`   New count: ${updatedClient.leadsReceived}/${updatedClient.leadCap}`);
      
      if (updatedClient.leadsReceived >= updatedClient.leadCap) {
        await Client.findByIdAndUpdate(assignedClient._id, { status: 'full' });
        console.log(`🔴 ${assignedClient.name} is now FULL`);
      }

      await Activity.create({
        type: 'lead_assigned',
        message: `Lead ${name} assigned to ${assignedClient.name}`,
        clientId: assignedClient._id
      });
    } else {
      console.log(`⚠️ FAIL: Race condition, trying next...`);
      assignmentReason = 'race_condition';
      
      const remainingClients = eligibleClients.slice(1);
      for (const altClient of remainingClients) {
        const altUpdated = await Client.findOneAndUpdate(
          { _id: altClient._id, leadsReceived: { $lt: altClient.leadCap } },
          { $inc: { leadsReceived: 1 } },
          { new: true }
        );
        
        if (altUpdated) {
          results.assignedTo = altClient._id;
          results.status = 'assigned';
          results.clientName = altClient.name;
          results.reason = 'assigned_fallback';
          console.log(`✅ SUCCESS: Lead assigned to fallback client: ${altClient.name}`);
          
          if (altUpdated.leadsReceived >= altUpdated.leadCap) {
            await Client.findByIdAndUpdate(altClient._id, { status: 'full' });
          }
          
          await Activity.create({
            type: 'lead_assigned',
            message: `Lead ${name} assigned to ${altClient.name}`,
            clientId: altClient._id
          });
          break;
        }
      }
    }
  }

  console.log('\n📊 FINAL RESULT:');
  console.log(`  Status: ${results.status}`);
  console.log(`  Assigned to: ${results.clientName || 'NONE'}`);
  console.log(`  Reason: ${results.reason}`);
  console.log('========================================\n');

  return results;
}

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
  console.log("MongoDB Connected");
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    await User.create({ username: 'admin', password: 'admin123' });
    console.log("Default admin created: admin / admin123");
  }
})
.catch(err => console.log(err));

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

// 🔍 DEBUG: Check clients in database (no auth)
app.get('/api/debug/clients', async (req, res) => {
  try {
    const clients = await Client.find({}).sort({ state: 1, name: 1 });
    console.log('\n=== DEBUG: Clients in database ===');
    console.log(`Total: ${clients.length}`);
    
    const clientSummary = clients.map(c => {
      const available = c.leadCap - c.leadsReceived;
      return {
        name: c.name,
        state: c.state,
        stateLength: c.state?.length,
        status: c.status,
        cap: c.leadCap,
        received: c.leadsReceived,
        available: available,
        isFull: available <= 0
      };
    });
    
    clientSummary.forEach(c => {
      console.log(`  ${c.state.padEnd(5)} | ${c.name.padEnd(20)} | ${c.status.padEnd(8)} | ${c.received}/${c.cap} (${c.available} available)`);
    });
    
    // Group by state
    const byState = {};
    clients.forEach(c => {
      if (!byState[c.state]) byState[c.state] = [];
      byState[c.state].push(c);
    });
    
    console.log('\nClients by state:');
    Object.entries(byState).forEach(([state, stateClients]) => {
      const available = stateClients.filter(c => c.leadsReceived < c.leadCap);
      console.log(`  ${state}: ${stateClients.length} total, ${available.length} with capacity`);
    });
    
    res.json({ 
      count: clients.length, 
      clients: clientSummary,
      byState 
    });
  } catch (err) {
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
    
    res.json({
      totalLeads,
      totalClients,
      leadsToday,
      unassignedLeads
    });
  } catch (err) {
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
    res.status(500).json(err);
  }
});

// 🔥 RECEIVE LEAD (uses shared distribution engine)
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, phone, state, source = 'form', notes, metadata } = req.body;

    // Process the lead using shared engine
    const processResult = await processLead(name, email, phone, state, source);

    // Create the lead
    const lead = await Lead.create({
      name: name || 'Unknown',
      email: email || 'no-email@system.local',
      phone: phone || null,
      state: normalizeState(state) || 'UNKNOWN',
      source,
      assignedTo: processResult.assignedTo,
      status: processResult.status,
      notes,
      metadata
    });

    // Create activity log
    await Activity.create({
      type: processResult.status === 'assigned' ? 'lead_assigned' : 'lead_received',
      message: processResult.status === 'assigned' 
        ? `Lead ${name} assigned to ${processResult.clientName}` 
        : `New lead received from ${source}: ${name} (${processResult.reason})`,
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
    console.error('❌ Lead error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook endpoint for GHL integration
app.post('/api/webhooks/lead', async (req, res) => {
  try {
    console.log('\n=== GHL WEBHOOK RECEIVED ===');
    console.log('Full Request Body:', JSON.stringify(req.body, null, 2));

    // GHL sends state in various fields - check all possibilities
    const rawState = 
      req.body.state || 
      req.body.state_province || 
      req.body.location_state ||
      req.body.customFields?.state ||
      req.body.custom_fields?.state ||
      req.body.location?.state;

    const { 
      contact_name, 
      firstName, 
      lastName,
      name,
      email, 
      phone, 
      source = 'webhook' 
    } = req.body;

    // Build name from various possible fields
    const leadName = contact_name || name || `${firstName || ''} ${lastName || ''}`.trim() || email || 'Unknown';
    
    console.log('Raw incoming state:', rawState, '| Type:', typeof rawState);
    console.log('Extracted name:', leadName);
    console.log('Email:', email);

    // Normalize and validate incoming data
    const normalizedState = normalizeState(rawState);
    console.log('Normalized state:', normalizedState);

    // Process the lead using shared engine (directly, not via HTTP)
    const processResult = await processLead(leadName, email, phone, rawState, source);

    // Create the lead
    const lead = await Lead.create({
      name: leadName || 'Unknown',
      email: email || 'no-email@webhook.local',
      phone: phone || null,
      state: normalizedState || 'UNKNOWN',
      source: source || 'webhook',
      assignedTo: processResult.assignedTo,
      status: processResult.status
    });

    // Create activity log
    await Activity.create({
      type: processResult.status === 'assigned' ? 'lead_assigned' : 'lead_received',
      message: processResult.status === 'assigned' 
        ? `Webhook lead ${leadName} assigned to ${processResult.clientName}` 
        : `Webhook lead received: ${leadName} (${processResult.reason})`,
      leadId: lead._id,
      clientId: processResult.assignedTo
    });

    console.log('Webhook lead processing complete:', processResult);
    res.json({
      success: true,
      lead,
      assignedTo: processResult.clientName,
      status: processResult.status,
      reason: processResult.reason
    });

  } catch (err) {
    console.error('Webhook error:', err);
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

    res.json({
      leads,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// 📊 GET CLIENTS
app.get('/api/clients', auth, async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json(err);
  }
});

// ➕ ADD CLIENT
app.post('/api/clients', auth, async (req, res) => {
  try {
    const { name, email, state, leadCap, status = 'active', notes } = req.body;

    console.log('\n=== CREATING NEW CLIENT ===');
    console.log('Input state:', state);

    // Normalize state before storing
    const normalizedState = normalizeState(state);
    console.log('Normalized state:', normalizedState);

    // Validate required fields
    if (!name || !normalizedState) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and state are required' 
      });
    }

    // Ensure leadCap is a valid number
    const cap = parseInt(leadCap) || 0;
    if (cap <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Lead cap must be a positive number' 
      });
    }

    const clientData = {
      name,
      email: email || '',
      state: normalizedState, // Always store normalized
      leadCap: cap,
      leadsReceived: 0,
      status: status || 'active',
      notes: notes || ''
    };

    console.log('Client data to save:', clientData);

    const client = await Client.create(clientData);
    
    await Activity.create({
      type: 'client_created',
      message: `New client added: ${client.name} (${client.state})`,
      clientId: client._id
    });

    console.log('✅ Client created successfully:', client.name);
    res.json(client);
  } catch (err) {
    console.error('❌ Client creation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✏️ UPDATE CLIENT
app.put('/api/clients/:id', auth, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Normalize state if provided
    if (updateData.state) {
      updateData.state = normalizeState(updateData.state);
    }
    
    // Parse leadCap to number
    if (updateData.leadCap) {
      updateData.leadCap = parseInt(updateData.leadCap);
    }
    
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    await Activity.create({
      type: 'client_updated',
      message: `Client updated: ${client.name}`,
      clientId: client._id
    });

    res.json(client);
  } catch (err) {
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
    console.error('Client delete error:', err);
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json(err);
  }
});

// 🧪 TEST ENDPOINT - Test lead assignment without auth
app.post('/api/test/lead', async (req, res) => {
  try {
    const { name, email, phone, state, source = 'test' } = req.body;
    
    console.log('\n🧪 TEST LEAD ENDPOINT');
    console.log('Input state:', state);
    
    const normalizedState = normalizeState(state);
    console.log('Normalized state:', normalizedState);
    
    // Check matching clients
    const matchingClients = await Client.find({
      state: { $regex: new RegExp('^' + normalizedState + '$', 'i') }
    });
    
    const eligibleClients = matchingClients.filter(c => c.leadsReceived < c.leadCap);
    
    res.json({
      input: { name, email, state },
      normalizedState,
      matchingClients: matchingClients.map(c => ({
        name: c.name,
        state: c.state,
        capacity: `${c.leadsReceived}/${c.leadCap}`,
        status: c.status
      })),
      eligibleClients: eligibleClients.map(c => ({
        name: c.name,
        state: c.state,
        capacity: `${c.leadsReceived}/${c.leadCap}`
      })),
      wouldAssign: eligibleClients.length > 0,
      assignedTo: eligibleClients.length > 0 ? eligibleClients[0].name : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 👤 AUTH - REGISTER (for initial setup)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.create({ username, password });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
});

// 🔧 ADMIN: Normalize all client states (run once to fix existing data)
app.post('/api/admin/normalize-states', auth, async (req, res) => {
  try {
    const clients = await Client.find({});
    const results = [];
    
    for (const client of clients) {
      const oldState = client.state;
      const newState = normalizeState(oldState);
      
      if (oldState !== newState) {
        client.state = newState;
        await client.save();
        results.push({ name: client.name, old: oldState, new: newState, updated: true });
      } else {
        results.push({ name: client.name, old: oldState, new: newState, updated: false });
      }
    }
    
    const updatedCount = results.filter(r => r.updated).length;
    console.log(`\n🔧 State normalization complete: ${updatedCount}/${clients.length} clients updated`);
    
    res.json({ 
      success: true, 
      total: clients.length,
      updated: updatedCount,
      results 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));