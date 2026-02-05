const express = require('express');
const router = express.Router();

const leadsRoutes = require('./leads');
const campaignsRoutes = require('./campaigns');
const meetingsRoutes = require('./meetings');
const syncRoutes = require('./sync');
const webhooksRoutes = require('./webhooks');
const cronRoutes = require('./cron');
const funnelRoutes = require('./funnel');
const hubspotRoutes = require('./hubspot');

// Mount routes
router.use('/leads', leadsRoutes);
router.use('/campaigns', campaignsRoutes);
router.use('/meetings', meetingsRoutes);
router.use('/sync', syncRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/cron', cronRoutes);
router.use('/funnel', funnelRoutes);
router.use('/hubspot', hubspotRoutes);

// API info
router.get('/', (req, res) => {
  res.json({
    name: 'Sales Dashboard API',
    version: '1.0.0',
    endpoints: {
      leads: '/api/leads',
      campaigns: '/api/campaigns',
      meetings: '/api/meetings',
      sync: '/api/sync',
      webhooks: '/api/webhooks',
      funnel: '/api/funnel',
      hubspot: '/api/hubspot'
    }
  });
});

module.exports = router;
