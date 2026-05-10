const LOG_PREFIX = '[RetryHandler]';

const DEFAULT_OPTIONS = {
  maxRetries: 3,
  initialDelayMs: 5000,
  multiplier: 2,
  maxDelayMs: 60000,
  jitter: true,
  timeout: 30000,
};

function calculateDelay(attempt, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const delay = opts.initialDelayMs * Math.pow(opts.multiplier, attempt - 1);
  const capped = Math.min(delay, opts.maxDelayMs);

  if (opts.jitter) {
    return Math.floor(capped * (0.5 + Math.random() * 0.5));
  }

  return Math.floor(capped);
}

function shouldRetry(attempt, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return attempt < opts.maxRetries;
}

function getRemainingRetries(attempt, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return Math.max(0, opts.maxRetries - attempt);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
  if (!ms || ms <= 0) return promise;

  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function classifyError(err) {
  if (!err) return { type: 'unknown', transient: true };

  const message = (err.message || String(err)).toLowerCase();

  if (message.includes('timeout')) return { type: 'timeout', transient: true };
  if (message.includes('econnreset')) return { type: 'connection_reset', transient: true };
  if (message.includes('econnrefused')) return { type: 'connection_refused', transient: true };
  if (message.includes('enotfound') || message.includes('dns')) return { type: 'dns', transient: true };
  if (message.includes('etimedout')) return { type: 'timeout', transient: true };
  if (message.includes('socket')) return { type: 'socket', transient: true };
  if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
    return { type: 'rate_limited', transient: true };
  }
  if (message.includes('503') || message.includes('502') || message.includes('500')) {
    return { type: 'server_error', transient: true };
  }
  if (message.includes('400') || message.includes('401') || message.includes('403') || message.includes('404')) {
    return { type: 'client_error', transient: false };
  }
  if (message.includes('422')) return { type: 'validation_error', transient: false };

  return { type: 'unknown', transient: true };
}

async function executeWithRetry(fn, context, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError = null;
  let lastResult = null;
  let totalDuration = 0;
  const attempts = [];

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    const delay = attempt > 1 ? calculateDelay(attempt, opts) : 0;

    if (delay > 0) {
      console.log(`${LOG_PREFIX} Waiting ${delay}ms before attempt ${attempt}`);
      await sleep(delay);
    }

    try {
      const start = Date.now();

      let promise = fn(context, attempt);
      if (opts.timeout > 0) {
        promise = withTimeout(promise, opts.timeout);
      }

      const result = await promise;
      const duration = Date.now() - start;
      totalDuration += duration;

      attempts.push({ attempt, duration, status: result?.success ? 'success' : 'failed' });

      if (result && result.success) {
        console.log(`${LOG_PREFIX} Attempt ${attempt} succeeded (${duration}ms)`);
        return {
          success: true,
          attempt,
          totalDuration,
          attempts,
          result,
        };
      }

      lastResult = result;
      lastError = result?.error ? new Error(result.error) : new Error(`Attempt ${attempt} failed`);

      const classification = classifyError(lastError);
      if (!classification.transient && attempt < opts.maxRetries) {
        console.log(`${LOG_PREFIX} Non-transient error on attempt ${attempt}, stopping retries: ${lastError.message}`);
        return {
          success: false,
          attempt,
          totalDuration,
          attempts,
          result: lastResult,
          error: lastError.message,
          stoppedEarly: true,
          reason: 'non_transient_error',
        };
      }

      if (opts.stopOnCondition && opts.stopOnCondition(result)) {
        console.log(`${LOG_PREFIX} Stop condition met on attempt ${attempt}`);
        return {
          success: false,
          attempt,
          totalDuration,
          attempts,
          result: lastResult,
          error: lastError.message,
          stoppedEarly: true,
          reason: 'stop_condition',
        };
      }

      console.log(`${LOG_PREFIX} Attempt ${attempt} failed (${duration}ms): ${lastError.message}`);
    } catch (err) {
      const duration = 0;
      attempts.push({ attempt, duration: 0, status: 'exception' });
      lastError = err;
      lastResult = { success: false, error: err.message };

      const classification = classifyError(err);
      if (!classification.transient && attempt < opts.maxRetries) {
        console.log(`${LOG_PREFIX} Non-transient exception on attempt ${attempt}, stopping retries: ${err.message}`);
        return {
          success: false,
          attempt,
          totalDuration,
          attempts,
          result: lastResult,
          error: err.message,
          stoppedEarly: true,
          reason: 'non_transient_error',
        };
      }

      console.log(`${LOG_PREFIX} Exception on attempt ${attempt}: ${err.message}`);
    }
  }

  return {
    success: false,
    attempt: opts.maxRetries,
    totalDuration,
    attempts,
    result: lastResult,
    error: lastError?.message || 'All retries exhausted',
  };
}

module.exports = {
  calculateDelay,
  shouldRetry,
  getRemainingRetries,
  executeWithRetry,
  sleep,
  withTimeout,
  classifyError,
};
