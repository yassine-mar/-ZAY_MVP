'use strict';

const AppError = require('../utils/AppError');

const requireApprovedSeller = (req, _res, next) => {
  if (!req.user || req.user.role !== 'seller') {
    return next(new AppError(403, 'FORBIDDEN', 'Seller access required'));
  }
  if (!req.user.sellerProfile || req.user.sellerProfile.status !== 'approved') {
    return next(
      new AppError(
        403,
        'SELLER_NOT_APPROVED',
        'Your seller account is pending approval. You will be notified once your account is reviewed.'
      )
    );
  }
  return next();
};

module.exports = requireApprovedSeller;
