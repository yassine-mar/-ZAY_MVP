'use strict';

const UserAdminService = require('../../services/admin/user.admin.service');
const { sendOk, sendPaginated } = require('../../utils/response');
const { serializeUserAdmin } = require('../../utils/serializers/user.serializer');

const getUsers = async (req, res) => {
  const { items, pagination } = await UserAdminService.listAll(req.query);
  sendPaginated(res, 'Users fetched', items.map(serializeUserAdmin), pagination);
};

const getUserDetail = async (req, res) => {
  const user = await UserAdminService.getUserDetail(req.params.id);
  const serialized = serializeUserAdmin(user);
  serialized.order_summary = user.order_summary;
  sendOk(res, 'User fetched', { user: serialized });
};

const suspendUser = async (req, res) => {
  const user = await UserAdminService.suspendUser(
    req.params.id,
    req.adminId,
    req.body.reason
  );
  sendOk(res, 'User suspended', { user: serializeUserAdmin(user) });
};

module.exports = { getUsers, getUserDetail, suspendUser };
