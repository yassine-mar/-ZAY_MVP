'use strict';

const CartService = require('../services/cart.service');
const { sendOk } = require('../utils/response');
const {
  serializeCartSeller,
  serializeValidatedItem,
} = require('../utils/serializers/cart.serializer');

/**
 * POST /api/v1/cart/validate
 *
 * Always returns 200 with a structured report — even when the cart is invalid.
 * Reserving non-200 status codes for actual HTTP/auth errors keeps the
 * mobile client's response handling simple: parse body, then act on
 * `valid`, `blockers`, `warnings`.
 */
const validateCart = async (req, res) => {
  const report = await CartService.validate(req.user, req.body);

  sendOk(res, 'Cart validated', {
    valid: report.valid,
    seller_id: report.seller_id,
    seller: serializeCartSeller(report.seller),
    items: report.items.map(serializeValidatedItem),
    total_amount: report.total_amount,
    issue_count: report.issue_count,
    blockers: report.blockers,
    warnings: report.warnings,
  });
};

module.exports = { validateCart };
