require('dotenv').config();
const config = require('./src/config');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { connectDatabase: connectDB } = require('./src/config/database');
const logger = require('./src/utils/logger');
const { apiLimiter } = require('./src/middleware/rateLimit');

const app = express();

app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = config.allowedOrigins.length > 0
      ? config.allowedOrigins
      : [config.frontendUrl];
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (!config.isProduction) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', apiLimiter);

app.use('/api/auth', require('./src/modules/auth'));
app.use('/api/dashboard', require('./src/modules/dashboard'));
app.use('/api/campaigns', require('./src/modules/campaigns'));
app.use('/api/buyers', require('./src/modules/buyers'));
app.use('/api/leads', require('./src/modules/leads'));
app.use('/api/ingest', require('./src/modules/leadsIngestion'));
app.use('/api/delivery-logs', require('./src/modules/deliveryLogs'));
app.use('/api/settings', require('./src/modules/settings'));
app.use('/api/variables', require('./src/modules/variable-registry/registry.routes'));

app.get('/api/health', async (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    success: true,
    data: {
      status: mongoState === 1 ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      mongodb: states[mongoState] || 'unknown',
    },
  });
});

app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, path: req.path });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

async function start() {
  try {
    await connectDB();
    logger.info('MongoDB connected');

    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down`);
      server.close(() => {
        mongoose.connection.close(false, () => {
          logger.info('Shutdown complete');
          process.exit(0);
        });
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason });
});

start();

module.exports = app;
