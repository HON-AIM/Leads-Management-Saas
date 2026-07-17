require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV?.toLowerCase() === 'production',

  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/lead-distribution',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: '1h',
    refreshExpiry: '7d',
  },

  redis: (() => {
    const url = process.env.REDIS_URL;
    if (url) {
      try {
        const parsed = new URL(url);
        return {
          host: parsed.hostname,
          port: parseInt(parsed.port, 10) || 6379,
          password: parsed.password || undefined,
          tls: parsed.protocol === 'rediss:',
          url,
        };
      } catch (_) {}
    }
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      tls: false,
    };
  })(),

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),

  delivery: {
    maxRetries: parseInt(process.env.DELIVERY_MAX_RETRIES, 10) || 3,
    initialDelayMs: parseInt(process.env.DELIVERY_INITIAL_DELAY_MS, 10) || 2000,
    timeoutMs: parseInt(process.env.DELIVERY_TIMEOUT_MS, 10) || 30000,
  },

  dedup: {
    windowHours: parseInt(process.env.DEDUP_WINDOW_HOURS, 10) || 720,
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
    lockTimeMinutes: parseInt(process.env.ACCOUNT_LOCK_TIME_MINUTES, 10) || 120,
  },
};

if (config.isProduction) {
  const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

module.exports = config;
