'use strict';

const Joi = require('joi');

const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Agadir', 'Tanger', 'Meknes', 'Oujda'];

const browseItemsQuerySchema = Joi.object({
  body: Joi.object(),
  params: Joi.object(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    search: Joi.string().trim().min(1).max(100).optional(),
    category: Joi.string().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    city: Joi.string().valid(...CITIES).optional(),
    seller_id: Joi.string().uuid({ version: 'uuidv4' }).optional(),
    min_price: Joi.number().positive().max(10000).optional(),
    max_price: Joi.number().positive().max(10000).optional(),
    sort: Joi.string().valid('recent', 'price_asc', 'price_desc').default('recent'),
  }).custom((value, helpers) => {
    if (value.min_price && value.max_price && value.min_price > value.max_price) {
      return helpers.error('any.invalid', { message: 'min_price must be ≤ max_price' });
    }
    return value;
  }),
});

const browseSellerProfileParamSchema = Joi.object({
  body: Joi.object(),
  params: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

const browseFeaturedQuerySchema = Joi.object({
  body: Joi.object(),
  params: Joi.object(),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20),
    city: Joi.string().valid(...CITIES).optional(),
  }),
});

module.exports = {
  browseItemsQuerySchema,
  browseSellerProfileParamSchema,
  browseFeaturedQuerySchema,
};
