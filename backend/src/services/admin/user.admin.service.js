'use strict';

const UserModel = require('../../models/user.model');
const AppError = require('../../utils/AppError');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

/** @returns {Promise<{ items, pagination }>} */
const getUsers = async (query) => {
  // TODO: paginated user list with optional role/status filters
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} */
const getUserDetail = async (userId) => {
  // TODO: UserModel.findById → throw 404 if not found, include order summary
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} suspended user */
const suspendUser = async (userId, reason) => {
  // TODO: UserModel.update(userId, { status: 'suspended' })
  throw new Error('Not implemented');
};

module.exports = { getUsers, getUserDetail, suspendUser };
