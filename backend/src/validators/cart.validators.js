'use strict';

const Joi = require('joi');

/**
 * Same per-item caps as POST /orders — keep them in sync.
 * Quantity capped at 10 prevents a single line from becoming a denial-of-prep
 * for the seller (a real-world abuse vector on similar platforms).
 */
const cartItemSchema = Joi.object({
  menu_item_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  quantity: Joi.number().integer().min(1).max(10).required(),
  // Optional — when provided, we surface a `price_changed` warning if
  // the server price has drifted since the client added the item to its cart.
  client_price: Joi.number().positive().max(10000).precision(2).optional(),
});

const validateCartSchema = Joi.object({
  body: Joi.object({
    items: Joi.array().items(cartItemSchema).min(1).max(20).required(),
    // Optional sanity check — if provided, the cart's items must all belong here.
    seller_id: Joi.string().uuid({ version: 'uuidv4' }).optional(),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

module.exports = { validateCartSchema };
