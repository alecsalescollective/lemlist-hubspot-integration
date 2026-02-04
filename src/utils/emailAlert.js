const nodemailer = require('nodemailer');
const { createLogger } = require('./logger');

const logger = createLogger('email-alert');

/**
 * Email alert manager for failure notifications
 */
class EmailAlertManager {
  /**
   * Create an email alert manager
   * @param {Object} config - Alert configuration
   * @param {boolean} config.enabled - Whether alerts are enabled
   * @param {string} config.emailTo - Recipient email address
   * @param {string} config.emailFrom - Sender email address
   * @param {number} config.failureThreshold - Consecutive failures before alerting
   * @param {Object} config.smtp - SMTP configuration
   */
  constructor(config) {
    this.enabled = config.enabled;
    this.emailTo = config.emailTo;
    this.emailFrom = config.emailFrom;
    this.failureThreshold = config.failureThreshold || 3;
    this.smtpConfig = config.smtp;

    // Track consecutive failures per pipeline
    this.failureCounts = {
      enrichment: 0,
      sequencing: 0
    };

    // Track last alert time to avoid spam
    this.lastAlertTime = {
      enrichment: 0,
      sequencing: 0
    };

    // Minimum time between alerts (15 minutes)
    this.alertCooldownMs = 15 * 60 * 1000;

    // Initialize transporter if enabled
    this.transporter = null;
    if (this.enabled && this.smtpConfig.host) {
      this.transporter = nodemailer.createTransport({
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        secure: this.smtpConfig.secure,
        auth: {
          user: this.smtpConfig.auth.user,
          pass: this.smtpConfig.auth.pass
        }
      });
    }
  }

  /**
   * Record a successful operation (resets failure count)
   * @param {string} pipeline - Pipeline name ('enrichment' or 'sequencing')
   */
  recordSuccess(pipeline) {
    if (this.failureCounts[pipeline] > 0) {
      logger.debug({ pipeline }, 'Resetting failure count after success');
    }
    this.failureCounts[pipeline] = 0;
  }

  /**
   * Record a failed operation and send alert if threshold exceeded
   * @param {string} pipeline - Pipeline name
   * @param {Error} error - The error that occurred
   * @param {Object} context - Additional context for the alert
   */
  async recordFailure(pipeline, error, context = {}) {
    this.failureCounts[pipeline]++;
    const count = this.failureCounts[pipeline];

    logger.warn(
      { pipeline, consecutiveFailures: count, threshold: this.failureThreshold },
      'Recorded pipeline failure'
    );

    if (count >= this.failureThreshold) {
      await this.sendAlert(pipeline, error, context);
    }
  }

  /**
   * Check if enough time has passed since last alert
   * @param {string} pipeline - Pipeline name
   * @returns {boolean}
   */
  canSendAlert(pipeline) {
    const now = Date.now();
    const lastAlert = this.lastAlertTime[pipeline] || 0;
    return (now - lastAlert) >= this.alertCooldownMs;
  }

  /**
   * Send an alert email
   * @param {string} pipeline - Pipeline name
   * @param {Error} error - The error that triggered the alert
   * @param {Object} context - Additional context
   */
  async sendAlert(pipeline, error, context = {}) {
    if (!this.enabled || !this.transporter) {
      logger.warn({ pipeline }, 'Email alerts disabled, skipping notification');
      return;
    }

    if (!this.canSendAlert(pipeline)) {
      logger.debug({ pipeline }, 'Alert cooldown active, skipping notification');
      return;
    }

    try {
      const subject = `[ALERT] HubSpot-Lemlist Integration - ${pipeline} Pipeline Failures`;

      const body = this.formatAlertBody(pipeline, error, context);

      await this.transporter.sendMail({
        from: this.emailFrom,
        to: this.emailTo,
        subject,
        text: body,
        html: this.formatAlertHtml(pipeline, error, context)
      });

      this.lastAlertTime[pipeline] = Date.now();
      logger.info({ pipeline, to: this.emailTo }, 'Alert email sent');

    } catch (emailError) {
      logger.error(
        { pipeline, error: emailError.message },
        'Failed to send alert email'
      );
    }
  }

  /**
   * Format plain text alert body
   * @param {string} pipeline - Pipeline name
   * @param {Error} error - The error
   * @param {Object} context - Additional context
   * @returns {string}
   */
  formatAlertBody(pipeline, error, context) {
    const timestamp = new Date().toISOString();
    const failureCount = this.failureCounts[pipeline];

    return `
HubSpot-Lemlist Integration Alert
=================================

Pipeline: ${pipeline}
Timestamp: ${timestamp}
Consecutive Failures: ${failureCount}

Error Details:
--------------
Message: ${error.message}
${error.response?.status ? `HTTP Status: ${error.response.status}` : ''}
${error.stack ? `\nStack Trace:\n${error.stack}` : ''}

Context:
--------
${Object.entries(context).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}

Action Required:
----------------
Please investigate the integration service. The ${pipeline} pipeline has failed ${failureCount} consecutive times.

Common issues:
- API credentials expired or invalid
- Rate limits exceeded
- Network connectivity issues
- HubSpot/Lemlist service outage

---
This is an automated alert from the HubSpot-Lemlist Integration service.
    `.trim();
  }

  /**
   * Format HTML alert body
   * @param {string} pipeline - Pipeline name
   * @param {Error} error - The error
   * @param {Object} context - Additional context
   * @returns {string}
   */
  formatAlertHtml(pipeline, error, context) {
    const timestamp = new Date().toISOString();
    const failureCount = this.failureCounts[pipeline];

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #dc3545; color: white; padding: 20px; }
    .content { padding: 20px; }
    .section { margin-bottom: 20px; }
    .label { font-weight: bold; color: #666; }
    .error-box { background: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 10px 0; }
    .context-table { width: 100%; border-collapse: collapse; }
    .context-table td { padding: 8px; border-bottom: 1px solid #eee; }
    .footer { background: #f8f9fa; padding: 15px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h2>HubSpot-Lemlist Integration Alert</h2>
  </div>
  <div class="content">
    <div class="section">
      <p><span class="label">Pipeline:</span> ${pipeline}</p>
      <p><span class="label">Timestamp:</span> ${timestamp}</p>
      <p><span class="label">Consecutive Failures:</span> <strong>${failureCount}</strong></p>
    </div>

    <div class="section">
      <h3>Error Details</h3>
      <div class="error-box">
        <p><strong>${error.message}</strong></p>
        ${error.response?.status ? `<p>HTTP Status: ${error.response.status}</p>` : ''}
      </div>
    </div>

    ${Object.keys(context).length > 0 ? `
    <div class="section">
      <h3>Context</h3>
      <table class="context-table">
        ${Object.entries(context).map(([key, value]) =>
          `<tr><td class="label">${key}</td><td>${JSON.stringify(value)}</td></tr>`
        ).join('')}
      </table>
    </div>
    ` : ''}

    <div class="section">
      <h3>Action Required</h3>
      <p>Please investigate the integration service. Common issues include:</p>
      <ul>
        <li>API credentials expired or invalid</li>
        <li>Rate limits exceeded</li>
        <li>Network connectivity issues</li>
        <li>HubSpot/Lemlist service outage</li>
      </ul>
    </div>
  </div>
  <div class="footer">
    This is an automated alert from the HubSpot-Lemlist Integration service.
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get current failure status for all pipelines
   * @returns {Object}
   */
  getStatus() {
    return {
      enabled: this.enabled,
      failureThreshold: this.failureThreshold,
      failureCounts: { ...this.failureCounts },
      lastAlertTimes: { ...this.lastAlertTime }
    };
  }

  /**
   * Reset failure counts (mainly for testing)
   */
  reset() {
    this.failureCounts = { enrichment: 0, sequencing: 0 };
    this.lastAlertTime = { enrichment: 0, sequencing: 0 };
  }
}

// Singleton instance (initialized when config is available)
let alertManager = null;

/**
 * Initialize the alert manager with configuration
 * @param {Object} alertConfig - Alert configuration from config module
 * @returns {EmailAlertManager}
 */
function initializeAlertManager(alertConfig) {
  alertManager = new EmailAlertManager(alertConfig);
  return alertManager;
}

/**
 * Get the alert manager instance
 * @returns {EmailAlertManager|null}
 */
function getAlertManager() {
  return alertManager;
}

module.exports = {
  EmailAlertManager,
  initializeAlertManager,
  getAlertManager
};
