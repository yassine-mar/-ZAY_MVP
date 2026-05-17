'use strict';

const Joi = require('joi');

const createItemSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    description: Joi.string().max(500).optional().allow(''),
    price: Joi.number().precision(2).min(1).max(10000).required(),
    category_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
    prep_time_min: Joi.number().integer().min(5).max(480).optional(),
    is_available: Joi.boolean().default(true),
  }).required(),
  params: Joi.object({
    menuId: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

const updateItemSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(150).optional(),
    description: Joi.string().max(500).optional().allow(''),
    price: Joi.number().precision(2).min(1).max(10000).optional(),
    category_id: Joi.string().uuid({ version: 'uuidv4' }).optional(),
    prep_time_min: Joi.number().integer().min(5).max(480).optional(),
  }).min(1).required(),
  params: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

const toggleAvailabilitySchema = Joi.object({
  body: Joi.object({
    is_available: Joi.boolean().required(),
  }).required(),
  params: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

module.exports = { createItemSchema, updateItemSchema, toggleAvailabilitySchema };
