// src/modules/menu/menu.service.js

const prisma = require('../../config/db');

async function getMenuWithCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: { name: 'asc' },
      },
    },
  });
}

async function getAllMenuItems({ includeUnavailable = false } = {}) {
  const where = includeUnavailable ? {} : { isAvailable: true };
  return prisma.menuItem.findMany({
    where,
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
  });
}

async function createMenuItem({ name, description, price, imageUrl, categoryId }) {
  // Validate category exists
  const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
  if (!category) throw { statusCode: 404, message: 'Category not found.' };

  return prisma.menuItem.create({
    data: { name, description, price: Number(price), imageUrl, categoryId: Number(categoryId) },
    include: { category: { select: { id: true, name: true } } },
  });
}

async function updateMenuItem(id, data) {
  const item = await prisma.menuItem.findUnique({ where: { id: Number(id) } });
  if (!item) throw { statusCode: 404, message: 'Menu item not found.' };

  return prisma.menuItem.update({
    where: { id: Number(id) },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price && { price: Number(data.price) }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.categoryId && { categoryId: Number(data.categoryId) }),
    },
    include: { category: { select: { id: true, name: true } } },
  });
}

async function toggleAvailability(id) {
  const item = await prisma.menuItem.findUnique({ where: { id: Number(id) } });
  if (!item) throw { statusCode: 404, message: 'Menu item not found.' };

  return prisma.menuItem.update({
    where: { id: Number(id) },
    data: { isAvailable: !item.isAvailable },
  });
}

module.exports = { getMenuWithCategories, getAllMenuItems, createMenuItem, updateMenuItem, toggleAvailability };
