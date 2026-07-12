require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config');
const logger = require('./src/utils/logger');

const Tenant = require('./src/models/Tenant');
const User = require('./src/models/User');

const SEED_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@leaddistro.com';
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

async function seed() {
  try {
    await mongoose.connect(config.mongo.uri);
    logger.info('Connected to MongoDB');

    let tenant = await Tenant.findOne({ slug: 'default' });
    if (!tenant) {
      tenant = await Tenant.create({ name: 'Default Workspace', slug: 'default', status: 'active' });
      logger.info('Created default tenant: default');
    } else {
      logger.info('Default tenant exists: default');
    }

    let admin = await User.findOne({ email: SEED_EMAIL, tenantId: tenant._id }).select('+password');
    if (!admin) {
      admin = await User.create({
        email: SEED_EMAIL,
        password: SEED_PASSWORD,
        name: 'Admin User',
        role: 'super_admin',
        tenantId: tenant._id,
        status: 'active',
      });
      logger.info('Created admin user');
    } else {
      admin.password = SEED_PASSWORD;
      await admin.save();
      logger.info('Admin user exists — password reset');
    }

    logger.info('Seed complete');
  } catch (err) {
    logger.error('Seed failed', { error: err.message });
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

seed();
