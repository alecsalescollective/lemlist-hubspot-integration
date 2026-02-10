const axios = require('axios');

/**
 * Lightweight Lemcal client for polling booked meetings
 * Uses Basic auth with userId:apiKey (both from app.lemcal.com/integrations)
 */
class LemcalClient {
  constructor(config) {
    this.client = axios.create({
      baseURL: config.apiUrl || 'https://api.lemcal.com/api/lemcal',
      headers: {
        'Content-Type': 'application/json'
      },
      auth: {
        username: config.userId || '',
        password: config.apiKey
      }
    });
  }

  /**
   * Get all booked meetings
   * @param {string} [meetingTypeId] - Optional filter by meeting type
   * @returns {Promise<Array>} - Array of meetings
   */
  async getMeetings(meetingTypeId) {
    const params = {};
    if (meetingTypeId) {
      params.meetingTypeId = meetingTypeId;
    }
    const response = await this.client.get('/meetings', { params });
    return response.data || [];
  }
}

module.exports = LemcalClient;
