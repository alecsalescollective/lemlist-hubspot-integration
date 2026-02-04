const { createLogger } = require('./logger');

const logger = createLogger('retry');

/**
 * HTTP status codes that indicate transient errors (worth retrying)
 */
const DEFAULT_RETRYABLE_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504  // Gateway Timeout
];

/**
 * Check if an error is retryable
 * @param {Error} error - The error to check
 * @param {number[]} retryableCodes - HTTP status codes to retry
 * @returns {boolean}
 */
function isRetryableError(error, retryableCodes = DEFAULT_RETRYABLE_CODES) {
  // Network errors (no response)
  if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // Axios error with response
  if (error.response && error.response.status) {
    return retryableCodes.includes(error.response.status);
  }

  // Axios error without response (network error)
  if (error.isAxiosError && !error.response) {
    return true;
  }

  return false;
}

/**
 * Get the Retry-After header value in milliseconds
 * @param {Object} error - Axios error object
 * @returns {number|null} Milliseconds to wait, or null if not specified
 */
function getRetryAfterMs(error) {
  if (!error.response || !error.response.headers) {
    return null;
  }

  const retryAfter = error.response.headers['retry-after'];
  if (!retryAfter) {
    return null;
  }

  // Retry-After can be seconds or a date
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return null;
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Current attempt number (1-based)
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @param {number} maxDelayMs - Maximum delay cap
 * @returns {number} Delay in milliseconds
 */
function calculateBackoff(attempt, baseDelayMs, maxDelayMs) {
  // Exponential backoff: base * 2^(attempt-1)
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter (10-20% random variation)
  const jitter = 0.9 + Math.random() * 0.2;

  return Math.round(cappedDelay * jitter);
}

/**
 * Execute a function with retry logic
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 3)
 * @param {number} options.baseDelayMs - Base delay for backoff (default: 1000)
 * @param {number} options.maxDelayMs - Maximum delay cap (default: 30000)
 * @param {number[]} options.retryableCodes - HTTP codes to retry
 * @param {Function} options.onRetry - Callback on retry (optional)
 * @param {string} options.operationName - Name for logging (optional)
 * @returns {Promise<*>} Result of the function
 */
async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    retryableCodes = DEFAULT_RETRYABLE_CODES,
    onRetry = null,
    operationName = 'operation'
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRetryable = isRetryableError(error, retryableCodes);
      const isLastAttempt = attempt === maxAttempts;

      // Log the error
      const errorInfo = {
        attempt,
        maxAttempts,
        operation: operationName,
        errorMessage: error.message,
        statusCode: error.response?.status,
        isRetryable
      };

      if (!isRetryable) {
        logger.warn(errorInfo, 'Non-retryable error encountered');
        throw error;
      }

      if (isLastAttempt) {
        logger.error(errorInfo, 'Max retry attempts exceeded');
        throw error;
      }

      // Calculate delay (respect Retry-After if present)
      let delay = getRetryAfterMs(error);
      if (delay === null) {
        delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
      }

      logger.info(
        { ...errorInfo, delayMs: delay },
        'Retrying after transient error'
      );

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry({ attempt, delay, error, operationName });
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper with pre-configured options
 * @param {Object} defaultOptions - Default options for all retries
 * @returns {Function} withRetry function with defaults applied
 */
function createRetryWrapper(defaultOptions) {
  return (fn, options = {}) => withRetry(fn, { ...defaultOptions, ...options });
}

module.exports = {
  withRetry,
  createRetryWrapper,
  isRetryableError,
  getRetryAfterMs,
  calculateBackoff,
  sleep,
  DEFAULT_RETRYABLE_CODES
};
