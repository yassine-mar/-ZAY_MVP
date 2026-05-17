'use strict';

const AppError = require('../utils/AppError');

const requireRole = (...roles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
    }
    return next();
  };

module.exports = requireRole;
