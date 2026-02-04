const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { createLogger } = require('../utils/logger');

const logger = createLogger('state-store');

/**
 * SQLite State Store
 * Tracks processed leads to prevent duplicate processing
 */
class StateStore {
  /**
   * Create a state store
   * @param {string} dbPath - Path to SQLite database file
   */
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Initialize the database and create tables if needed
   */
  initialize() {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.dbPath);

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');

    // Create table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processed_leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT UNIQUE NOT NULL,
        email TEXT,
        owner TEXT,
        campaign_id TEXT,
        lead_source TEXT,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_contact_id ON processed_leads(contact_id);
      CREATE INDEX IF NOT EXISTS idx_email ON processed_leads(email);
    `);

    logger.info({ dbPath: this.dbPath }, 'State store initialized');
  }

  /**
   * Check if a contact has already been processed
   * @param {string} contactId - HubSpot contact ID
   * @returns {boolean} True if already processed
   */
  isProcessed(contactId) {
    const stmt = this.db.prepare('SELECT 1 FROM processed_leads WHERE contact_id = ?');
    const result = stmt.get(contactId);
    return !!result;
  }

  /**
   * Check if an email has already been processed
   * @param {string} email - Contact email
   * @returns {boolean} True if already processed
   */
  isEmailProcessed(email) {
    if (!email) return false;
    const stmt = this.db.prepare('SELECT 1 FROM processed_leads WHERE email = ?');
    const result = stmt.get(email.toLowerCase());
    return !!result;
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
  markProcessed(contactId, data = {}) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO processed_leads
      (contact_id, email, owner, campaign_id, lead_source, processed_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      contactId,
      data.email ? data.email.toLowerCase() : null,
      data.owner || null,
      data.campaignId || null,
      data.leadSource || null
    );

    logger.debug({ contactId, ...data }, 'Marked contact as processed');
  }

  /**
   * Get the total count of processed leads
   * @returns {number} Count of processed leads
   */
  getProcessedCount() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM processed_leads');
    const result = stmt.get();
    return result.count;
  }

  /**
   * Get processed leads by owner
   * @param {string} owner - Owner name
   * @returns {Object[]} Array of processed lead records
   */
  getProcessedByOwner(owner) {
    const stmt = this.db.prepare('SELECT * FROM processed_leads WHERE owner = ?');
    return stmt.all(owner);
  }

  /**
   * Get recently processed leads
   * @param {number} limit - Max number of records to return
   * @returns {Object[]} Array of processed lead records
   */
  getRecentlyProcessed(limit = 100) {
    const stmt = this.db.prepare(
      'SELECT * FROM processed_leads ORDER BY processed_at DESC LIMIT ?'
    );
    return stmt.all(limit);
  }

  /**
   * Remove a processed lead record (for reprocessing)
   * @param {string} contactId - HubSpot contact ID
   * @returns {boolean} True if record was deleted
   */
  removeProcessed(contactId) {
    const stmt = this.db.prepare('DELETE FROM processed_leads WHERE contact_id = ?');
    const result = stmt.run(contactId);
    return result.changes > 0;
  }

  /**
   * Get statistics about processed leads
   * @returns {Object} Statistics object
   */
  getStats() {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM processed_leads');
    const byOwnerStmt = this.db.prepare(
      'SELECT owner, COUNT(*) as count FROM processed_leads GROUP BY owner'
    );
    const todayStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM processed_leads WHERE date(processed_at) = date('now')"
    );

    return {
      total: totalStmt.get().count,
      byOwner: byOwnerStmt.all(),
      today: todayStmt.get().count
    };
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      logger.info('State store closed');
    }
  }
}

// Singleton instance
let stateStore = null;

/**
 * Initialize the state store with default path
 * @param {string} dbPath - Optional custom database path
 * @returns {StateStore}
 */
function initializeStateStore(dbPath) {
  const defaultPath = path.join(process.cwd(), 'data', 'processed_leads.db');
  stateStore = new StateStore(dbPath || defaultPath);
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
