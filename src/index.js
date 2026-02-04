const cron = require('node-cron');
const { config } = require('./config');
const { createLogger } = require('./utils/logger');
const { initializeAlertManager } = require('./utils/emailAlert');
const { initializeStateStore, getStateStore } = require('./services/stateStore');
const HubSpotClient = require('./services/hubspot');
const LemlistClient = require('./services/lemlist');
const LeadPipeline = require('./pipelines/leadPipeline');

const logger = createLogger('main');

/**
 * Main entry point for the HubSpot-Lemlist integration service
 * Simplified read-only flow: HubSpot (read) -> SQLite (state) -> Lemlist (write)
 */
async function main() {
  logger.info({
    nodeEnv: config.nodeEnv,
    pollingIntervalMs: config.polling.intervalMs
  }, 'Starting HubSpot-Lemlist integration service (simplified read-only mode)');

  // Initialize state store (SQLite)
  logger.info('Initializing state store...');
  const stateStore = initializeStateStore();
  const stats = stateStore.getStats();
  logger.info({ processedCount: stats.total }, 'State store initialized');

  // Initialize alert manager
  const alertManager = initializeAlertManager(config.alerts);
  if (config.alerts.enabled) {
    logger.info({ emailTo: config.alerts.emailTo }, 'Email alerts enabled');
  } else {
    logger.info('Email alerts disabled');
  }

  // Initialize API clients
  logger.info('Initializing API clients...');

  const hubspotClient = new HubSpotClient(config.hubspot);
  const lemlistClient = new LemlistClient(config.lemlist);

  // Validate connections
  logger.info('Validating API connections...');
  await validateConnections(hubspotClient, lemlistClient);

  // Initialize lead pipeline
  const leadPipeline = new LeadPipeline(
    hubspotClient,
    lemlistClient,
    stateStore,
    config,
    alertManager
  );

  // Calculate cron expression from polling interval
  const intervalMinutes = Math.max(1, Math.floor(config.polling.intervalMs / 60000));
  const cronExpression = `*/${intervalMinutes} * * * *`;

  logger.info({ cronExpression, intervalMinutes }, 'Scheduling lead pipeline');

  // Schedule lead pipeline
  const pipelineJob = cron.schedule(cronExpression, async () => {
    try {
      logger.debug('Cron trigger: lead pipeline');
      await leadPipeline.run();
    } catch (error) {
      logger.error({ error: error.message }, 'Lead pipeline cron error');
    }
  });

  // Run pipeline immediately on startup
  logger.info('Running initial pipeline cycle...');

  try {
    const results = await leadPipeline.run();
    logger.info(
      {
        processed: results.processed,
        succeeded: results.succeeded,
        failed: results.failed,
        skipped: results.skipped,
        duplicates: results.duplicates
      },
      'Initial pipeline run complete'
    );
  } catch (error) {
    logger.error({ error: error.message }, 'Initial pipeline run failed');
  }

  logger.info('Service started successfully. Waiting for scheduled runs...');

  // Handle graceful shutdown
  setupGracefulShutdown(pipelineJob, stateStore);
}

/**
 * Validate API connections before starting
 * @param {HubSpotClient} hubspotClient
 * @param {LemlistClient} lemlistClient
 */
async function validateConnections(hubspotClient, lemlistClient) {
  const hubspotOk = await hubspotClient.verifyConnection();
  if (!hubspotOk) {
    throw new Error('Failed to connect to HubSpot API. Check your access token.');
  }

  const lemlistOk = await lemlistClient.verifyConnection();
  if (!lemlistOk) {
    throw new Error('Failed to connect to Lemlist API. Check your API key.');
  }

  // Optionally validate campaign IDs
  const allCampaignIds = extractCampaignIds(config.routing.routing_rules);
  const placeholderIds = allCampaignIds.filter(id => id.startsWith('PLACEHOLDER'));

  if (placeholderIds.length > 0) {
    logger.warn(
      { count: placeholderIds.length },
      'Found placeholder campaign IDs in routing config. Update routing.json with real IDs before production use.'
    );
  } else {
    // Validate real campaign IDs
    const validation = await lemlistClient.validateCampaignIds(allCampaignIds);
    if (validation.invalid.length > 0) {
      logger.error(
        { invalidIds: validation.invalid },
        'Some campaign IDs in routing config do not exist in Lemlist'
      );
      // Don't throw - just warn. Campaigns might be created later.
    }
  }

  logger.info('API connections validated successfully');
}

/**
 * Extract all campaign IDs from routing rules
 * @param {Object[]} routingRules
 * @returns {string[]}
 */
function extractCampaignIds(routingRules) {
  const ids = new Set();

  for (const rule of routingRules) {
    for (const campaignId of Object.values(rule.sequences)) {
      if (campaignId) {
        ids.add(campaignId);
      }
    }
  }

  return Array.from(ids);
}

/**
 * Setup graceful shutdown handlers
 * @param {Object} pipelineJob - Cron job to stop
 * @param {Object} stateStore - State store to close
 */
function setupGracefulShutdown(pipelineJob, stateStore) {
  const shutdown = (signal) => {
    logger.info({ signal }, 'Received shutdown signal');

    // Stop cron job
    if (pipelineJob) {
      pipelineJob.stop();
    }

    // Close state store
    if (stateStore) {
      stateStore.close();
    }

    logger.info('Service stopped');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ reason, promise }, 'Unhandled rejection');
    process.exit(1);
  });
}

// Run main
main().catch(error => {
  logger.fatal({ error: error.message, stack: error.stack }, 'Failed to start service');
  process.exit(1);
});
