const axios = require('axios');

/**
 * Lightweight HubSpot client for API server
 */
class HubSpotClient {
  constructor(config) {
    // Trim token in case of whitespace in env var
    const token = (config.accessToken || '').trim();

    this.client = axios.create({
      baseURL: config.apiUrl || 'https://api.hubapi.com',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }
}

module.exports = HubSpotClient;
