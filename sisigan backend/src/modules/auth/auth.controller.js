// src/modules/auth/auth.controller.js

const { validationResult } = require('express-validator');
const authService = require('./auth.service');
const prisma = require('../../config/db');

function getRequestMetadata(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : req.ip;

  const userAgent = req.headers['user-agent'];
  return { ipAddress, userAgent };
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const result = await authService.login(email, password, getRequestMetadata(req));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// Returns the current logged-in user's profile (with branch details)
async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branch: { select: { id: true, name: true, city: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const result = await authService.logout(req.user, getRequestMetadata(req));
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, logout };
