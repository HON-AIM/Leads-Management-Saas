const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] !== undefined ? LOG_LEVELS[process.env.LOG_LEVEL] : LOG_LEVELS.debug;

function formatMessage(level, name, message, meta) {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${ts}] [${level.toUpperCase()}] [${name}] ${message}${metaStr}`;
}

function getLogger(name) {
  const logger = { name };
  ['error', 'warn', 'info', 'debug'].forEach(level => {
    logger[level] = (message, meta) => {
      if (LOG_LEVELS[level] <= CURRENT_LEVEL) {
        const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
        fn(formatMessage(level, name, message, meta));
      }
    };
  });
  return logger;
}

module.exports = { getLogger };
