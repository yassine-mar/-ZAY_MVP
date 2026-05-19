'use strict';

jest.mock('../../../src/models/userAddress.model');
jest.mock('../../../src/models/base.model', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(async (cb) => cb({
    query: jest.fn().mockResolvedValue({ rows: [{ id: 'rem-1' }], rowCount: 1 }),
  })),
}));

const UserAddressModel = require('../../../src/models/userAddress.model');
const AddressService = require('../../../src/services/userAddress.service');

beforeEach(() => jest.clearAllMocks());

describe('AddressService.list', () => {
  it('returns addresses for the user', async () => {
    UserAddressModel.findByUserId.mockResolvedValue([{ id: 'a1', label: 'Home' }]);

    const result = await AddressService.list('u1');

    expect(result).toHaveLength(1);
    expect(UserAddressModel.findByUserId).toHaveBeenCalledWith('u1');
  });
});

describe('AddressService.create', () => {
  it('forces is_default=true on first address', async () => {
    UserAddressModel.countByUserId.mockResolvedValue(0);
    UserAddressModel.create.mockResolvedValue({ id: 'a1', is_default: true });

    await AddressService.create('u1', {
      label: 'Home',
      street: '12 Rue Hassan II',
      city: 'Casablanca',
      is_default: false, // user said false, but it's the first → force true
    });

    expect(UserAddressModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: true }),
      expect.any(Object)
    );
  });

  it('respects is_default=false on subsequent addresses', async () => {
    UserAddressModel.countByUserId.mockResolvedValue(2);
    UserAddressModel.create.mockResolvedValue({ id: 'a3', is_default: false });

    await AddressService.create('u1', {
      label: 'Cousin',
      street: '5 Rue X',
      city: 'Rabat',
      is_default: false,
    });

    expect(UserAddressModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: false }),
      expect.any(Object)
    );
  });

  it('rejects when address limit reached', async () => {
    UserAddressModel.countByUserId.mockResolvedValue(10);

    await expect(
      AddressService.create('u1', { label: 'X', street: '5 Rue X', city: 'Rabat' })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'ADDRESS_LIMIT_REACHED',
    });

    expect(UserAddressModel.create).not.toHaveBeenCalled();
  });
});

describe('AddressService.get', () => {
  it('returns address when caller owns it', async () => {
    UserAddressModel.findById.mockResolvedValue({ id: 'a1', user_id: 'u1' });

    const result = await AddressService.get('u1', 'a1');

    expect(result.id).toBe('a1');
  });

  it('returns 404 when address belongs to another user (no enumeration)', async () => {
    UserAddressModel.findById.mockResolvedValue({ id: 'a1', user_id: 'u2' });

    await expect(AddressService.get('u1', 'a1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns 404 when address does not exist', async () => {
    UserAddressModel.findById.mockResolvedValue(null);

    await expect(AddressService.get('u1', 'a1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('AddressService.update', () => {
  it('updates when caller owns the address', async () => {
    UserAddressModel.findById.mockResolvedValue({ id: 'a1', user_id: 'u1' });
    UserAddressModel.update.mockResolvedValue({ id: 'a1', label: 'New Label' });

    const result = await AddressService.update('u1', 'a1', { label: 'New Label' });

    expect(result.label).toBe('New Label');
  });

  it('rejects update by non-owner', async () => {
    UserAddressModel.findById.mockResolvedValue({ id: 'a1', user_id: 'someone-else' });

    await expect(
      AddressService.update('u1', 'a1', { label: 'X' })
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

describe('AddressService.remove', () => {
  it('deletes when owner', async () => {
    UserAddressModel.findById.mockResolvedValue({ id: 'a1', user_id: 'u1', is_default: false });
    UserAddressModel.remove.mockResolvedValue(true);

    const result = await AddressService.remove('u1', 'a1');

    expect(UserAddressModel.remove).toHaveBeenCalledWith('a1');
    expect(result.deleted).toBe(true);
    expect(result.newDefaultId).toBeNull();
  });

  it('promotes the next address to default when default is deleted', async () => {
    UserAddressModel.findById.mockResolvedValue({ id: 'a1', user_id: 'u1', is_default: true });
    UserAddressModel.remove.mockResolvedValue(true);

    const result = await AddressService.remove('u1', 'a1');

    expect(result.deleted).toBe(true);
    expect(result.newDefaultId).toBe('rem-1');
  });

  it('rejects delete by non-owner', async () => {
    UserAddressModel.findById.mockResolvedValue({ id: 'a1', user_id: 'other' });

    await expect(AddressService.remove('u1', 'a1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('AddressService.setDefault', () => {
  it('sets the address as default when owner', async () => {
    UserAddressModel.findById.mockResolvedValue({ id: 'a1', user_id: 'u1' });
    UserAddressModel.setDefault.mockResolvedValue({ id: 'a1', is_default: true });

    const result = await AddressService.setDefault('u1', 'a1');

    expect(result.is_default).toBe(true);
    expect(UserAddressModel.setDefault).toHaveBeenCalledWith('a1', 'u1');
  });

  it('rejects setDefault by non-owner', async () => {
    UserAddressModel.findById.mockResolvedValue({ id: 'a1', user_id: 'other' });

    await expect(AddressService.setDefault('u1', 'a1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});
