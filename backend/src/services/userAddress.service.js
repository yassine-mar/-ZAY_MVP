'use strict';

const AppError = require('../utils/AppError');
const UserAddressModel = require('../models/userAddress.model');
const { withTransaction } = require('../models/base.model');

const MAX_ADDRESSES_PER_USER = 10;

const assertOwnership = (address, userId) => {
  if (!address || address.user_id !== userId) {
    // Return 404 (not 403) — don't reveal that the address exists for another user.
    throw new AppError(404, 'NOT_FOUND', 'Address not found');
  }
};

const list = async (userId) => UserAddressModel.findByUserId(userId);

/**
 * Create a saved address. If it's the user's first address, force is_default = true.
 * If is_default is requested, atomically clear the previous default.
 */
const create = async (userId, input) => {
  const existing = await UserAddressModel.countByUserId(userId);
  if (existing >= MAX_ADDRESSES_PER_USER) {
    throw new AppError(
      409,
      'ADDRESS_LIMIT_REACHED',
      `You can save at most ${MAX_ADDRESSES_PER_USER} addresses. Delete one to add a new one.`
    );
  }

  const wantDefault = Boolean(input.is_default) || existing === 0;

  return withTransaction(async (client) => {
    if (wantDefault) {
      await client.query(
        `UPDATE user_addresses
         SET is_default = FALSE
         WHERE user_id = $1 AND is_default = TRUE`,
        [userId]
      );
    }
    return UserAddressModel.create(
      {
        userId,
        label: input.label,
        street: input.street,
        district: input.district,
        city: input.city,
        landmark: input.landmark,
        notes: input.notes,
        isDefault: wantDefault,
      },
      client
    );
  });
};

const get = async (userId, addressId) => {
  const address = await UserAddressModel.findById(addressId);
  assertOwnership(address, userId);
  return address;
};

const update = async (userId, addressId, fields) => {
  const address = await UserAddressModel.findById(addressId);
  assertOwnership(address, userId);

  const updated = await UserAddressModel.update(addressId, fields);
  return updated;
};

const remove = async (userId, addressId) => {
  const address = await UserAddressModel.findById(addressId);
  assertOwnership(address, userId);
  await UserAddressModel.remove(addressId);

  // If we just deleted the default, promote the most-recent remaining address to default.
  if (address.is_default) {
    const result = await withTransaction(async (client) => {
      const remaining = await client.query(
        `SELECT id FROM user_addresses
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );
      if (remaining.rows.length === 0) return null;
      const newDefaultId = remaining.rows[0].id;
      await client.query(
        'UPDATE user_addresses SET is_default = TRUE WHERE id = $1',
        [newDefaultId]
      );
      return newDefaultId;
    });
    return { deleted: true, newDefaultId: result };
  }

  return { deleted: true, newDefaultId: null };
};

const setDefault = async (userId, addressId) => {
  const address = await UserAddressModel.findById(addressId);
  assertOwnership(address, userId);

  const updated = await UserAddressModel.setDefault(addressId, userId);
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Address not found');
  }
  return updated;
};

module.exports = {
  list,
  create,
  get,
  update,
  remove,
  setDefault,
  MAX_ADDRESSES_PER_USER,
};
