// src/modules/menu/menu.service.js

const prisma = require('../../config/db');

function photoToDataUri(photoBuffer) {
  if (!photoBuffer) return null;

  let buf;
  if (photoBuffer?.type === 'Buffer' && Array.isArray(photoBuffer.data)) {
    buf = Buffer.from(photoBuffer.data);
  } else if (Buffer.isBuffer(photoBuffer)) {
    buf = photoBuffer;
  } else {
    return `data:image/jpeg;base64,${photoBuffer}`;
  }

  const hex = buf.slice(0, 4).toString('hex');
  const mime = hex.startsWith('ffd8ff')
    ? 'image/jpeg'
    : hex.startsWith('89504e47')
      ? 'image/png'
      : hex.startsWith('47494638')
        ? 'image/gif'
        : hex.startsWith('52494646')
          ? 'image/webp'
          : 'image/jpeg';

  return `data:${mime};base64,${buf.toString('base64')}`;
}

function serializeItem(item, includePhoto = false) {
  const { photo, ...rest } = item;
  return includePhoto ? { ...rest, photo: photoToDataUri(photo) } : rest;
}

async function getOutOfStockMenuItemIds(menuItemIds, branchId) {
  if (!branchId || !menuItemIds.length) return new Set();

  const recipes = await prisma.menuItemRecipeIngredient.findMany({
    where: { menuItemId: { in: menuItemIds } },
    select: { menuItemId: true, ingredientId: true },
  });

  if (!recipes.length) return new Set();

  const ingredientIds = [...new Set(recipes.map((r) => r.ingredientId))];
  const inventoryRows = await prisma.inventoryItem.findMany({
    where: {
      branchId: Number(branchId),
      ingredientId: { in: ingredientIds },
      isActive: true,
    },
    select: { ingredientId: true, quantity: true },
  });

  const inventoryByIngredient = new Map(
    inventoryRows.map((row) => [row.ingredientId, Number(row.quantity)])
  );

  const blocked = new Set();
  for (const recipe of recipes) {
    const qty = inventoryByIngredient.get(recipe.ingredientId);
    if (qty === undefined || qty <= 0) {
      blocked.add(recipe.menuItemId);
    }
  }

  return blocked;
}

async function getMenuWithCategories({
  includeUnavailable,
  includePhoto = false,
  enforceStock = false,
  branchId = null,
}) {
  const rawMenu = await prisma.category.findMany({
    include: { items: true },
  });

  const allItemIds = rawMenu.flatMap((category) => category.items.map((item) => item.id));
  const blockedIds = enforceStock
    ? await getOutOfStockMenuItemIds(allItemIds, branchId)
    : new Set();

  return rawMenu.map((category) => {
    const { items: menuItems, ...categoryRest } = category;

    return {
      ...categoryRest,
      items: menuItems
        .filter((item) => includeUnavailable || item.isAvailable)
        .filter((item) => !blockedIds.has(item.id))
        .map((item) => serializeItem(item, includePhoto)),
    };
  });
}

async function getAllMenuItems({
  includeUnavailable,
  includePhoto = false,
  enforceStock = false,
  branchId = null,
}) {
  const rawItems = await prisma.menuItem.findMany({
    include: { category: { select: { id: true, name: true } } },
  });

  const blockedIds = enforceStock
    ? await getOutOfStockMenuItemIds(rawItems.map((item) => item.id), branchId)
    : new Set();

  return rawItems
    .filter((item) => includeUnavailable || item.isAvailable)
    .filter((item) => !blockedIds.has(item.id))
    .map((item) => serializeItem(item, includePhoto));
}

async function createMenuItem({ name, description, price, imageUrl, categoryId, photo }) {
  const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
  if (!category) throw { statusCode: 404, message: 'Category not found.' };

  const photoBuffer = photo
    ? Buffer.isBuffer(photo)
      ? photo
      : Buffer.from(photo, 'base64')
    : null;

  return prisma.menuItem.create({
    data: {
      name,
      description,
      price: Number(price),
      imageUrl,
      categoryId: Number(categoryId),
      photo: photoBuffer,
    },
    include: { category: { select: { id: true, name: true } } },
  });
}

async function updateMenuItem(id, data) {
  const item = await prisma.menuItem.findUnique({ where: { id: Number(id) } });
  if (!item) throw { statusCode: 404, message: 'Menu item not found.' };

  const photoBuffer = data.photo !== undefined
    ? data.photo
      ? Buffer.isBuffer(data.photo)
        ? data.photo
        : Buffer.from(data.photo, 'base64')
      : null
    : undefined;

  return prisma.menuItem.update({
    where: { id: Number(id) },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price && { price: Number(data.price) }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.categoryId && { categoryId: Number(data.categoryId) }),
      ...(photoBuffer !== undefined && { photo: photoBuffer }),
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

module.exports = {
  getMenuWithCategories,
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleAvailability,
};
