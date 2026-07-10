require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config');

const Tenant = require('./src/models/Tenant');
const User = require('./src/models/User');

async function seed() {
  try {
    await mongoose.connect(config.mongo.uri);
    console.log('Connected to MongoDB');

    let tenant = await Tenant.findOne({ slug: 'default' });
    if (!tenant) {
      tenant = await Tenant.create({ name: 'Default Workspace', slug: 'default', status: 'active' });
      console.log('Created default tenant:', tenant.slug);
    } else {
      console.log('Default tenant exists:', tenant.slug);
    }

    const adminEmail = 'admin@leaddistro.com';
    let admin = await User.findOne({ email: adminEmail, tenantId: tenant._id });
    if (!admin) {
      admin = await User.create({
        email: adminEmail,
        password: 'Admin123!',
        name: 'Admin User',
        role: 'super_admin',
        tenantId: tenant._id,
        status: 'active',
      });
      console.log('Created admin user:', adminEmail);
    } else {
      console.log('Admin user exists:', adminEmail);
    }

    console.log('\n--- Seed Complete ---');
    console.log('Tenant Slug: default');
    console.log('Admin Email: admin@leaddistro.com');
    console.log('Admin Password: Admin123!');
    console.log('Admin Role: super_admin');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
