'use strict';

const Joi = require('joi');

const approveSellerSchema = Joi.object({
  body: Joi.object({
    note: Joi.string().max(500).optional().allow(''),
  }),
  params: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

const rejectSellerSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().min(10).max(500).required(),
  }).required(),
  params: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

const suspendSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().min(5).max(500).required(),
  }).required(),
  params: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

const createCategorySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string().lowercase().pattern(/^[a-z0-9-]+$/).max(100).required(),
    icon: Joi.string().max(10).optional(),
    is_active: Joi.boolean().default(true),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

const updateCategorySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    icon: Joi.string().max(10).optional(),
    is_active: Joi.boolean().optional(),
  }).min(1).required(),
  params: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

const forceCancelOrderSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().min(5).max(500).required(),
  }).required(),
  params: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

module.exports = {
  approveSellerSchema,
  rejectSellerSchema,
  suspendSchema,
  createCategorySchema,
  updateCategorySchema,
  forceCancelOrderSchema,
};
