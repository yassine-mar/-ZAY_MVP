'use strict';

const Joi = require('joi');

const MOROCCAN_PHONE = /^\+212[5-7]\d{8}$/;
const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Agadir', 'Tanger', 'Meknes', 'Oujda'];

const passwordRules = Joi.string()
  .min(8)
  .max(72)
  .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/)
  .required()
  .messages({
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one number, and one special character',
  });

const registerSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().lowercase().max(255).required(),
    phone: Joi.string().pattern(MOROCCAN_PHONE).required().messages({
      'string.pattern.base': 'Must be a valid Moroccan phone number (+212XXXXXXXXX)',
    }),
    password: passwordRules,
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

const registerSellerSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().lowercase().max(255).required(),
    phone: Joi.string().pattern(MOROCCAN_PHONE).required().messages({
      'string.pattern.base': 'Must be a valid Moroccan phone number (+212XXXXXXXXX)',
    }),
    password: passwordRules,
    business_name: Joi.string().min(2).max(150).required(),
    bio: Joi.string().max(500).optional().allow(''),
    address: Joi.string().min(5).max(255).required(),
    city: Joi.string().valid(...CITIES).required(),
    delivery_radius_km: Joi.number().integer().min(1).max(50).default(5),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
  }).required(),
  params: Joi.object(),
  query: Joi.object(),
});

module.exports = { registerSchema, registerSellerSchema, loginSchema };
