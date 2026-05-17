'use strict';

const Joi = require('joi');

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().integer().min(1).max(65535).default(5000),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  ADMIN_JWT_SECRET: Joi.string().min(32).required(),
  ADMIN_JWT_EXPIRES_IN: Joi.string().default('8h'),

  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'debug')
    .default('info'),
})
  .unknown(true)
  .required();

const { error, value: env } = envSchema.validate(process.env);

if (error) {
  throw new Error(`\nMISSING ENV VAR: ${error.message}\n`);
}

module.exports = {
  NODE_ENV: env.NODE_ENV,
  PORT: env.PORT,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  isDevelopment: env.NODE_ENV === 'development',

  DATABASE_URL: env.DATABASE_URL,

  JWT_SECRET: env.JWT_SECRET,
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
  ADMIN_JWT_SECRET: env.ADMIN_JWT_SECRET,
  ADMIN_JWT_EXPIRES_IN: env.ADMIN_JWT_EXPIRES_IN,

  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
  },

  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  },

  corsOptions: {
    origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  LOG_LEVEL: env.LOG_LEVEL,
};
