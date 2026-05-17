'use strict';

const Joi = require('joi');

const ORDER_STATUSES = ['accepted', 'preparing', 'ready', 'delivered', 'cancelled'];

const deliveryAddressSchema = Joi.object({
  street: Joi.string().max(255).required(),
  district: Joi.string().max(100).optional().allow(''),
  city: Joi.string().max(100).required(),
  landmark: Joi.string().max(255).optional().allow(''),
  notes: Joi.string().max(255).optional().allow(''),
});

const createOrderSchema = Joi.object({
  body: Joi.object({
    seller_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
    items: Joi.array()
      .items(
        Joi.object({
          menu_item_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
          quantity: Joi.number().integer().min(1).max(10).required(),
        })
      )
      .min(1)
      .max(20)
      .required(),
    delivery_address: deliveryAddressSchema.required(),
    customer_notes: Joi.string().max(500).optional().allow(''),
    payment_method: Joi.string().valid('cash').required(),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

const updateOrderStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().valid(...ORDER_STATUSES).required(),
    estimated_ready_at: Joi.date().iso().greater('now').optional(),
    note: Joi.string().max(255).optional().allow(''),
  }).required(),
  params: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

const cancelOrderSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().max(255).optional().allow(''),
  }),
  params: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

const listOrdersSchema = Joi.object({
  body: Joi.object(),
  params: Joi.object(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid('pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled').optional(),
    from_date: Joi.date().iso().optional(),
    to_date: Joi.date().iso().optional(),
  }),
});

module.exports = { createOrderSchema, updateOrderStatusSchema, cancelOrderSchema, listOrdersSchema };
