// src/modules/users/user.service.js

const bcrypt = require('bcryptjs');
const prisma = require('../../config/db');

// ── LIST USERS ────────────────────────────────────────────
// Manager: all users across all branches
// Admin:   only users in their own branch
async function listUsers({ requestingUser }) {
  const where = {};

  if (requestingUser.role === 'ADMIN') {
    where.branchId = requestingUser.branchId;
  }
  // MANAGER sees everyone — no filter

  return prisma.user.findMany({
    where,
    select: {
      id: true, name: true, email: true,
      role: true, isActive: true, createdAt: true,
      branch: { select: { id: true, name: true, city: true } },
    },
    orderBy: [{ branch: { name: 'asc' } }, { name: 'asc' }],
  });
}

// ── CREATE USER ───────────────────────────────────────────
// Manager: can create ADMIN or CASHIER for any branch
// Admin:   can only create CASHIER for their own branch
async function createUser({ name, email, password, role, branchId }, requestingUser) {
  // Admins can only create cashiers in their own branch
  if (requestingUser.role === 'ADMIN') {
    if (role !== 'CASHIER') {
      throw { statusCode: 403, message: 'Admins can only create Cashier accounts.' };
    }
    if (Number(branchId) !== requestingUser.branchId) {
      throw { statusCode: 403, message: 'Admins can only create accounts for their own branch.' };
    }
  }

  // Only MANAGER can create ADMIN or MANAGER accounts
  if (role === 'MANAGER' && requestingUser.role !== 'MANAGER') {
    throw { statusCode: 403, message: 'Only Managers can create Manager accounts.' };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw { statusCode: 409, message: 'Email is already in use.' };

  const branch = await prisma.branch.findUnique({ where: { id: Number(branchId) } });
  if (!branch) throw { statusCode: 404, message: 'Branch not found.' };

  const hashed = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: { name, email, password: hashed, role, branchId: Number(branchId) },
    select: {
      id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
      branch: { select: { id: true, name: true, city: true } },
    },
  });
}

// ── UPDATE USER ───────────────────────────────────────────
async function updateUser(userId, { name, email, role, branchId, isActive }, requestingUser) {
  const target = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!target) throw { statusCode: 404, message: 'User not found.' };

  // Admin can only edit users in their own branch
  if (requestingUser.role === 'ADMIN' && target.branchId !== requestingUser.branchId) {
    throw { statusCode: 403, message: 'Access denied.' };
  }

  // Admin cannot edit Managers or other Admins — only Cashiers
  if (requestingUser.role === 'ADMIN' && target.role !== 'CASHIER') {
    throw { statusCode: 403, message: 'Admins can only edit Cashier accounts.' };
  }

  // Admin cannot change roles or branches
  if (requestingUser.role === 'ADMIN' && (role || branchId)) {
    throw { statusCode: 403, message: 'Admins cannot change roles or branch assignments.' };
  }

  const data = {};
  if (name)      data.name     = name;
  if (email)     data.email    = email;
  if (role)      data.role     = role;
  if (branchId)  data.branchId = Number(branchId);
  if (isActive !== undefined) data.isActive = isActive;

  return prisma.user.update({
    where: { id: Number(userId) },
    data,
    select: {
      id: true, name: true, email: true, role: true, isActive: true,
      branch: { select: { id: true, name: true, city: true } },
    },
  });
}

// ── RESET PASSWORD ────────────────────────────────────────
async function resetPassword(userId, newPassword, requestingUser) {
  const target = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!target) throw { statusCode: 404, message: 'User not found.' };

  if (requestingUser.role === 'ADMIN' && target.branchId !== requestingUser.branchId) {
    throw { statusCode: 403, message: 'Access denied.' };
  }

  // Admin can only reset passwords of Cashiers
  if (requestingUser.role === 'ADMIN' && target.role !== 'CASHIER') {
    throw { statusCode: 403, message: 'Admins can only reset passwords for Cashier accounts.' };
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: Number(userId) }, data: { password: hashed } });
  return { message: 'Password updated successfully.' };
}

// ── TOGGLE ACTIVE ─────────────────────────────────────────
async function toggleActive(userId, requestingUser) {
  const target = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!target) throw { statusCode: 404, message: 'User not found.' };

  if (requestingUser.role === 'ADMIN' && target.branchId !== requestingUser.branchId) {
    throw { statusCode: 403, message: 'Access denied.' };
  }

  // Admin can only toggle Cashiers
  if (requestingUser.role === 'ADMIN' && target.role !== 'CASHIER') {
    throw { statusCode: 403, message: 'Admins can only activate/deactivate Cashier accounts.' };
  }

  // Cannot deactivate yourself
  if (target.id === requestingUser.id) {
    throw { statusCode: 400, message: 'You cannot deactivate your own account.' };
  }

  return prisma.user.update({
    where: { id: Number(userId) },
    data: { isActive: !target.isActive },
    select: { id: true, name: true, isActive: true },
  });
}

module.exports = { listUsers, createUser, updateUser, resetPassword, toggleActive };