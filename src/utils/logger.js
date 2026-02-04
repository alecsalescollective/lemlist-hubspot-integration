const pino = require('pino');
const { v4: uuidv4 } = require('uuid');

/**
 * PII fields to redact from logs
 */
const REDACT_PATHS = [
  'email',
  'contact.email',
  'contact.properties.email',
  'lead.email',
  'leadData.email',
  '*.email',
  'firstName',
  'lastName',
  'contact.properties.firstname',
  'contact.properties.lastname',
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
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      hostname: bindings.hostname
    })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined
});

/**
 * Create a child logger for a specific module
 * @param {string} moduleName - Name of the module for context
 * @returns {pino.Logger} - Child logger instance
 */
function createLogger(moduleName) {
  return baseLogger.child({ module: moduleName });
}

/**
 * Generate a unique correlation ID for request tracing
 * @returns {string} - UUID correlation ID
 */
function generateCorrelationId() {
  return uuidv4();
}

/**
 * Sanitize a contact object for safe logging (removes PII)
 * @param {Object} contact - Contact object with properties
 * @returns {Object} - Sanitized contact object
 */
function sanitizeContact(contact) {
  if (!contact) return null;

  const sanitized = {
    id: contact.id,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt
  };

  if (contact.properties) {
    sanitized.properties = {
      // Include non-PII fields only
      enriched: contact.properties.enriched,
      lemlist_processing: contact.properties.lemlist_processing,
      lemlist_sequenced: contact.properties.lemlist_sequenced,
      lemlist_sequence_id: contact.properties.lemlist_sequence_id,
      lead_source: contact.properties.lead_source,
      createdate: contact.properties.createdate
    };
  }

  return sanitized;
}

/**
 * Sanitize an array of contacts for safe logging
 * @param {Array} contacts - Array of contact objects
 * @returns {Array} - Array of sanitized contact objects
 */
function sanitizeContacts(contacts) {
  if (!Array.isArray(contacts)) return [];
  return contacts.map(sanitizeContact);
}

module.exports = {
  createLogger,
  generateCorrelationId,
  sanitizeContact,
  sanitizeContacts,
  baseLogger
};
