'use strict';

jest.mock('../../../src/models/user.model');
jest.mock('../../../src/models/base.model', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(async (cb) => cb({ query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }) })),
}));

const UserModel = require('../../../src/models/user.model');
const { query } = require('../../../src/models/base.model');
const UserAdminService = require('../../../src/services/admin/user.admin.service');

const ADMIN_ID = 'u-admin';

beforeEach(() => jest.clearAllMocks());

describe('UserAdminService.listAll', () => {
  it('returns paginated users with filters', async () => {
    UserModel.findAllForAdmin.mockResolvedValue([
      { id: 'u-1', role: 'customer', status: 'active' },
      { id: 'u-2', role: 'seller', status: 'active' },
    ]);
    UserModel.countAllForAdmin.mockResolvedValue(2);

    const result = await UserAdminService.listAll({ role: 'customer', page: 1, limit: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(UserModel.findAllForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'customer', limit: 20, offset: 0 })
    );
  });
});

describe('UserAdminService.getUserDetail', () => {
  it('returns the user with order summary', async () => {
    UserModel.findByIdForAdmin.mockResolvedValue({ id: 'u-1', email: 'x@y.com' });
    query.mockResolvedValue({
      rows: [{ total_orders: 5, total_spent: '450', cancelled_orders: 1 }],
    });

    const result = await UserAdminService.getUserDetail('u-1');

    expect(result.id).toBe('u-1');
    expect(result.order_summary.total_orders).toBe(5);
    expect(result.order_summary.total_spent).toBe(450);
  });

  it('returns zero order summary when orders table is missing', async () => {
    UserModel.findByIdForAdmin.mockResolvedValue({ id: 'u-1' });
    const err = new Error('no orders');
    err.code = '42P01';
    query.mockRejectedValue(err);

    const result = await UserAdminService.getUserDetail('u-1');

    expect(result.order_summary).toEqual({
      total_orders: 0, total_spent: 0, cancelled_orders: 0,
    });
  });

  it('throws 404 when user does not exist', async () => {
    UserModel.findByIdForAdmin.mockResolvedValue(null);

    await expect(UserAdminService.getUserDetail('u-missing')).rejects.toMatchObject({
      statusCode: 404, code: 'NOT_FOUND',
    });
  });
});

describe('UserAdminService.suspendUser', () => {
  it('suspends an active user with reason', async () => {
    UserModel.findByIdForAdmin.mockResolvedValue({ id: 'u-1', status: 'active' });
    UserModel.adminSuspend.mockResolvedValue({ id: 'u-1', status: 'suspended' });

    await UserAdminService.suspendUser('u-1', ADMIN_ID, 'Spam reports');

    expect(UserModel.adminSuspend).toHaveBeenCalledWith('u-1', {
      reason: 'Spam reports',
      suspendedBy: ADMIN_ID,
    });
  });

  it('prevents an admin from suspending themselves', async () => {
    await expect(
      UserAdminService.suspendUser(ADMIN_ID, ADMIN_ID, 'oops')
    ).rejects.toMatchObject({ statusCode: 400, code: 'CANNOT_SUSPEND_SELF' });
  });

  it('refuses to suspend an already-suspended user', async () => {
    UserModel.findByIdForAdmin.mockResolvedValue({ id: 'u-1', status: 'suspended' });

    await expect(
      UserAdminService.suspendUser('u-1', ADMIN_ID, 'reason')
    ).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_STATUS' });
  });
});
