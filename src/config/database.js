const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected — leads may start failing until connection is restored');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  const conn = await mongoose.connect(config.mongo.uri, {
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
  });

  logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`, {
    maxPoolSize: 20,
    minPoolSize: 5,
  });

  return conn;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

module.exports = { connectDatabase, disconnectDatabase };
