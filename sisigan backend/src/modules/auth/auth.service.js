// src/modules/auth/auth.service.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');

/**
 * Authenticate a user and return a signed JWT
 */
async function login(email, password, metadata = {}) {
  // 1. Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    include: { branch: { select: { id: true, name: true, city: true } } },
  });

  if (!user || !user.isActive) {
    throw { statusCode: 401, message: 'Invalid email or password.' };
  }

  // 2. Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { statusCode: 401, message: 'Invalid email or password.' };
  }

  // 3. Sign JWT payload
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  await prisma.authLog.create({
    data: {
      userId: user.id,
      branchId: user.branchId,
      role: user.role,
      action: 'LOGIN',
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
    },
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
    },
  };
}

async function logout(requestingUser, metadata = {}) {
  await prisma.authLog.create({
    data: {
      userId: requestingUser.id,
      branchId: requestingUser.branchId,
      role: requestingUser.role,
      action: 'LOGOUT',
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
    },
  });

  return { message: 'Logged out successfully.' };
}

module.exports = { login, logout };
