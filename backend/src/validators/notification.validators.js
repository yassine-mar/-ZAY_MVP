'use strict';

const Joi = require('joi');

const listNotificationsSchema = Joi.object({
  body: Joi.object(),
  params: Joi.object(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),
});

module.exports = { listNotificationsSchema };
