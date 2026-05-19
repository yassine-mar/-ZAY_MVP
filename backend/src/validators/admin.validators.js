'use strict';

const Joi = require('joi');

const uuidParam = Joi.string().uuid({ version: 'uuidv4' }).required();

/* ── Sellers ─────────────────────────────────────────────────────────── */

const approveSellerSchema = Joi.object({
  body: Joi.object({
    note: Joi.string().max(500).optional().allow(''),
  }),
  params: Joi.object({ id: uuidParam }),
  query: Joi.object(),
});

const rejectSellerSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().trim().min(10).max(500).required(),
  }).required(),
  params: Joi.object({ id: uuidParam }),
  query: Joi.object(),
});

const suspendSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().trim().min(5).max(500).required(),
  }).required(),
  params: Joi.object({ id: uuidParam }),
  query: Joi.object(),
});

/* ── Categories ──────────────────────────────────────────────────────── */

const slugPattern = Joi.string()
  .lowercase()
  .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .min(2)
  .max(100)
  .messages({
    'string.pattern.base': 'Slug must be lowercase letters, numbers, and single hyphens only',
  });

const createCategorySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    slug: slugPattern.optional(), // auto-generated from name if absent
    icon: Joi.string().trim().min(1).max(10).optional().allow(''),
    sort_order: Joi.number().integer().min(0).max(9999).optional().default(0),
    is_active: Joi.boolean().optional().default(true),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

const updateCategorySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    slug: slugPattern.optional(),
    icon: Joi.string().trim().min(1).max(10).optional().allow('', null),
    sort_order: Joi.number().integer().min(0).max(9999).optional(),
    is_active: Joi.boolean().optional(),
  })
    .min(1)
    .required()
    .messages({ 'object.min': 'At least one field must be provided' }),
  params: Joi.object({ id: uuidParam }),
  query: Joi.object(),
});

const categoryIdParamSchema = Joi.object({
  body: Joi.object(),
  params: Joi.object({ id: uuidParam }),
  query: Joi.object(),
});

/* ── Orders (admin) ──────────────────────────────────────────────────── */

const forceCancelOrderSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().trim().min(5).max(500).required(),
  }).required(),
  params: Joi.object({ id: uuidParam }),
  query: Joi.object(),
});

module.exports = {
  approveSellerSchema,
  rejectSellerSchema,
  suspendSchema,
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  forceCancelOrderSchema,
};
