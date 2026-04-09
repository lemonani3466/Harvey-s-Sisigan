// src/modules/menu/menu.controller.js

const menuService = require('./menu.service');
const { validationResult } = require('express-validator');

async function getMenuByCategory(req, res, next) {
  try {
    const includeUnavailable = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';
    const menu = await menuService.getMenuWithCategories({ includeUnavailable });

    // Convert photo blob to Base64 for frontend
    const menuWithPhoto = menu.map(item => ({
      photo: item.photo ? item.photo.toString('base64') : null,
      name: item.name,
      price: item.price,
      category: item.category, // optional if you want categories
    }));

    res.json({ success: true, data: menuWithPhoto });
  } catch (err) { next(err); }
}

async function getAllItems(req, res, next) {
  try {
    const includeUnavailable = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';
    const items = await menuService.getAllMenuItems({ includeUnavailable });

    const itemsWithPhoto = items.map(item => ({
      photo: item.photo ? item.photo.toString('base64') : null,
      name: item.name,
      price: item.price
    }));

    res.json({ success: true, data: itemsWithPhoto });
  } catch (err) { next(err); }
}

async function getAllItems(req, res, next) {
  try {
    const includeUnavailable = req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER';
    const items = await menuService.getAllMenuItems({ includeUnavailable });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
}

async function createItem(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const item = await menuService.createMenuItem(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
}

async function updateItem(req, res, next) {
  try {
    const item = await menuService.updateMenuItem(req.params.id, req.body);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
}

async function toggleItem(req, res, next) {
  try {
    const item = await menuService.toggleAvailability(req.params.id);
    res.json({ success: true, data: item, message: `Item is now ${item.isAvailable ? 'available' : 'unavailable'}.` });
  } catch (err) { next(err); }
}

module.exports = { getMenuByCategory, getAllItems, createItem, updateItem, toggleItem };