const { createLogger } = require('./logger');

const logger = createLogger('rate-limiter');

/**
 * Token bucket rate limiter using sliding window algorithm
 */
class RateLimiter {
  /**
   * Create a new rate limiter
   * @param {string} name - Name for logging purposes
   * @param {number} maxRequests - Maximum requests allowed in the window
   * @param {number} windowMs - Time window in milliseconds
   */
  constructor(name, maxRequests, windowMs) {
    this.name = name;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.timestamps = [];
    this.waitingQueue = [];
  }

  /**
   * Sleep for a specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up timestamps outside the current window
   */
  cleanupTimestamps() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
  }

  /**
   * Get the current number of available request slots
   * @returns {number} Available slots
   */
  getAvailableSlots() {
    this.cleanupTimestamps();
    return this.maxRequests - this.timestamps.length;
  }

  /**
   * Get the time until the next slot becomes available
   * @returns {number} Milliseconds until next available slot, or 0 if available now
   */
  getWaitTime() {
    this.cleanupTimestamps();

    if (this.timestamps.length < this.maxRequests) {
      return 0;
    }

    // Calculate when the oldest timestamp will expire
    const oldestTimestamp = this.timestamps[0];
    const waitTime = this.windowMs - (Date.now() - oldestTimestamp);
    return Math.max(0, waitTime);
  }

  /**
   * Acquire a request slot, waiting if necessary
   * @returns {Promise<void>} Resolves when a slot is acquired
   */
  async acquire() {
    const waitTime = this.getWaitTime();

    if (waitTime > 0) {
      logger.debug(
        { limiter: this.name, waitTime, queueLength: this.timestamps.length },
        'Rate limit reached, waiting for slot'
      );
      await this.sleep(waitTime + 10); // Add small buffer
      return this.acquire(); // Recursive retry
    }

    // Record this request
    this.timestamps.push(Date.now());

    logger.trace(
      { limiter: this.name, usedSlots: this.timestamps.length, maxSlots: this.maxRequests },
      'Request slot acquired'
    );
  }

  /**
   * Try to acquire a slot without waiting
   * @returns {boolean} True if slot was acquired, false if rate limited
   */
  tryAcquire() {
    this.cleanupTimestamps();

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(Date.now());
      return true;
    }

    return false;
  }

  /**
   * Get the current status of the rate limiter
   * @returns {Object} Status object with available slots and wait time
   */
  getStatus() {
    this.cleanupTimestamps();
    return {
      name: this.name,
      availableSlots: this.maxRequests - this.timestamps.length,
      maxSlots: this.maxRequests,
      windowMs: this.windowMs,
      waitTimeMs: this.getWaitTime()
    };
  }

  /**
   * Reset the rate limiter (mainly for testing)
   */
  reset() {
    this.timestamps = [];
  }
}

/**
 * Create a rate limiter instance
 * @param {string} name - Name for logging
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Window duration in ms
 * @returns {RateLimiter}
 */
function createRateLimiter(name, maxRequests, windowMs) {
  return new RateLimiter(name, maxRequests, windowMs);
}

// Pre-configured rate limiters for HubSpot and Lemlist
const hubspotLimiter = createRateLimiter('hubspot', 100, 10000);  // 100 req per 10 seconds
const lemlistLimiter = createRateLimiter('lemlist', 100, 60000);  // 100 req per minute

module.exports = {
  RateLimiter,
  createRateLimiter,
  hubspotLimiter,
  lemlistLimiter
};
