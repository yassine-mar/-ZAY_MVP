'use strict';

const Joi = require('joi');

const MOROCCAN_PHONE = /^\+212[5-7]\d{8}$/;

const updateProfileSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    phone: Joi.string().pattern(MOROCCAN_PHONE).optional().messages({
      'string.pattern.base': 'Must be a valid Moroccan phone number (+212XXXXXXXXX)',
    }),
  }).min(1).required(),
  params: Joi.object(),
  query: Joi.object(),
});

const updateFcmTokenSchema = Joi.object({
  body: Joi.object({
    fcm_token: Joi.string().max(500).required(),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

module.exports = { updateProfileSchema, updateFcmTokenSchema };
