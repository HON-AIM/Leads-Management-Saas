const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = levels[process.env.LOG_LEVEL || 'info'] ?? 2;

function log(level, name, message, meta) {
  if (levels[level] > currentLevel) return;
  const ts = new Date().toISOString();
  const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
  const line = `${ts} [${level.toUpperCase()}] ${message}${metaStr}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  error: (msg, meta) => log('error', 'app', msg, meta),
  warn: (msg, meta) => log('warn', 'app', msg, meta),
  info: (msg, meta) => log('info', 'app', msg, meta),
  debug: (msg, meta) => log('debug', 'app', msg, meta),
};
