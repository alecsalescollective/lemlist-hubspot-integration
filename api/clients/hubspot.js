const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

/**
 * HubSpot OAuth client with automatic token refresh
 */
class HubSpotClient {
  constructor(config) {
    this.config = config;
    this.clientId = process.env.HUBSPOT_CLIENT_ID;
    this.clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    this.baseURL = config.apiUrl || 'https://api.hubapi.com';

    // Create axios instance - token will be set dynamically
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to ensure fresh token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getValidToken();
        config.headers['Authorization'] = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );
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
   * Get a valid access token, refreshing if needed
   */
  async getValidToken() {
    const supabase = this.getSupabase();

    // Get stored token
    const { data: tokenData, error } = await supabase
      .from('hubspot_tokens')
      .select('*')
      .limit(1)
      .single();

    if (error || !tokenData) {
      // No token stored - check for env var fallback (for initial setup)
      const envToken = process.env.HUBSPOT_ACCESS_TOKEN;
      if (envToken) {
        console.log('[HubSpot] No stored token, using env var (initial setup)');
        return envToken.trim();
      }
      throw new Error('No HubSpot token available. Please complete OAuth setup at /api/hubspot/auth');
    }

    // Check if token is expired (with 5 min buffer)
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - bufferMs > now.getTime()) {
      // Token is still valid
      return tokenData.access_token;
    }

    // Token expired - refresh it
    console.log('[HubSpot] Token expired, refreshing...');
    return await this.refreshToken(tokenData.refresh_token);
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshToken(refreshToken) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET required for token refresh');
    }

    try {
      const response = await axios.post(
        'https://api.hubapi.com/oauth/v1/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Calculate expiry time
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // Store new tokens
      const supabase = this.getSupabase();
      await supabase
        .from('hubspot_tokens')
        .upsert({
          access_token,
          refresh_token: refresh_token || refreshToken, // Some refreshes don't return new refresh token
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        });

      console.log('[HubSpot] Token refreshed successfully, expires at:', expiresAt.toISOString());
      return access_token;

    } catch (error) {
      console.error('[HubSpot] Token refresh failed:', error.response?.data || error.message);
      throw new Error('Failed to refresh HubSpot token. Please re-authenticate at /api/hubspot/auth');
    }
  }

  /**
   * Store tokens after initial OAuth callback
   */
  async storeTokens(accessToken, refreshToken, expiresIn) {
    const supabase = this.getSupabase();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const { error } = await supabase
      .from('hubspot_tokens')
      .upsert({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('[HubSpot] Failed to store tokens:', error);
      throw error;
    }

    console.log('[HubSpot] Tokens stored successfully, expires at:', expiresAt.toISOString());
  }
}

module.exports = HubSpotClient;
