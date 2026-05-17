'use strict';

const AppError = require('../utils/AppError');

const validate = (schema) => (req, _res, next) => {
  const { error, value } = schema.validate(
    { body: req.body, params: req.params, query: req.query },
    { abortEarly: false, stripUnknown: true }
  );

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.slice(1).join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details));
  }

  req.body = value.body || req.body;
  req.params = value.params || req.params;
  req.query = value.query || req.query;

  return next();
};

module.exports = validate;
