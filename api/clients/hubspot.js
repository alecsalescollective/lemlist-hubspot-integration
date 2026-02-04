const axios = require('axios');

/**
 * Lightweight HubSpot client for API server
 */
class HubSpotClient {
  constructor(config) {
    this.client = axios.create({
      baseURL: config.apiUrl || 'https://api.hubapi.com',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }
}

module.exports = HubSpotClient;
