// src/modules/auth/auth.controller.js

const { validationResult } = require('express-validator');
const authService = require('./auth.service');

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// Returns the current logged-in user's profile
async function me(req, res) {
  res.json({ success: true, data: { user: req.user } });
}

module.exports = { login, me };
