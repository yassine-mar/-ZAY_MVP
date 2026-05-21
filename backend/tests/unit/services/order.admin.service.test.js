'use strict';

jest.mock('../../../src/models/order.model');
jest.mock('../../../src/services/order.service');

const OrderModel = require('../../../src/models/order.model');
const OrderService = require('../../../src/services/order.service');
const OrderAdminService = require('../../../src/services/admin/order.admin.service');

const ADMIN_ID = 'u-admin';

beforeEach(() => jest.clearAllMocks());

describe('OrderAdminService.listAll', () => {
  it('returns paginated orders with all filters supported', async () => {
    OrderModel.findAllForAdmin.mockResolvedValue([
      { id: 'o-1', status: 'pending' },
      { id: 'o-2', status: 'delivered' },
    ]);
    OrderModel.countAllForAdmin.mockResolvedValue(2);

    const result = await OrderAdminService.listAll({
      status: 'pending', seller_id: 'sp-1', page: 1, limit: 20,
    });

    expect(result.items).toHaveLength(2);
    expect(OrderModel.findAllForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', sellerId: 'sp-1' })
    );
  });

  it('passes auto_cancelled=true filter through', async () => {
    OrderModel.findAllForAdmin.mockResolvedValue([]);
    OrderModel.countAllForAdmin.mockResolvedValue(0);

    await OrderAdminService.listAll({ auto_cancelled: true });

    expect(OrderModel.findAllForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ autoCancelled: true })
    );
  });
});

describe('OrderAdminService.getOrderDetail', () => {
  it('returns order + history', async () => {
    OrderModel.findByIdWithItems.mockResolvedValue({ id: 'o-1', status: 'accepted' });
    OrderModel.getStatusHistory.mockResolvedValue([
      { id: 'h-1', from_status: null, to_status: 'pending' },
      { id: 'h-2', from_status: 'pending', to_status: 'accepted' },
    ]);

    const result = await OrderAdminService.getOrderDetail('o-1');

    expect(result.order.id).toBe('o-1');
    expect(result.history).toHaveLength(2);
  });

  it('throws 404 when order is missing', async () => {
    OrderModel.findByIdWithItems.mockResolvedValue(null);

    await expect(OrderAdminService.getOrderDetail('o-missing')).rejects.toMatchObject({
      statusCode: 404, code: 'NOT_FOUND',
    });
  });
});

describe('OrderAdminService.forceCancelOrder', () => {
  it('delegates to OrderService.forceCancelByAdmin', async () => {
    OrderService.forceCancelByAdmin.mockResolvedValue({ id: 'o-1', status: 'cancelled' });

    const result = await OrderAdminService.forceCancelOrder('o-1', ADMIN_ID, 'Seller went offline');

    expect(OrderService.forceCancelByAdmin).toHaveBeenCalledWith(
      'o-1',
      ADMIN_ID,
      'Seller went offline'
    );
    expect(result.status).toBe('cancelled');
  });
});
