const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');

const logger = createLogger('state-store');

/**
 * Supabase State Store
 * Tracks processed leads to prevent duplicate processing
 */
class StateStore {
  /**
   * Create a state store
   * @param {string} supabaseUrl - Supabase project URL
   * @param {string} supabaseKey - Supabase service role key
   */
  constructor(supabaseUrl, supabaseKey) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.client = null;
  }

  /**
   * Initialize the Supabase client
   */
  initialize() {
    this.client = createClient(this.supabaseUrl, this.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    logger.info({ url: this.supabaseUrl }, 'Supabase state store initialized');
  }

  /**
   * Check if a contact has already been processed
   * @param {string} contactId - HubSpot contact ID
   * @returns {Promise<boolean>} True if already processed
   */
  async isProcessed(contactId) {
    const { data, error } = await this.client
      .from('processed_leads')
      .select('id')
      .eq('contact_id', contactId)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected
      logger.error({ error, contactId }, 'Error checking if contact is processed');
      throw error;
    }

    return !!data;
  }

  /**
   * Check if an email has already been processed
   * @param {string} email - Contact email
   * @returns {Promise<boolean>} True if already processed
   */
  async isEmailProcessed(email) {
    if (!email) return false;

    const { data, error } = await this.client
      .from('processed_leads')
      .select('id')
      .eq('email', email.toLowerCase())
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error({ error, email }, 'Error checking if email is processed');
      throw error;
    }

    return !!data;
  }

  /**
   * Mark a contact as processed
   * @param {string} contactId - HubSpot contact ID
   * @param {Object} data - Additional data to store
   * @param {string} data.email - Contact email
   * @param {string} data.owner - List owner
   * @param {string} data.campaignId - Lemlist campaign ID
   * @param {string} data.leadSource - Lead source
   */
  async markProcessed(contactId, data = {}) {
    const record = {
      contact_id: contactId,
      email: data.email ? data.email.toLowerCase() : null,
      owner: data.owner || null,
      campaign_id: data.campaignId || null,
      lead_source: data.leadSource || null,
      processed_at: new Date().toISOString()
    };

    const { error } = await this.client
      .from('processed_leads')
      .upsert(record, {
        onConflict: 'contact_id',
        ignoreDuplicates: false
      });

    if (error) {
      logger.error({ error, contactId, ...data }, 'Error marking contact as processed');
      throw error;
    }

    logger.debug({ contactId, ...data }, 'Marked contact as processed');
  }

  /**
   * Get the total count of processed leads
   * @returns {Promise<number>} Count of processed leads
   */
  async getProcessedCount() {
    const { count, error } = await this.client
      .from('processed_leads')
      .select('*', { count: 'exact', head: true });

    if (error) {
      logger.error({ error }, 'Error getting processed count');
      throw error;
    }

    return count || 0;
  }

  /**
   * Get processed leads by owner
   * @param {string} owner - Owner name
   * @returns {Promise<Object[]>} Array of processed lead records
   */
  async getProcessedByOwner(owner) {
    const { data, error } = await this.client
      .from('processed_leads')
      .select('*')
      .eq('owner', owner)
      .order('processed_at', { ascending: false });

    if (error) {
      logger.error({ error, owner }, 'Error getting processed leads by owner');
      throw error;
    }

    return data || [];
  }

  /**
   * Get recently processed leads
   * @param {number} limit - Max number of records to return
   * @returns {Promise<Object[]>} Array of processed lead records
   */
  async getRecentlyProcessed(limit = 100) {
    const { data, error } = await this.client
      .from('processed_leads')
      .select('*')
      .order('processed_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ error }, 'Error getting recently processed leads');
      throw error;
    }

    return data || [];
  }

  /**
   * Remove a processed lead record (for reprocessing)
   * @param {string} contactId - HubSpot contact ID
   * @returns {Promise<boolean>} True if record was deleted
   */
  async removeProcessed(contactId) {
    const { data, error } = await this.client
      .from('processed_leads')
      .delete()
      .eq('contact_id', contactId)
      .select();

    if (error) {
      logger.error({ error, contactId }, 'Error removing processed lead');
      throw error;
    }

    return data && data.length > 0;
  }

  /**
   * Get statistics about processed leads
   * @returns {Promise<Object>} Statistics object
   */
  async getStats() {
    // Get total count
    const { count: total, error: totalError } = await this.client
      .from('processed_leads')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      logger.error({ error: totalError }, 'Error getting total count');
      throw totalError;
    }

    // Get counts by owner
    const { data: byOwnerData, error: byOwnerError } = await this.client
      .rpc('get_processed_leads_by_owner');

    // If RPC doesn't exist, fall back to manual query
    let byOwner = [];
    if (byOwnerError) {
      // Fallback: get all and group in JS
      const { data: allData } = await this.client
        .from('processed_leads')
        .select('owner');

      if (allData) {
        const counts = {};
        for (const row of allData) {
          counts[row.owner] = (counts[row.owner] || 0) + 1;
        }
        byOwner = Object.entries(counts).map(([owner, count]) => ({ owner, count }));
      }
    } else {
      byOwner = byOwnerData || [];
    }

    // Get today's count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayCount, error: todayError } = await this.client
      .from('processed_leads')
      .select('*', { count: 'exact', head: true })
      .gte('processed_at', today.toISOString());

    if (todayError) {
      logger.error({ error: todayError }, 'Error getting today count');
      throw todayError;
    }

    return {
      total: total || 0,
      byOwner,
      today: todayCount || 0
    };
  }

  /**
   * Close the connection (no-op for Supabase, kept for API compatibility)
   */
  close() {
    logger.info('State store connection closed');
  }
}

// Singleton instance
let stateStore = null;

/**
 * Initialize the state store with Supabase credentials
 * @param {Object} config - Supabase configuration
 * @param {string} config.url - Supabase project URL
 * @param {string} config.serviceRoleKey - Supabase service role key
 * @returns {StateStore}
 */
function initializeStateStore(config) {
  if (!config || !config.url || !config.serviceRoleKey) {
    throw new Error('Supabase URL and service role key are required');
  }

  stateStore = new StateStore(config.url, config.serviceRoleKey);
  stateStore.initialize();
  return stateStore;
}

/**
 * Get the state store instance
 * @returns {StateStore|null}
 */
function getStateStore() {
  return stateStore;
}

module.exports = {
  StateStore,
  initializeStateStore,
  getStateStore
};
