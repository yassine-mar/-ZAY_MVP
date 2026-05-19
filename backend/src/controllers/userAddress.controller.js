'use strict';

const UserAddressService = require('../services/userAddress.service');
const { sendOk, sendCreated } = require('../utils/response');
const { serializeAddress } = require('../utils/serializers/userAddress.serializer');

const list = async (req, res) => {
  const addresses = await UserAddressService.list(req.user.id);
  sendOk(res, 'Addresses fetched', { addresses: addresses.map(serializeAddress) });
};

const create = async (req, res) => {
  const address = await UserAddressService.create(req.user.id, req.body);
  sendCreated(res, 'Address saved', { address: serializeAddress(address) });
};

const get = async (req, res) => {
  const address = await UserAddressService.get(req.user.id, req.params.id);
  sendOk(res, 'Address fetched', { address: serializeAddress(address) });
};

const update = async (req, res) => {
  const address = await UserAddressService.update(req.user.id, req.params.id, req.body);
  sendOk(res, 'Address updated', { address: serializeAddress(address) });
};

const remove = async (req, res) => {
  const result = await UserAddressService.remove(req.user.id, req.params.id);
  sendOk(res, 'Address deleted', result);
};

const setDefault = async (req, res) => {
  const address = await UserAddressService.setDefault(req.user.id, req.params.id);
  sendOk(res, 'Default address updated', { address: serializeAddress(address) });
};

module.exports = { list, create, get, update, remove, setDefault };
