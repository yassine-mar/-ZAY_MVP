'use strict';

const Joi = require('joi');

const MOROCCAN_PHONE = /^\+212[5-7]\d{8}$/;

const passwordRules = Joi.string()
  .min(8)
  .max(72)
  .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/)
  .messages({
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one number, and one special character',
    'string.max': 'Password must be 72 characters or fewer',
  });

const updateProfileSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    phone: Joi.string().pattern(MOROCCAN_PHONE).optional().messages({
      'string.pattern.base': 'Must be a valid Moroccan phone number (+212XXXXXXXXX)',
    }),
  })
    .min(1)
    .required()
    .messages({
      'object.min': 'At least one field must be provided',
    }),
  params: Joi.object(),
  query: Joi.object(),
});

const updateFcmTokenSchema = Joi.object({
  body: Joi.object({
    fcm_token: Joi.string().trim().min(8).max(500).required(),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

const changePasswordSchema = Joi.object({
  body: Joi.object({
    current_password: Joi.string().min(1).max(128).required(),
    new_password: passwordRules.required(),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

module.exports = {
  updateProfileSchema,
  updateFcmTokenSchema,
  changePasswordSchema,
};
