'use strict';

const Joi = require('joi');

const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Agadir', 'Tanger', 'Meknes', 'Oujda'];

const updateSellerProfileSchema = Joi.object({
  body: Joi.object({
    business_name: Joi.string().min(2).max(150).optional(),
    bio: Joi.string().max(500).optional().allow(''),
    address: Joi.string().min(5).max(255).optional(),
    city: Joi.string().valid(...CITIES).optional(),
    delivery_radius_km: Joi.number().integer().min(1).max(50).optional(),
  }).min(1).required(),
  params: Joi.object(),
  query: Joi.object(),
});

const toggleAvailabilitySchema = Joi.object({
  body: Joi.object({
    is_open: Joi.boolean().required(),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

const sellerOrdersQuerySchema = Joi.object({
  body: Joi.object(),
  params: Joi.object(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid('pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled').optional(),
    date: Joi.date().iso().optional(),
    from_date: Joi.date().iso().optional(),
    to_date: Joi.date().iso().optional(),
  }),
});

module.exports = { updateSellerProfileSchema, toggleAvailabilitySchema, sellerOrdersQuerySchema };
