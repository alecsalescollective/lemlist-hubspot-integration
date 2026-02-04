require('dotenv').config();

const routingConfig = require('./routing.json');

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'HUBSPOT_ACCESS_TOKEN',
  'HUBSPOT_PORTAL_ID',
  'LEMLIST_API_KEY'
];

/**
 * Validate that all required environment variables are set
 * @throws {Error} If any required variable is missing
 */
function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    );
  }
}

/**
 * Parse a boolean from environment variable
 * @param {string} value - Environment variable value
 * @param {boolean} defaultValue - Default if not set
 * @returns {boolean}
 */
function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse an integer from environment variable
 * @param {string} value - Environment variable value
 * @param {number} defaultValue - Default if not set or invalid
 * @returns {number}
 */
function parseInt(value, defaultValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a date from environment variable
 * @param {string} value - Environment variable value (ISO 8601)
 * @param {Date} defaultValue - Default if not set or invalid
 * @returns {Date}
 */
function parseDate(value, defaultValue) {
  if (!value) return defaultValue;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? defaultValue : parsed;
}

// Validate environment on module load
validateEnvironment();

/**
 * Application configuration
 */
const config = {
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
    portalId: process.env.HUBSPOT_PORTAL_ID,
    baseUrl: 'https://api.hubapi.com',
    rateLimit: {
      requests: 100,
      perSeconds: 10
    }
  },

  lemlist: {
    apiKey: process.env.LEMLIST_API_KEY,
    baseUrl: 'https://api.lemlist.com/api',
    rateLimit: {
      requests: 100,
      perSeconds: 60
    }
  },

  polling: {
    intervalMs: parseInt(process.env.POLLING_INTERVAL_MS, 300000)
  },

  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS, 3),
    baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS, 1000),
    maxDelayMs: 30000
  },

  deployment: {
    // Only process leads created after this date (no backfill)
    startDate: parseDate(process.env.DEPLOYMENT_DATE, new Date())
  },

  alerts: {
    enabled: !!process.env.SMTP_HOST,
    emailTo: process.env.ALERT_EMAIL_TO,
    emailFrom: process.env.ALERT_EMAIL_FROM || 'hubspot-lemlist-integration@localhost',
    failureThreshold: parseInt(process.env.ALERT_FAILURE_THRESHOLD, 3),
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 587),
      secure: parseBoolean(process.env.SMTP_SECURE, false),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  nodeEnv: process.env.NODE_ENV || 'development',

  // Routing configuration loaded from JSON
  routing: routingConfig
};

/**
 * Get the list of HubSpot properties needed for contact operations
 * @returns {string[]} Array of property names
 */
function getRequiredContactProperties() {
  const mappings = config.routing.field_mappings;
  return [
    mappings.email,
    mappings.firstName,
    mappings.lastName,
    mappings.companyName,
    'hubspot_owner_id',
    'lead_source',
    config.routing.trigger_field,
    'createdate'
  ];
}

// Freeze config to prevent accidental mutation
Object.freeze(config);
Object.freeze(config.hubspot);
Object.freeze(config.lemlist);
Object.freeze(config.polling);
Object.freeze(config.retry);
Object.freeze(config.deployment);
Object.freeze(config.alerts);
Object.freeze(config.logging);

module.exports = {
  config,
  validateEnvironment,
  getRequiredContactProperties
};
