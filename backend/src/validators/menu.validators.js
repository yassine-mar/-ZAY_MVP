'use strict';

const Joi = require('joi');

const createMenuSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    description: Joi.string().max(500).optional().allow(''),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

const updateMenuSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(150).optional(),
    description: Joi.string().max(500).optional().allow(''),
  }).min(1).required(),
  params: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  }),
  query: Joi.object(),
});

module.exports = { createMenuSchema, updateMenuSchema };
