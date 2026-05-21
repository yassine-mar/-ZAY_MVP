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
    slug: slugPattern.optional(),
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

/* ── Users ───────────────────────────────────────────────────────────── */

const adminUsersQuerySchema = Joi.object({
  body: Joi.object(),
  params: Joi.object(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    role: Joi.string().valid('customer', 'seller', 'admin').optional(),
    status: Joi.string().valid('active', 'suspended').optional(),
    search: Joi.string().trim().min(1).max(100).optional(),
  }),
});

/* ── Sellers (admin list) ────────────────────────────────────────────── */

const adminSellersQuerySchema = Joi.object({
  body: Joi.object(),
  params: Joi.object(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'suspended').optional(),
    city: Joi.string().trim().max(100).optional(),
  }),
});

/* ── Orders (admin) ──────────────────────────────────────────────────── */

const adminOrdersQuerySchema = Joi.object({
  body: Joi.object(),
  params: Joi.object(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string()
      .valid('pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled')
      .optional(),
    seller_id: Joi.string().uuid({ version: 'uuidv4' }).optional(),
    customer_id: Joi.string().uuid({ version: 'uuidv4' }).optional(),
    from_date: Joi.date().iso().optional(),
    to_date: Joi.date().iso().optional(),
    auto_cancelled: Joi.boolean().optional(),
  }),
});

const forceCancelOrderSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().trim().min(5).max(500).required(),
  }).required(),
  params: Joi.object({ id: uuidParam }),
  query: Joi.object(),
});

const adminOrderIdParamSchema = Joi.object({
  body: Joi.object(),
  params: Joi.object({ id: uuidParam }),
  query: Joi.object(),
});

/* ── Analytics ───────────────────────────────────────────────────────── */

const analyticsOrdersQuerySchema = Joi.object({
  body: Joi.object(),
  params: Joi.object(),
  query: Joi.object({
    days: Joi.number().integer().min(1).max(365).default(30),
  }),
});

const analyticsSellersQuerySchema = Joi.object({
  body: Joi.object(),
  params: Joi.object(),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
});

module.exports = {
  approveSellerSchema,
  rejectSellerSchema,
  suspendSchema,
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  adminUsersQuerySchema,
  adminSellersQuerySchema,
  adminOrdersQuerySchema,
  adminOrderIdParamSchema,
  forceCancelOrderSchema,
  analyticsOrdersQuerySchema,
  analyticsSellersQuerySchema,
};
