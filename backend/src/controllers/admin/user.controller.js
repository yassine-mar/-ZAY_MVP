'use strict';

const AdminUserService = require('../../services/admin/user.admin.service');
const { sendSuccess, sendPaginated } = require('../../utils/response');

const getUsers = async (req, res) => {
  const { items, pagination } = await AdminUserService.getUsers(req.query);
  sendPaginated(res, 'Users fetched', items, pagination);
};

const getUserDetail = async (req, res) => {
  const user = await AdminUserService.getUserDetail(req.params.id);
  sendSuccess(res, 200, 'User fetched', { user });
};

const suspendUser = async (req, res) => {
  const user = await AdminUserService.suspendUser(req.params.id, req.body.reason);
  sendSuccess(res, 200, 'User suspended', { user });
};

module.exports = { getUsers, getUserDetail, suspendUser };
