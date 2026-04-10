// src/modules/menu/menu.service.js



const prisma = require('../../config/db');

function photoToDataUri(photoBuffer) {
  if (!photoBuffer) return null;

  let buf;
  if (photoBuffer?.type === 'Buffer' && Array.isArray(photoBuffer.data)) {
    buf = Buffer.from(photoBuffer.data)
  } else if (Buffer.isBuffer(photoBuffer)) {
    buf = photoBuffer
  } else {
    return `data:image/jpeg;base64,${photoBuffer}`
  }

  const hex = buf.slice(0, 4).toString('hex')
  const mime = hex.startsWith('ffd8ff')   ? 'image/jpeg'
             : hex.startsWith('89504e47') ? 'image/png'
             : hex.startsWith('47494638') ? 'image/gif'
             : hex.startsWith('52494646') ? 'image/webp'
             : 'image/jpeg'

  return `data:${mime};base64,${buf.toString('base64')}`
}

// rest of the file stays the same...

function serializeItem(item, includePhoto = false) {
  const { photo, ...rest } = item;
  return includePhoto
    ? { ...rest, photo: photoToDataUri(photo) }
    : rest;
}

async function getMenuWithCategories({ includeUnavailable, includePhoto = false }) {
  const rawMenu = await prisma.category.findMany({
    include: { items: true },  // 👈 was menuItems
  });

  const firstItem = rawMenu?.[0]?.items?.[0]
  console.log('photo field:', firstItem?.photo)
  console.log('photo type:', typeof firstItem?.photo)
  console.log('is Buffer:', Buffer.isBuffer(firstItem?.photo))

  return rawMenu.map(category => {
    const { items: menuItems, ...categoryRest } = category;  // 👈 was menuItems
    return {
      ...categoryRest,
      items: menuItems
        .filter(item => includeUnavailable || item.isAvailable)
        .map(item => serializeItem(item, includePhoto)),
    };
  });
}
async function getAllMenuItems({ includeUnavailable, includePhoto = false }) {
  const rawItems = await prisma.menuItem.findMany({
    include: { category: { select: { id: true, name: true } } },
  });

  return rawItems
    .filter(item => includeUnavailable || item.isAvailable)
    .map(item => serializeItem(item, includePhoto));
}

async function createMenuItem({ name, description, price, imageUrl, categoryId, photo }) {
  const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
  if (!category) throw { statusCode: 404, message: 'Category not found.' };

  const photoBuffer = photo
    ? Buffer.isBuffer(photo) ? photo : Buffer.from(photo, 'base64')
    : null;

  return prisma.menuItem.create({
    data: {
      name,
      description,
      price:      Number(price),
      imageUrl,
      categoryId: Number(categoryId),
      photo:      photoBuffer,
    },
    include: { category: { select: { id: true, name: true } } },
  });
}

async function updateMenuItem(id, data) {
  const item = await prisma.menuItem.findUnique({ where: { id: Number(id) } });
  if (!item) throw { statusCode: 404, message: 'Menu item not found.' };

  const photoBuffer = data.photo !== undefined
    ? data.photo
      ? Buffer.isBuffer(data.photo) ? data.photo : Buffer.from(data.photo, 'base64')
      : null
    : undefined;

  return prisma.menuItem.update({
    where: { id: Number(id) },
    data: {
      ...(data.name                    && { name:       data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price                   && { price:      Number(data.price) }),
      ...(data.imageUrl !== undefined  && { imageUrl:   data.imageUrl }),
      ...(data.categoryId              && { categoryId: Number(data.categoryId) }),
      ...(photoBuffer !== undefined    && { photo:      photoBuffer }),
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