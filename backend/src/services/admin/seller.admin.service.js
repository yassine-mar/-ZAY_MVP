'use strict';

const SellerModel = require('../../models/seller.model');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const NotificationService = require('../notification.service');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

/* ── Reads ─────────────────────────────────────────────────────────────── */

const listAll = async (queryParams = {}) => {
  const { page, limit, offset } = parsePaginationParams(queryParams);
  const filters = {
    status: queryParams.status,
    city: queryParams.city,
    limit,
    offset,
  };

  const [items, total] = await Promise.all([
    SellerModel.findAll(filters),
    SellerModel.countAll(filters),
  ]);

  return { items, pagination: buildPaginationMeta(page, limit, total) };
};

const getSellerDetail = async (sellerId) => {
  const seller = await SellerModel.findById(sellerId);
  if (!seller) throw new AppError(404, 'NOT_FOUND', 'Seller not found');
  return seller;
};

/* ── Approval workflow ─────────────────────────────────────────────────── */

const approveSeller = async (sellerId, adminUserId, _note = null) => {
  const existing = await SellerModel.findById(sellerId);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Seller not found');
  if (existing.status !== 'pending') {
    throw new AppError(
      422,
      'INVALID_STATUS',
      `Cannot approve a ${existing.status} seller — only pending sellers can be approved`
    );
  }

  const approved = await SellerModel.approve(sellerId, { approvedBy: adminUserId });
  if (!approved) throw new AppError(404, 'NOT_FOUND', 'Seller not found');

  NotificationService.notifySellerApproved({ userId: existing.user_id })
    .catch((err) => logger.warn('Seller-approved notification failed', {
      sellerId, error: err.message,
    }));

  logger.info('Seller approved', { sellerId, by: adminUserId });
  return approved;
};

const rejectSeller = async (sellerId, adminUserId, reason) => {
  const existing = await SellerModel.findById(sellerId);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Seller not found');
  if (existing.status !== 'pending') {
    throw new AppError(
      422,
      'INVALID_STATUS',
      `Cannot reject a ${existing.status} seller — only pending sellers can be rejected`
    );
  }

  const rejected = await SellerModel.reject(sellerId, { reason, rejectedBy: adminUserId });
  if (!rejected) throw new AppError(404, 'NOT_FOUND', 'Seller not found');

  NotificationService.notifySellerRejected({
    userId: existing.user_id,
    reason,
  }).catch((err) => logger.warn('Seller-rejected notification failed', {
    sellerId, error: err.message,
  }));

  logger.info('Seller rejected', { sellerId, by: adminUserId });
  return rejected;
};

const suspendSeller = async (sellerId, adminUserId, reason) => {
  const existing = await SellerModel.findById(sellerId);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Seller not found');
  if (existing.status !== 'approved') {
    throw new AppError(
      422,
      'INVALID_STATUS',
      `Cannot suspend a ${existing.status} seller — only approved sellers can be suspended`
    );
  }

  const suspended = await SellerModel.suspend(sellerId, { reason, suspendedBy: adminUserId });
  if (!suspended) throw new AppError(404, 'NOT_FOUND', 'Seller not found');

  NotificationService.notifySellerSuspended({
    userId: existing.user_id,
    reason,
  }).catch((err) => logger.warn('Seller-suspended notification failed', {
    sellerId, error: err.message,
  }));

  logger.info('Seller suspended', { sellerId, by: adminUserId });
  return suspended;
};

module.exports = {
  listAll,
  getSellerDetail,
  approveSeller,
  rejectSeller,
  suspendSeller,
};
