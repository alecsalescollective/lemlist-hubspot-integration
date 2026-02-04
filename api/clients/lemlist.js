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
}

module.exports = LemlistClient;
