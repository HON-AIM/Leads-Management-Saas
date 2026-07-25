require('dotenv').config();

const config = require('./src/config');
const mongoose = require('mongoose');

require('./src/models/Tenant');
require('./src/models/User');

const TENANT_NAME = process.env.SEED_TENANT_NAME || 'Default Workspace';
const TENANT_SLUG = process.env.SEED_TENANT_SLUG || 'default';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@leaddistro.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Admin User';

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongo.uri);
  console.log('Connected.\n');

  const Tenant = mongoose.model('Tenant');
  const User = mongoose.model('User');

  let tenant = await Tenant.findOne({ slug: TENANT_SLUG });
  if (tenant) {
    console.log(`Tenant already exists (slug: ${TENANT_SLUG}, id: ${tenant._id}) — skipping creation.`);
  } else {
    tenant = await Tenant.create({ name: TENANT_NAME, slug: TENANT_SLUG });
    console.log(`Tenant created (slug: ${TENANT_SLUG}, id: ${tenant._id}).`);
  }

  let admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase(), tenantId: tenant._id });
  if (admin) {
    console.log(`Admin user already exists (email: ${ADMIN_EMAIL}, id: ${admin._id}) — skipping creation.`);
    console.log('\nNo changes made. Existing credentials are intact.');
  } else {
    admin = await User.create({
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
      role: 'super_admin',
      tenantId: tenant._id,
      status: 'active',
    });
    console.log(`\nAdmin user created successfully.`);
    console.log(`  email:    ${ADMIN_EMAIL}`);
    console.log(`  password: ${ADMIN_PASSWORD}`);
    console.log(`  role:     super_admin`);
    console.log(`  tenant:   ${TENANT_SLUG} (${tenant._id})`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
