const axios = require('axios');

/**
 * Lightweight Lemlist client for API server
 */
class LemlistClient {
  constructor(config) {
    this.client = axios.create({
      baseURL: config.apiUrl || 'https://api.lemlist.com/api',
      headers: {
        'Content-Type': 'application/json'
      },
      auth: {
        username: '',
        password: config.apiKey
      }
    });
  }

  /**
   * Get all campaigns
   */
  async getCampaigns() {
    const response = await this.client.get('/campaigns');
    return response.data || [];
  }

  /**
   * Mark a lead as interested
   * This triggers lemlist's native Salesforce integration to create opportunities
   * @param {string} leadIdOrEmail - Lead ID or email address
   * @returns {Promise<Object>} - API response
   */
  async markLeadAsInterested(leadIdOrEmail) {
    const response = await this.client.post(`/leads/interested/${encodeURIComponent(leadIdOrEmail)}`);
    return response.data;
  }

  /**
   * Get lead by email
   * @param {string} email - Lead email address
   * @returns {Promise<Object|null>} - Lead data or null
   */
  async getLeadByEmail(email) {
    try {
      const response = await this.client.get(`/leads/${encodeURIComponent(email)}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update lead data
   * @param {string} leadIdOrEmail - Lead ID or email
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} - Updated lead
   */
  async updateLead(leadIdOrEmail, data) {
    const response = await this.client.patch(`/leads/${encodeURIComponent(leadIdOrEmail)}`, data);
    return response.data;
  }

  /**
   * Add a lead to a campaign
   * @param {string} campaignId - Campaign ID
   * @param {Object} leadData - Lead data
   * @returns {Promise<Object>} - Created lead
   */
  async addLeadToCampaign(campaignId, leadData) {
    const response = await this.client.post(
      `/campaigns/${campaignId}/leads/${encodeURIComponent(leadData.email)}`,
      leadData
    );
    return response.data;
  }

  /**
   * Check if a lead exists in a campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} email - Lead email
   * @returns {Promise<Object|null>} - Lead or null
   */
  async checkLeadExists(campaignId, email) {
    try {
      const response = await this.client.get(
        `/campaigns/${campaignId}/leads/${encodeURIComponent(email)}`
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get campaign reports with metrics for multiple campaigns
   * @param {string[]} campaignIds - Array of campaign IDs
   * @returns {Promise<Array>} - Array of campaign reports with metrics
   */
  async getCampaignReports(campaignIds) {
    const response = await this.client.get('/campaigns/reports', {
      params: { campaignIds: campaignIds.join(',') }
    });
    return response.data || [];
  }

  /**
   * Get stats for a single campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} - Campaign stats
   */
  async getCampaignStats(campaignId) {
    const response = await this.client.get(`/campaigns/${campaignId}/stats`);
    return response.data || {};
  }

  /**
   * Get all leads in a campaign with their activity statuses
   * The /export endpoint returns CSV — parse it into JSON objects
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Array>} - Array of leads with statuses
   */
  async getCampaignLeadStatuses(campaignId) {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}/export`);
      const data = response.data;
      if (!data) return [];
      // If already an array (unlikely but handle it)
      if (Array.isArray(data)) return data;
      // Parse CSV string into JSON objects
      if (typeof data === 'string') return this.parseCSV(data);
      return [];
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Parse CSV string into array of objects
   */
  parseCSV(csvString) {
    const lines = csvString.split('\n');
    if (lines.length < 2) return [];
    const headers = this.parseCSVLine(lines[0]);
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = this.parseCSVLine(line);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
      results.push(obj);
    }
    return results;
  }

  /**
   * Parse a single CSV line handling quoted fields with commas/newlines
   */
  parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current);
    return fields;
  }

  /**
   * Submit a lead for enrichment
   * @param {Object} params - Enrichment parameters
   * @returns {Promise<Object>} - Enrichment job with ID
   */
  async submitEnrichment(params) {
    const queryParams = {
      email: params.email,
      verifyEmail: true,
      linkedinEnrichment: true,
      findPhone: true
    };

    if (params.firstName) queryParams.firstName = params.firstName;
    if (params.lastName) queryParams.lastName = params.lastName;
    if (params.companyName) queryParams.companyName = params.companyName;

    const response = await this.client.post('/enrich', null, { params: queryParams });
    return response.data;
  }

  /**
   * Get enrichment result by ID
   * @param {string} enrichmentId - Enrichment job ID
   * @returns {Promise<Object>} - Enrichment result
   */
  async getEnrichmentResult(enrichmentId) {
    const response = await this.client.get(`/enrich/${enrichmentId}`);
    return response.data;
  }

  /**
   * Enrich a lead and wait for results
   * @param {Object} leadData - Lead data to enrich
   * @param {Object} options - Options (maxWaitMs, pollIntervalMs)
   * @returns {Promise<Object>} - Enriched lead data
   */
  async enrichLead(leadData, options = {}) {
    const maxWaitMs = options.maxWaitMs || 30000;
    const pollIntervalMs = options.pollIntervalMs || 2000;

    // Submit enrichment request
    const enrichmentJob = await this.submitEnrichment({
      email: leadData.email,
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      companyName: leadData.companyName
    });

    if (!enrichmentJob?.id) {
      return leadData; // Return original if no enrichment ID
    }

    const enrichmentId = enrichmentJob.id;
    const startTime = Date.now();

    // Poll for results
    while (Date.now() - startTime < maxWaitMs) {
      await this.sleep(pollIntervalMs);

      try {
        const result = await this.getEnrichmentResult(enrichmentId);
        const status = result.enrichmentStatus || result.status;

        if (status === 'done' || status === 'completed') {
          return this.mergeEnrichedData(leadData, result);
        }

        if (status === 'failed' || status === 'error') {
          return leadData; // Return original on failure
        }
      } catch (error) {
        // Continue polling on error
      }
    }

    return leadData; // Return original on timeout
  }

  /**
   * Merge enriched data with original lead data
   */
  mergeEnrichedData(originalData, enrichedResult) {
    const merged = { ...originalData };

    const linkedinData = enrichedResult.data?.linkedin || {};
    const emailData = enrichedResult.data?.email || {};
    const phoneData = enrichedResult.data?.phone || {};

    if (linkedinData.firstName && !merged.firstName) merged.firstName = linkedinData.firstName;
    if (linkedinData.lastName && !merged.lastName) merged.lastName = linkedinData.lastName;
    if (linkedinData.companyName && !merged.companyName) merged.companyName = linkedinData.companyName;
    if (linkedinData.linkedinUrl) merged.linkedinUrl = linkedinData.linkedinUrl;
    if (linkedinData.jobTitle) merged.jobTitle = linkedinData.jobTitle;
    if (phoneData.phone) merged.phone = phoneData.phone;

    // Track email verification status
    if (emailData.status) {
      merged.emailVerificationStatus = emailData.status;
      merged.emailVerified = emailData.status === 'valid' || emailData.status === 'deliverable';
    }

    merged.enriched = true;
    merged.enrichedAt = new Date().toISOString();

    return merged;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = LemlistClient;
