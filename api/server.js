require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createLogger } = require('../src/utils/logger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const logger = createLogger('api-server');
const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
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

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dashboard/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'API server started');
  console.log(`🚀 API server running at http://localhost:${PORT}`);
  console.log(`📊 Dashboard API available at http://localhost:${PORT}/api`);
});

module.exports = app;
