const express = require('express');
const router = express.Router();

const leadsRoutes = require('./leads');
const campaignsRoutes = require('./campaigns');
const tasksRoutes = require('./tasks');
const meetingsRoutes = require('./meetings');
const syncRoutes = require('./sync');
const webhooksRoutes = require('./webhooks');
const cronRoutes = require('./cron');
const funnelRoutes = require('./funnel');

// Mount routes
router.use('/leads', leadsRoutes);
router.use('/campaigns', campaignsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/meetings', meetingsRoutes);
router.use('/sync', syncRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/cron', cronRoutes);
router.use('/funnel', funnelRoutes);

// API info
router.get('/', (req, res) => {
  res.json({
    name: 'Sales Dashboard API',
    version: '1.0.0',
    endpoints: {
      leads: '/api/leads',
      campaigns: '/api/campaigns',
      tasks: '/api/tasks',
      meetings: '/api/meetings',
      sync: '/api/sync',
      webhooks: '/api/webhooks',
      funnel: '/api/funnel'
    }
  });
});

module.exports = router;
