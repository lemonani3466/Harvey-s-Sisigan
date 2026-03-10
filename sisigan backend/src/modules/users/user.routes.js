// src/modules/users/user.routes.js
const express = require('express');
const { body } = require('express-validator');
const userController = require('./user.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');

const router = express.Router();
router.use(authMiddleware);

// Only MANAGER and ADMIN can access user management
router.use(roleMiddleware('MANAGER', 'ADMIN'));

const createValidation = [
  body('name').notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').isIn(['MANAGER', 'ADMIN', 'CASHIER']).withMessage('Role must be MANAGER, ADMIN, or CASHIER.'),
  body('branchId').isInt({ min: 1 }).withMessage('Valid branchId is required.'),
];

const resetPasswordValidation = [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

// GET    /api/users              — list users (scoped by role)
router.get('/', userController.list);

// POST   /api/users              — create user
router.post('/', createValidation, userController.create);

// PATCH  /api/users/:id          — update name/email/role/branch
router.patch('/:id', userController.update);

// PATCH  /api/users/:id/password — reset password
router.patch('/:id/password', resetPasswordValidation, userController.resetPassword);

// PATCH  /api/users/:id/toggle   — activate / deactivate
router.patch('/:id/toggle', userController.toggleActive);

module.exports = router;