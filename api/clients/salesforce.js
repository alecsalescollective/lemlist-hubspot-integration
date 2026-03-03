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
    this.apiVersion = 'v59.0';
    this.convertedLeadStatus = null;
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
    try {
      const response = await this.request({
        method: 'get',
        path: `/services/data/${this.apiVersion}/query`,
        params: { q: soql }
      });
      return response.data.records || [];
    } catch (error) {
      logger.error({ error: error.response?.data || error.message, soql }, 'Salesforce query failed');
      throw error;
    }
  }

  /**
   * Run a generic Salesforce REST request with one-token-refresh retry on 401.
   */
  async request({ method, path, params, data }, allowRetry = true) {
    const { accessToken, instanceUrl } = await this.getValidToken();

    try {
      return await axios({
        method,
        url: `${instanceUrl}${path}`,
        params,
        data,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      // If 401, try refreshing token and retry once
      if (allowRetry && error.response?.status === 401) {
        logger.info('Salesforce 401, attempting token refresh and retry');
        const supabase = this.getSupabase();
        const { data: tokenData } = await supabase
          .from('salesforce_tokens')
          .select('refresh_token')
          .limit(1)
          .single();

        if (tokenData?.refresh_token) {
          const { accessToken: newToken, instanceUrl: newUrl } = await this.refreshToken(tokenData.refresh_token);
          return await axios({
            method,
            url: `${newUrl}${path}`,
            params,
            data,
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            }
          });
        }
      }

      throw error;
    }
  }

  /**
   * Escape a literal for embedding inside SOQL single-quoted strings.
   */
  escapeSoqlLiteral(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
  }

  /**
   * Get one converted lead status label (cached).
   */
  async getConvertedLeadStatus() {
    if (this.convertedLeadStatus) {
      return this.convertedLeadStatus;
    }

    const rows = await this.query(
      'SELECT MasterLabel, SortOrder FROM LeadStatus WHERE IsConverted = true ORDER BY SortOrder ASC LIMIT 1'
    );

    if (!rows || rows.length === 0 || !rows[0].MasterLabel) {
      throw new Error('No converted LeadStatus found in Salesforce');
    }

    this.convertedLeadStatus = rows[0].MasterLabel;
    return this.convertedLeadStatus;
  }

  /**
   * Convert a Salesforce Lead into Contact/Account.
   */
  async convertLeadToContact(leadId, convertedStatus = null) {
    if (!leadId) {
      throw new Error('Lead ID is required for Salesforce conversion');
    }

    const statusLabel = convertedStatus || await this.getConvertedLeadStatus();
    const soapVersion = this.apiVersion.replace(/^v/i, '');
    const soapPath = `/services/Soap/u/${soapVersion}`;
    const escapeXml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const { accessToken, instanceUrl } = await this.getValidToken();
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:partner.soap.sforce.com">
  <env:Header>
    <urn:SessionHeader>
      <urn:sessionId>${escapeXml(accessToken)}</urn:sessionId>
    </urn:SessionHeader>
  </env:Header>
  <env:Body>
    <urn:convertLead>
      <urn:leadConverts>
        <urn:leadId>${escapeXml(leadId)}</urn:leadId>
        <urn:convertedStatus>${escapeXml(statusLabel)}</urn:convertedStatus>
        <urn:doNotCreateOpportunity>true</urn:doNotCreateOpportunity>
      </urn:leadConverts>
    </urn:convertLead>
  </env:Body>
</env:Envelope>`;

    let responseData;
    try {
      const response = await axios.post(
        `${instanceUrl}${soapPath}`,
        body,
        {
          headers: {
            'Content-Type': 'text/xml; charset=UTF-8',
            SOAPAction: '""'
          }
        }
      );
      responseData = String(response.data || '');
    } catch (error) {
      const rawError = String(error.response?.data || error.message || '');
      if ((error.response?.status === 401 || rawError.includes('INVALID_SESSION_ID')) && this.clientId && this.clientSecret) {
        const supabase = this.getSupabase();
        const { data: tokenData } = await supabase
          .from('salesforce_tokens')
          .select('refresh_token')
          .limit(1)
          .single();

        if (tokenData?.refresh_token) {
          const refreshed = await this.refreshToken(tokenData.refresh_token);
          const retryBody = body.replace(escapeXml(accessToken), escapeXml(refreshed.accessToken));
          const retryResponse = await axios.post(
            `${refreshed.instanceUrl}${soapPath}`,
            retryBody,
            {
              headers: {
                'Content-Type': 'text/xml; charset=UTF-8',
                SOAPAction: '""'
              }
            }
          );
          responseData = String(retryResponse.data || '');
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    const extractTag = (tagName) => {
      const regex = new RegExp(`<(?:\\w+:)?${tagName}>([\\s\\S]*?)</(?:\\w+:)?${tagName}>`, 'i');
      const match = responseData.match(regex);
      return match ? match[1] : null;
    };

    const successValue = extractTag('success');
    if (successValue !== 'true') {
      const faultString = extractTag('faultstring');
      const errorMessage = extractTag('message');
      throw new Error(faultString || errorMessage || `Salesforce lead conversion failed for ${leadId}`);
    }

    return {
      leadId: extractTag('leadId') || leadId,
      contactId: extractTag('contactId'),
      accountId: extractTag('accountId'),
      convertedStatus: statusLabel
    };
  }
}

module.exports = SalesforceClient;
