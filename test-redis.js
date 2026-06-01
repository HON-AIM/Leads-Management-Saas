const IORedis = require('ioredis');

(async () => {
  const conn = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    connectTimeout: 5000,
    lazyConnect: true,
  });

  conn.on('error', (e) => console.error('Redis error event:', e && e.message ? e.message : e));

  try {
    await conn.connect();
    const res = await conn.ping();
    console.log('PING response:', res);
    await conn.quit();
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err && err.message ? err.message : err);
    try { conn.disconnect(); } catch (e) {}
    process.exit(2);
  }
})();
