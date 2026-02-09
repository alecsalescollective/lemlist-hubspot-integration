const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');

const logger = createLogger('salesforce-client');

/**
 * Salesforce OAuth2 client with automatic token refresh
 * Same pattern as HubSpotClient
 */
class SalesforceClient {
  constructor() {
    this.clientId = process.env.SALESFORCE_CLIENT_ID;
    this.clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    this.loginUrl = 'https://login.salesforce.com';
  }

  /**
   * Get Supabase client (lazy init)
   */
  getSupabase() {
    if (!this.supabase) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
    return this.supabase;
  }

  /**
   * Get a valid access token and instance URL, refreshing if needed
   * @returns {{ accessToken: string, instanceUrl: string }}
   */
  async getValidToken() {
    const supabase = this.getSupabase();

    const { data: tokenData, error } = await supabase
      .from('salesforce_tokens')
      .select('*')
      .limit(1)
      .single();

    if (error || !tokenData) {
      throw new Error('No Salesforce token available. Please complete OAuth setup at /api/salesforce/auth');
    }

    // Check if token is expired (with 5 min buffer)
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    const now = new Date();
    const bufferMs = 5 * 60 * 1000;

    if (expiresAt && (expiresAt.getTime() - bufferMs > now.getTime())) {
      return {
        accessToken: tokenData.access_token,
        instanceUrl: tokenData.instance_url
      };
    }

    // Token expired - refresh
    logger.info('Salesforce token expired, refreshing...');
    return await this.refreshToken(tokenData.refresh_token);
  }

  /**
   * Refresh the access token
   */
  async refreshToken(refreshToken) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET required for token refresh');
    }

    try {
      const response = await axios.post(
        `${this.loginUrl}/services/oauth2/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      const { access_token, instance_url } = response.data;

      // Salesforce access tokens last ~2 hours
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      // Store new token (refresh_token doesn't change in Salesforce)
      const supabase = this.getSupabase();
      await supabase
        .from('salesforce_tokens')
        .upsert({
          id: 1,
          access_token,
          refresh_token: refreshToken,
          instance_url,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        });

      logger.info('Salesforce token refreshed successfully');

      return { accessToken: access_token, instanceUrl: instance_url };

    } catch (error) {
      logger.error({ error: error.response?.data || error.message }, 'Salesforce token refresh failed');
      throw new Error('Failed to refresh Salesforce token. Please re-authenticate at /api/salesforce/auth');
    }
  }

  /**
   * Store tokens after initial OAuth callback
   */
  async storeTokens(accessToken, refreshToken, instanceUrl) {
    const supabase = this.getSupabase();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('salesforce_tokens')
      .upsert({
        id: 1,
        access_token: accessToken,
        refresh_token: refreshToken,
        instance_url: instanceUrl,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      logger.error({ error }, 'Failed to store Salesforce tokens');
      throw error;
    }

    logger.info('Salesforce tokens stored successfully');
  }

  /**
   * Execute a SOQL query against Salesforce
   * @param {string} soql - SOQL query string
   * @returns {Array} - Query results
   */
  async query(soql) {
    const { accessToken, instanceUrl } = await this.getValidToken();

    try {
      const response = await axios.get(
        `${instanceUrl}/services/data/v59.0/query`,
        {
          params: { q: soql },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.records || [];

    } catch (error) {
      // If 401, try refreshing token and retry once
      if (error.response?.status === 401) {
        logger.info('Salesforce 401, attempting token refresh and retry');
        const supabase = this.getSupabase();
        const { data: tokenData } = await supabase
          .from('salesforce_tokens')
          .select('refresh_token')
          .limit(1)
          .single();

        if (tokenData?.refresh_token) {
          const { accessToken: newToken, instanceUrl: newUrl } = await this.refreshToken(tokenData.refresh_token);

          const retryResponse = await axios.get(
            `${newUrl}/services/data/v59.0/query`,
            {
              params: { q: soql },
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          return retryResponse.data.records || [];
        }
      }

      logger.error({ error: error.response?.data || error.message }, 'Salesforce query failed');
      throw error;
    }
  }
}

module.exports = SalesforceClient;
