const pino = require('pino');

/**
 * PII fields to redact from logs
 */
const REDACT_PATHS = [
  'email',
  'contact.email',
  '*.email',
  'firstName',
  'lastName',
  '*.firstName',
  '*.lastName'
];

/**
 * Create the base pino logger instance
 */
const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]'
  },
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

/**
 * Create a child logger for a specific module
 * @param {string} moduleName - Name of the module for context
 * @returns {pino.Logger} - Child logger instance
 */
function createLogger(moduleName) {
  return baseLogger.child({ module: moduleName });
}

module.exports = {
  createLogger,
  baseLogger
};
