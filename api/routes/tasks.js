const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');

/**
 * GET /api/tasks
 * Get all tasks with optional filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { owner, due = 'all' } = req.query;
    const tasks = await dashboardService.getTasks(owner, due);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tasks/overdue
 * Get overdue tasks only
 */
router.get('/overdue', async (req, res, next) => {
  try {
    const { owner } = req.query;
    const tasks = await dashboardService.getOverdueTasks(owner);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
