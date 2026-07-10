const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

async function connectDatabase() {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(config.mongo.uri);
  logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

module.exports = { connectDatabase, disconnectDatabase };
