require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createLogger } = require('./utils/logger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const logger = createLogger('api-server');
const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware - CORS configuration
// Reflect requesting origin (internal dashboard API)
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path, query: req.query }, 'API Request');
  next();
});

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Lemlist-HubSpot Dashboard API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      leads: '/api/leads',
      campaigns: '/api/campaigns',
      tasks: '/api/tasks',
      meetings: '/api/meetings',
      sync: '/api/sync'
    }
  });
});

// Error handling
app.use(errorHandler);

// Only start server if not in serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'API server started');
    console.log(`🚀 API server running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard API available at http://localhost:${PORT}/api`);
  });
}

module.exports = app;
