// src/modules/menu/menu.routes.js

const express = require('express');
const { body } = require('express-validator');
const menuController = require('./menu.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware);

const itemValidation = [
  body('name').notEmpty().withMessage('Name is required.'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('categoryId').isInt({ min: 1 }).withMessage('Valid categoryId is required.'),
];

// GET  /api/menu/categories  - Menu grouped by category (for Flutter POS screen)
router.get('/categories', menuController.getMenuByCategory);

// GET  /api/menu             - Flat list of all items
router.get('/', menuController.getAllItems);

// POST /api/menu             - Add item (ADMIN/MANAGER)
router.post('/', roleMiddleware('ADMIN', 'MANAGER'), itemValidation, menuController.createItem);

// PATCH /api/menu/:id        - Edit item
router.patch('/:id', roleMiddleware('ADMIN', 'MANAGER'), menuController.updateItem);

// PATCH /api/menu/:id/toggle - Toggle availability (86'd item)
router.patch('/:id/toggle', roleMiddleware('ADMIN', 'MANAGER'), menuController.toggleItem);

module.exports = router;
