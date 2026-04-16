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
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// 🔥 RECEIVE LEAD (with distribution engine)
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, phone, state, source = 'form', notes, metadata } = req.body;

    // Distribution Engine: Find available client
    const client = await Client.findOne({
      state: state,
      $expr: { $lt: ["$leadsReceived", "$leadCap"] }
    }).sort({ leadsReceived: 1 }); // Assign to client with fewest leads

    let assignedTo = null;
    let status = 'unassigned';

    if (client) {
      assignedTo = client._id;
      client.leadsReceived += 1;
      await client.save();
      status = 'assigned';

      // Log activity
      await Activity.create({
        type: 'lead_assigned',
        message: `Lead ${name} assigned to ${client.name}`,
        clientId: client._id,
        leadId: null
      });
    }

    // Create lead
    const lead = await Lead.create({
      name,
      email,
      phone,
      state,
      source,
      assignedTo,
      status,
      notes,
      metadata
    });

    // Log activity
    await Activity.create({
      type: 'lead_received',
      message: `New lead received from ${source}: ${name}`,
      leadId: lead._id,
      clientId: assignedTo
    });

    res.json({
      success: true,
      lead,
      assignedTo: client ? client.name : "No client available",
      status
    });

  } catch (err) {
    console.error('Lead error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook endpoint for GHL integration
app.post('/api/webhooks/lead', async (req, res) => {
  try {
    const { contact_name, email, phone, state, source = 'webhook' } = req.body;
    
    // Transform webhook data to lead format
    const leadData = {
      name: contact_name || email,
      email,
      phone,
      state,
      source
    };

    const result = await fetch(`http://localhost:5000/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    }).then(res => res.json());

    res.json(result);
  } catch (err) {
    res.status(500).json(err);
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
    const client = await Client.create(req.body);
    
    await Activity.create({
      type: 'client_created',
      message: `New client added: ${client.name}`,
      clientId: client._id
    });

    res.json(client);
  } catch (err) {
    res.status(500).json(err);
  }
});

// ✏️ UPDATE CLIENT
app.put('/api/clients/:id', auth, async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
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
    await Client.findByIdAndDelete(req.params.id);

    await Activity.create({
      type: 'client_deleted',
      message: `Client deleted: ${client.name}`,
      clientId: null
    });

    res.json({ success: true });
  } catch (err) {
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));