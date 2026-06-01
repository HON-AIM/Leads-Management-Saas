const { spawn } = require('child_process');
const path = require('path');

const REDIS_PORT = process.env.REDIS_PORT || 6379;
const redisDir = path.join(__dirname, '.redis');
const redisExe = path.join(redisDir, 'redis-server.exe');
const redisConf = path.join(redisDir, 'redis.windows.conf');

let redisProcess = null;
let serverProcess = null;

function startRedis() {
  return new Promise((resolve, reject) => {
    console.log(`[Dev] Starting Redis on port ${REDIS_PORT}...`);
    redisProcess = spawn(redisExe, ['--port', String(REDIS_PORT)], {
      cwd: redisDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;
    redisProcess.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`[Redis] ${output}`);
      if (!started && output.includes('Ready to accept connections')) {
        started = true;
        console.log('[Dev] Redis is ready.');
        resolve();
      }
    });

    redisProcess.stderr.on('data', (data) => {
      process.stderr.write(`[Redis ERR] ${data}`);
    });

    redisProcess.on('error', (err) => {
      console.error('[Dev] Failed to start Redis:', err.message);
      reject(err);
    });

    redisProcess.on('exit', (code) => {
      console.log(`[Dev] Redis exited with code ${code}`);
      if (!started) reject(new Error(`Redis exited early with code ${code}`));
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        console.warn('[Dev] Redis start timeout – continuing anyway.');
        resolve();
      }
    }, 10000);
  });
}

function startServer() {
  return new Promise((resolve) => {
    console.log('[Dev] Starting Node.js server...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env },
    });

    serverProcess.on('exit', (code) => {
      console.log(`[Dev] Server exited with code ${code}`);
      resolve();
    });
  });
}

async function shutdown() {
  console.log('[Dev] Shutting down...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 2000));
  }
  if (redisProcess) {
    redisProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 1000));
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function main() {
  try {
    await startRedis();
    await startServer();
  } catch (err) {
    console.error('[Dev] Fatal error:', err.message);
    await shutdown();
  }
}

main();
