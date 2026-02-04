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
}

module.exports = LemlistClient;
