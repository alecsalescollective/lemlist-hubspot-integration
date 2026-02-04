const axios = require('axios');
const { createLogger } = require('../utils/logger');
const { hubspotLimiter } = require('../utils/rateLimiter');
const { withRetry } = require('../utils/retry');

const logger = createLogger('hubspot-client');

/**
 * HubSpot API Client (READ-ONLY)
 * Handles read-only interactions with HubSpot CRM API
 */
class HubSpotClient {
  /**
   * Create a HubSpot API client
   * @param {Object} config - HubSpot configuration
   * @param {string} config.accessToken - Private App access token
   * @param {string} config.portalId - HubSpot portal ID
   * @param {string} config.baseUrl - API base URL
   */
  constructor(config) {
    this.config = config;
    this.rateLimiter = hubspotLimiter;

    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (requestConfig) => {
      await this.rateLimiter.acquire();
      logger.trace({ url: requestConfig.url, method: requestConfig.method }, 'HubSpot API request');
      return requestConfig;
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.trace(
          { url: response.config.url, status: response.status },
          'HubSpot API response'
        );
        return response;
      },
      (error) => {
        logger.error(
          {
            url: error.config?.url,
            status: error.response?.status,
            message: error.message
          },
          'HubSpot API error'
        );
        throw error;
      }
    );
  }

  /**
   * Search for contacts where a trigger field matches a value
   * @param {string} triggerField - Property name to filter by (e.g., 'add_to_lemlist')
   * @param {string} triggerValue - Value to match (e.g., 'true')
   * @param {string[]} additionalProperties - Additional properties to fetch (e.g., AI context fields)
   * @returns {Promise<Object[]>} Array of contact objects
   */
  async searchTriggeredContacts(triggerField, triggerValue, additionalProperties = []) {
    const contacts = [];
    let after = null;

    // Base properties plus any additional ones (AI context fields)
    // Also include exclusion-related fields for filtering
    const properties = [
      'firstname', 'lastname', 'email', 'company',
      'hubspot_owner_id', triggerField,
      'lifecyclestage',      // For customer exclusion
      'hs_email_optout',     // For do-not-contact exclusion
      ...additionalProperties
    ];

    do {
      const response = await withRetry(
        () => this.client.post('/crm/v3/objects/contacts/search', {
          filterGroups: [{
            filters: [{
              propertyName: triggerField,
              operator: 'EQ',
              value: triggerValue
            }]
          }],
          properties,
          limit: 100,
          ...(after && { after })
        }),
        { operationName: 'searchTriggeredContacts' }
      );

      const { results, paging } = response.data;
      contacts.push(...(results || []));

      // Check for next page
      after = paging?.next?.after || null;

    } while (after);

    logger.debug({ triggerField, triggerValue, count: contacts.length, additionalProperties }, 'Searched triggered contacts');
    return contacts;
  }

  /**
   * Batch read contacts by IDs
   * @param {string[]} contactIds - Array of contact IDs
   * @param {string[]} properties - Properties to fetch
   * @returns {Promise<Object[]>} Array of contact objects
   */
  async getContactsBatch(contactIds, properties) {
    if (!contactIds || contactIds.length === 0) {
      return [];
    }

    const contacts = [];
    const batchSize = 100;

    // Process in batches of 100
    for (let i = 0; i < contactIds.length; i += batchSize) {
      const batch = contactIds.slice(i, i + batchSize);

      const response = await withRetry(
        () => this.client.post('/crm/v3/objects/contacts/batch/read', {
          inputs: batch.map(id => ({ id })),
          properties
        }),
        { operationName: 'getContactsBatch' }
      );

      contacts.push(...(response.data.results || []));
    }

    logger.debug({ requestedCount: contactIds.length, returnedCount: contacts.length }, 'Batch read contacts');
    return contacts;
  }

  /**
   * Get a single contact by ID
   * @param {string} contactId - Contact ID
   * @param {string[]} properties - Properties to fetch
   * @returns {Promise<Object>} Contact object
   */
  async getContact(contactId, properties) {
    const response = await withRetry(
      () => this.client.get(`/crm/v3/objects/contacts/${contactId}`, {
        params: { properties: properties.join(',') }
      }),
      { operationName: 'getContact' }
    );

    return response.data;
  }


  /**
   * Verify connection to HubSpot API
   * @returns {Promise<boolean>} True if connection is successful
   */
  async verifyConnection() {
    try {
      await this.client.get('/crm/v3/objects/contacts', {
        params: { limit: 1 }
      });
      logger.info('HubSpot API connection verified');
      return true;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to verify HubSpot connection');
      return false;
    }
  }
}

module.exports = HubSpotClient;
