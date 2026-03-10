// src/modules/dashboard/dashboard.routes.js
const express = require('express');
const dashboardController = require('./dashboard.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware  = require('../../middleware/role.middleware');

const router = express.Router();
router.use(authMiddleware);

// All authenticated users can see dashboard (scoped by role in service)
// GET /api/dashboard?period=today|week|month|custom&from=YYYY-MM-DD&to=YYYY-MM-DD&branchId=1
router.get('/', dashboardController.getDashboard);

// GET /api/dashboard/branches — branch list for filter dropdown (Manager only)
router.get('/branches', roleMiddleware('MANAGER'), dashboardController.getBranches);

module.exports = router;