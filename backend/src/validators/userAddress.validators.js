'use strict';

const Joi = require('joi');

const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Agadir', 'Tanger', 'Meknes', 'Oujda'];

const uuidParam = Joi.string().uuid({ version: 'uuidv4' }).required();

const createAddressSchema = Joi.object({
  body: Joi.object({
    label: Joi.string().trim().min(1).max(50).required(),
    street: Joi.string().trim().min(5).max(255).required(),
    district: Joi.string().trim().max(100).optional().allow(''),
    city: Joi.string().valid(...CITIES).required(),
    landmark: Joi.string().trim().max(255).optional().allow(''),
    notes: Joi.string().trim().max(500).optional().allow(''),
    is_default: Joi.boolean().optional().default(false),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

const updateAddressSchema = Joi.object({
  body: Joi.object({
    label: Joi.string().trim().min(1).max(50).optional(),
    street: Joi.string().trim().min(5).max(255).optional(),
    district: Joi.string().trim().max(100).optional().allow(''),
    city: Joi.string().valid(...CITIES).optional(),
    landmark: Joi.string().trim().max(255).optional().allow(''),
    notes: Joi.string().trim().max(500).optional().allow(''),
  }).min(1).required(),
  params: Joi.object({ id: uuidParam }),
  query: Joi.object(),
});

const addressIdParamSchema = Joi.object({
  body: Joi.object(),
  params: Joi.object({ id: uuidParam }),
  query: Joi.object(),
});

module.exports = {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
};
