const axios = require('axios');
const { createLogger } = require('../utils/logger');
const { lemlistLimiter } = require('../utils/rateLimiter');
const { withRetry } = require('../utils/retry');

const logger = createLogger('lemlist-client');

/**
 * Lemlist API Client
 * Handles all interactions with Lemlist API
 */
class LemlistClient {
  /**
   * Create a Lemlist API client
   * @param {Object} config - Lemlist configuration
   * @param {string} config.apiKey - Lemlist API key
   * @param {string} config.baseUrl - API base URL
   */
  constructor(config) {
    this.config = config;
    this.rateLimiter = lemlistLimiter;

    // Lemlist uses Basic Auth with empty username and API key as password
    const authString = Buffer.from(`:${config.apiKey}`).toString('base64');

    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (requestConfig) => {
      await this.rateLimiter.acquire();
      logger.trace({ url: requestConfig.url, method: requestConfig.method }, 'Lemlist API request');
      return requestConfig;
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.trace(
          { url: response.config.url, status: response.status },
          'Lemlist API response'
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
          'Lemlist API error'
        );
        throw error;
      }
    );
  }

  /**
   * Get all campaigns
   * @returns {Promise<Object[]>} Array of campaign objects
   */
  async getCampaigns() {
    const response = await withRetry(
      () => this.client.get('/campaigns'),
      { operationName: 'getCampaigns' }
    );

    logger.debug({ count: response.data?.length || 0 }, 'Fetched Lemlist campaigns');
    return response.data || [];
  }

  /**
   * Get a specific campaign by ID
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign object
   */
  async getCampaign(campaignId) {
    const response = await withRetry(
      () => this.client.get(`/campaigns/${campaignId}`),
      { operationName: 'getCampaign' }
    );

    return response.data;
  }

  /**
   * Check if a lead exists in a campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} email - Lead email address
   * @returns {Promise<Object|null>} Lead object if exists, null otherwise
   */
  async checkLeadExists(campaignId, email) {
    try {
      const encodedEmail = encodeURIComponent(email);
      const response = await withRetry(
        () => this.client.get(`/campaigns/${campaignId}/leads/${encodedEmail}`),
        { operationName: 'checkLeadExists' }
      );

      logger.debug({ campaignId, exists: true }, 'Lead exists in campaign');
      return response.data;
    } catch (error) {
      // 404 means lead doesn't exist (expected case)
      if (error.response && error.response.status === 404) {
        logger.debug({ campaignId, exists: false }, 'Lead does not exist in campaign');
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Add a lead to a campaign
   * @param {string} campaignId - Campaign ID
   * @param {Object} leadData - Lead data
   * @param {string} leadData.email - Email address (required)
   * @param {string} leadData.firstName - First name
   * @param {string} leadData.lastName - Last name
   * @param {string} leadData.companyName - Company name
   * @param {Object} leadData.customVariables - Custom variables for personalization
   * @returns {Promise<Object>} Created lead object
   */
  async addLeadToCampaign(campaignId, leadData) {
    // Build the lead payload
    const payload = {
      email: leadData.email
    };

    // Add optional fields if provided
    if (leadData.firstName) payload.firstName = leadData.firstName;
    if (leadData.lastName) payload.lastName = leadData.lastName;
    if (leadData.companyName) payload.companyName = leadData.companyName;

    // Add enriched fields if available
    if (leadData.linkedinUrl) payload.linkedinUrl = leadData.linkedinUrl;
    if (leadData.phone) payload.phone = leadData.phone;
    if (leadData.jobTitle) payload.jobTitle = leadData.jobTitle;

    // Add all remaining fields as custom variables (AI context, calendar link, etc.)
    // Lemlist expects custom variables at the root level
    const standardFields = new Set([
      'email', 'firstName', 'lastName', 'companyName',
      'linkedinUrl', 'phone', 'jobTitle',
      'enriched', 'enrichedAt', 'enrichmentId',
      'emailVerificationStatus', 'emailVerified', 'customVariables'
    ]);

    for (const [key, value] of Object.entries(leadData)) {
      if (!standardFields.has(key) && value !== null && value !== undefined && value !== '') {
        payload[key] = value;
      }
    }

    // Add custom variables if provided (legacy support)
    if (leadData.customVariables && Object.keys(leadData.customVariables).length > 0) {
      for (const [key, value] of Object.entries(leadData.customVariables)) {
        if (value !== null && value !== undefined && value !== '') {
          payload[key] = value;
        }
      }
    }

    const response = await withRetry(
      () => this.client.post(`/campaigns/${campaignId}/leads`, payload),
      { operationName: 'addLeadToCampaign' }
    );

    logger.info({ campaignId }, 'Added lead to campaign');
    return response.data;
  }

  /**
   * Submit a lead for enrichment
   * Note: This is an async operation - must poll for results
   * @param {Object} params - Enrichment parameters
   * @param {string} params.email - Email address to enrich
   * @param {string} params.firstName - First name (optional)
   * @param {string} params.lastName - Last name (optional)
   * @param {string} params.companyName - Company name (optional)
   * @param {boolean} params.findEmail - Find verified email (default: false)
   * @param {boolean} params.verifyEmail - Verify existing email (default: true)
   * @param {boolean} params.findPhone - Find phone number (default: false)
   * @param {boolean} params.linkedinEnrichment - Enrich from LinkedIn (default: true)
   * @returns {Promise<Object>} Enrichment job object with ID
   */
  async submitEnrichment(params) {
    // Build query parameters for the enrichment request
    const queryParams = {};

    // Data inputs
    if (params.email) queryParams.email = params.email;
    if (params.firstName) queryParams.firstName = params.firstName;
    if (params.lastName) queryParams.lastName = params.lastName;
    if (params.companyName) queryParams.companyName = params.companyName;
    if (params.companyDomain) queryParams.companyDomain = params.companyDomain;
    if (params.linkedinUrl) queryParams.linkedinUrl = params.linkedinUrl;

    // Enrichment flags - must be query params
    if (params.verifyEmail !== false) queryParams.verifyEmail = true;
    if (params.linkedinEnrichment !== false) queryParams.linkedinEnrichment = true;
    if (params.findEmail) queryParams.findEmail = true;
    if (params.findPhone) queryParams.findPhone = true;

    const response = await withRetry(
      () => this.client.post('/enrich', null, { params: queryParams }),
      { operationName: 'submitEnrichment' }
    );

    logger.debug({ enrichmentId: response.data?.id }, 'Submitted enrichment request');
    return response.data;
  }

  /**
   * Get enrichment result by ID
   * @param {string} enrichmentId - Enrichment job ID
   * @returns {Promise<Object>} Enrichment result with status
   */
  async getEnrichmentResult(enrichmentId) {
    const response = await withRetry(
      () => this.client.get(`/enrich/${enrichmentId}`),
      { operationName: 'getEnrichmentResult' }
    );

    return response.data;
  }

  /**
   * Enrich a lead and wait for results
   * @param {Object} leadData - Lead data to enrich
   * @param {Object} options - Enrichment options
   * @param {number} options.maxWaitMs - Max time to wait for results (default: 30000)
   * @param {number} options.pollIntervalMs - Polling interval (default: 2000)
   * @returns {Promise<Object>} Enriched lead data
   */
  async enrichLead(leadData, options = {}) {
    const maxWaitMs = options.maxWaitMs || 30000;
    const pollIntervalMs = options.pollIntervalMs || 2000;

    logger.debug({ email: leadData.email }, 'Starting lead enrichment');

    // Submit enrichment request
    const enrichmentJob = await this.submitEnrichment({
      email: leadData.email,
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      companyName: leadData.companyName,
      verifyEmail: true,
      linkedinEnrichment: true,
      findPhone: true
    });

    if (!enrichmentJob?.id) {
      logger.warn({ email: leadData.email }, 'No enrichment ID returned');
      return leadData; // Return original data if enrichment fails
    }

    const enrichmentId = enrichmentJob.id;
    const startTime = Date.now();

    // Poll for results
    while (Date.now() - startTime < maxWaitMs) {
      await this.sleep(pollIntervalMs);

      try {
        const result = await this.getEnrichmentResult(enrichmentId);
        const status = result.enrichmentStatus || result.status;

        // Check if enrichment is complete
        if (status === 'done' || status === 'completed') {
          logger.info({ email: leadData.email, enrichmentId }, 'Enrichment completed');

          // Merge enriched data with original
          return this.mergeEnrichedData(leadData, result);
        }

        if (status === 'failed' || status === 'error') {
          logger.warn({ email: leadData.email, status }, 'Enrichment failed');
          return leadData; // Return original data
        }

        // Still processing, continue polling
        logger.trace({ email: leadData.email, status }, 'Enrichment in progress');

      } catch (error) {
        logger.warn({ email: leadData.email, error: error.message }, 'Error checking enrichment status');
      }
    }

    logger.warn({ email: leadData.email, enrichmentId }, 'Enrichment timed out');
    return leadData; // Return original data on timeout
  }

  /**
   * Merge enriched data with original lead data
   * @param {Object} originalData - Original lead data
   * @param {Object} enrichedResult - Enrichment API result
   * @returns {Object} Merged lead data
   */
  mergeEnrichedData(originalData, enrichedResult) {
    const merged = { ...originalData };

    // Extract data from the enrichment result structure
    const linkedinData = enrichedResult.data?.linkedin || {};
    const emailData = enrichedResult.data?.email || {};
    const phoneData = enrichedResult.data?.phone || {};

    // Update with LinkedIn enriched data if available (don't overwrite existing data)
    if (linkedinData.firstName && !merged.firstName) {
      merged.firstName = linkedinData.firstName;
    }
    if (linkedinData.lastName && !merged.lastName) {
      merged.lastName = linkedinData.lastName;
    }
    if (linkedinData.companyName && !merged.companyName) {
      merged.companyName = linkedinData.companyName;
    }
    if (linkedinData.linkedinUrl) {
      merged.linkedinUrl = linkedinData.linkedinUrl;
    }
    if (linkedinData.jobTitle) {
      merged.jobTitle = linkedinData.jobTitle;
    }

    // Add phone if found
    if (phoneData.phone) {
      merged.phone = phoneData.phone;
    }

    // Track email verification status
    if (emailData.status) {
      merged.emailVerificationStatus = emailData.status;
      merged.emailVerified = emailData.status === 'valid' || emailData.status === 'deliverable';
    }

    // Mark as enriched
    merged.enriched = true;
    merged.enrichedAt = new Date().toISOString();
    merged.enrichmentId = enrichedResult.enrichmentId;

    return merged;
  }

  /**
   * Sleep helper for polling
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Delete a lead from a campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} email - Lead email address
   * @returns {Promise<void>}
   */
  async deleteLeadFromCampaign(campaignId, email) {
    const encodedEmail = encodeURIComponent(email);
    await withRetry(
      () => this.client.delete(`/campaigns/${campaignId}/leads/${encodedEmail}`),
      { operationName: 'deleteLeadFromCampaign' }
    );

    logger.debug({ campaignId }, 'Deleted lead from campaign');
  }

  /**
   * Get all leads in a campaign
   * @param {string} campaignId - Campaign ID
   * @param {number} limit - Max leads to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object[]>} Array of leads
   */
  async getCampaignLeads(campaignId, limit = 100, offset = 0) {
    const response = await withRetry(
      () => this.client.get(`/campaigns/${campaignId}/leads`, {
        params: { limit, offset }
      }),
      { operationName: 'getCampaignLeads' }
    );

    return response.data || [];
  }

  /**
   * Verify connection to Lemlist API
   * @returns {Promise<boolean>} True if connection is successful
   */
  async verifyConnection() {
    try {
      await this.getCampaigns();
      logger.info('Lemlist API connection verified');
      return true;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to verify Lemlist connection');
      return false;
    }
  }

  /**
   * Validate that campaign IDs from config exist
   * @param {string[]} campaignIds - Array of campaign IDs to validate
   * @returns {Promise<{valid: string[], invalid: string[]}>}
   */
  async validateCampaignIds(campaignIds) {
    const campaigns = await this.getCampaigns();
    const existingIds = new Set(campaigns.map(c => c._id));

    const valid = [];
    const invalid = [];

    for (const id of campaignIds) {
      if (existingIds.has(id)) {
        valid.push(id);
      } else {
        invalid.push(id);
      }
    }

    if (invalid.length > 0) {
      logger.warn({ invalidCampaignIds: invalid }, 'Some campaign IDs not found in Lemlist');
    }

    return { valid, invalid };
  }
}

module.exports = LemlistClient;
