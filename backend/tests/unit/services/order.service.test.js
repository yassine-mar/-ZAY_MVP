'use strict';

jest.mock('../../../src/models/order.model');
jest.mock('../../../src/models/item.model');
jest.mock('../../../src/models/seller.model');
jest.mock('../../../src/services/notification.service');
jest.mock('../../../src/config/socket', () => ({
  getIO: jest.fn(() => ({ to: () => ({ emit: jest.fn() }) })),
}));
jest.mock('../../../src/models/base.model', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(async (cb) => cb({ query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }) })),
}));

const OrderModel = require('../../../src/models/order.model');
const ItemModel = require('../../../src/models/item.model');
const SellerModel = require('../../../src/models/seller.model');
const NotificationService = require('../../../src/services/notification.service');
const OrderService = require('../../../src/services/order.service');

const customer = { id: 'u-cust', role: 'customer' };
const sellerUser = (sellerId = 'sp-1') => ({
  id: 'u-seller',
  role: 'seller',
  sellerProfile: { id: sellerId, status: 'approved' },
});

const validOrderInput = {
  seller_id: 'sp-1',
  items: [
    { menu_item_id: 'i-1', quantity: 2 },
    { menu_item_id: 'i-2', quantity: 1 },
  ],
  delivery_address: { street: '12 Rue X', city: 'Casablanca' },
  customer_notes: 'No spicy please',
  payment_method: 'cash',
};

const openSeller = (id = 'sp-1') => ({
  id, user_id: 'u-seller', status: 'approved', is_open: true,
});

beforeEach(() => {
  jest.clearAllMocks();
  NotificationService.notifyOrderPlaced.mockResolvedValue();
  NotificationService.notifyOrderStatusChanged.mockResolvedValue();
  NotificationService.notifyOrderAutoCancelled.mockResolvedValue();
});

describe('OrderService.createOrder — happy path', () => {
  it('creates an order with server-computed total', async () => {
    SellerModel.findById.mockResolvedValue(openSeller());
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i-1', name: 'Tagine', price: 65, image_url: null, seller_id: 'sp-1' },
      { id: 'i-2', name: 'Harira', price: 25, image_url: null, seller_id: 'sp-1' },
    ]);
    OrderModel.findByIdempotencyKey.mockResolvedValue(null);
    OrderModel.create.mockResolvedValue({ id: 'o-1', status: 'pending', total_amount: 155 });
    OrderModel.createItem.mockResolvedValue({});
    OrderModel.insertStatusHistory.mockResolvedValue({});
    OrderModel.findByIdWithItems.mockResolvedValue({
      id: 'o-1', status: 'pending', total_amount: 155, seller_id: 'sp-1', items: [],
    });

    const result = await OrderService.createOrder(customer, validOrderInput);

    expect(OrderModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'u-cust',
        sellerId: 'sp-1',
        totalAmount: 155,
        paymentMethod: 'cash',
      }),
      expect.any(Object)
    );
    expect(result.id).toBe('o-1');
    expect(NotificationService.notifyOrderPlaced).toHaveBeenCalled();
  });

  it('ignores any client-provided total — recomputes server-side', async () => {
    SellerModel.findById.mockResolvedValue(openSeller());
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i-1', name: 'Tagine', price: 65, seller_id: 'sp-1' },
    ]);
    OrderModel.findByIdempotencyKey.mockResolvedValue(null);
    OrderModel.create.mockResolvedValue({ id: 'o-1' });
    OrderModel.createItem.mockResolvedValue({});
    OrderModel.insertStatusHistory.mockResolvedValue({});
    OrderModel.findByIdWithItems.mockResolvedValue({ id: 'o-1', items: [] });

    await OrderService.createOrder(customer, {
      ...validOrderInput,
      items: [{ menu_item_id: 'i-1', quantity: 1 }],
      total_amount: 0.01,
    });

    expect(OrderModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 65 }),
      expect.any(Object)
    );
  });
});

describe('OrderService.createOrder — idempotency', () => {
  it('returns existing order on idempotency key replay', async () => {
    const existing = { id: 'o-existing', status: 'accepted' };
    OrderModel.findByIdempotencyKey.mockResolvedValue(existing);
    OrderModel.findByIdWithItems.mockResolvedValue({ id: 'o-existing', items: [] });

    const result = await OrderService.createOrder(
      customer,
      validOrderInput,
      { idempotencyKey: 'key-abc' }
    );

    expect(result.id).toBe('o-existing');
    expect(OrderModel.create).not.toHaveBeenCalled();
    expect(SellerModel.findById).not.toHaveBeenCalled();
    expect(NotificationService.notifyOrderPlaced).not.toHaveBeenCalled();
  });
});

describe('OrderService.createOrder — validation', () => {
  it('rejects when seller is closed', async () => {
    SellerModel.findById.mockResolvedValue({ ...openSeller(), is_open: false });

    await expect(OrderService.createOrder(customer, validOrderInput)).rejects.toMatchObject({
      statusCode: 422,
      code: 'SELLER_CLOSED',
    });
  });

  it('rejects when seller is suspended (treated as not found)', async () => {
    SellerModel.findById.mockResolvedValue({ ...openSeller(), status: 'suspended' });

    await expect(OrderService.createOrder(customer, validOrderInput)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('rejects with UNPROCESSABLE listing unavailable items', async () => {
    SellerModel.findById.mockResolvedValue(openSeller());
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i-1', name: 'Tagine', price: 65, seller_id: 'sp-1' },
    ]);

    await expect(OrderService.createOrder(customer, validOrderInput)).rejects.toMatchObject({
      statusCode: 422,
      code: 'UNPROCESSABLE',
      details: expect.arrayContaining([
        expect.objectContaining({ menu_item_id: 'i-2' }),
      ]),
    });
  });

  it('rejects cross-seller items', async () => {
    SellerModel.findById.mockResolvedValue(openSeller('sp-1'));
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i-1', name: 'A', price: 50, seller_id: 'sp-1' },
      { id: 'i-2', name: 'B', price: 50, seller_id: 'sp-OTHER' },
    ]);

    await expect(OrderService.createOrder(customer, validOrderInput)).rejects.toMatchObject({
      statusCode: 422,
      code: 'CROSS_SELLER_ORDER',
    });
  });
});

describe('OrderService.updateOrderStatus — state machine', () => {
  it('transitions pending → accepted with estimated_ready_at', async () => {
    OrderModel.findById.mockResolvedValue({
      id: 'o-1', status: 'pending', seller_id: 'sp-1', customer_id: 'u-cust',
    });
    OrderModel.updateStatus.mockResolvedValue({});
    OrderModel.insertStatusHistory.mockResolvedValue({});
    OrderModel.findByIdWithItems.mockResolvedValue({ id: 'o-1', status: 'accepted' });

    const eta = new Date(Date.now() + 60 * 60_000).toISOString();
    await OrderService.updateOrderStatus('o-1', sellerUser(), {
      status: 'accepted',
      estimated_ready_at: eta,
    });

    expect(OrderModel.updateStatus).toHaveBeenCalledWith(
      'o-1',
      expect.objectContaining({ status: 'accepted', estimatedReadyAt: expect.any(Date) }),
      expect.any(Object)
    );
    expect(NotificationService.notifyOrderStatusChanged).toHaveBeenCalled();
  });

  it('rejects invalid transition (delivered → accepted)', async () => {
    OrderModel.findById.mockResolvedValue({
      id: 'o-1', status: 'delivered', seller_id: 'sp-1',
    });

    await expect(
      OrderService.updateOrderStatus('o-1', sellerUser(), { status: 'accepted' })
    ).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_TRANSITION' });

    expect(OrderModel.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects status update by non-owner seller', async () => {
    OrderModel.findById.mockResolvedValue({
      id: 'o-1', status: 'pending', seller_id: 'sp-OTHER',
    });

    await expect(
      OrderService.updateOrderStatus('o-1', sellerUser('sp-1'), { status: 'accepted' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('OrderService.cancelOrderByCustomer', () => {
  it('allows cancellation when order is pending', async () => {
    OrderModel.findById.mockResolvedValue({
      id: 'o-1', status: 'pending', customer_id: 'u-cust', seller_id: 'sp-1',
    });
    SellerModel.findById.mockResolvedValue({ id: 'sp-1', user_id: 'u-seller' });
    OrderModel.updateStatus.mockResolvedValue({});
    OrderModel.insertStatusHistory.mockResolvedValue({});
    OrderModel.findByIdWithItems.mockResolvedValue({ id: 'o-1', status: 'cancelled' });

    await OrderService.cancelOrderByCustomer('o-1', customer);

    expect(OrderModel.updateStatus).toHaveBeenCalledWith(
      'o-1',
      expect.objectContaining({ status: 'cancelled' }),
      expect.any(Object)
    );
  });

  it('rejects cancel of already-accepted order', async () => {
    OrderModel.findById.mockResolvedValue({
      id: 'o-1', status: 'accepted', customer_id: 'u-cust',
    });

    await expect(OrderService.cancelOrderByCustomer('o-1', customer)).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_TRANSITION',
    });
  });

  it('rejects cancel by non-owner customer', async () => {
    OrderModel.findById.mockResolvedValue({
      id: 'o-1', status: 'pending', customer_id: 'OTHER',
    });

    await expect(OrderService.cancelOrderByCustomer('o-1', customer)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('OrderService.cancelOrderBySeller', () => {
  it('allows seller to cancel pending order with reason', async () => {
    OrderModel.findById.mockResolvedValue({
      id: 'o-1', status: 'pending', seller_id: 'sp-1', customer_id: 'u-cust',
    });
    OrderModel.updateStatus.mockResolvedValue({});
    OrderModel.insertStatusHistory.mockResolvedValue({});
    OrderModel.findByIdWithItems.mockResolvedValue({ id: 'o-1', status: 'cancelled' });

    await OrderService.cancelOrderBySeller('o-1', sellerUser(), { reason: 'Out of ingredient' });

    expect(OrderModel.updateStatus).toHaveBeenCalledWith(
      'o-1',
      expect.objectContaining({ status: 'cancelled', cancellationReason: 'Out of ingredient' }),
      expect.any(Object)
    );
  });

  it('rejects seller cancel of delivered order', async () => {
    OrderModel.findById.mockResolvedValue({
      id: 'o-1', status: 'delivered', seller_id: 'sp-1',
    });

    await expect(
      OrderService.cancelOrderBySeller('o-1', sellerUser(), { reason: 'x' })
    ).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_TRANSITION' });
  });
});

describe('OrderService.autoCancelExpiredOrders', () => {
  it('cancels every pending order older than 30 minutes', async () => {
    OrderModel.findPendingExpired.mockResolvedValue([
      { id: 'o-a', customer_id: 'cust-a', seller_id: 'sp-1' },
      { id: 'o-b', customer_id: 'cust-b', seller_id: 'sp-2' },
    ]);
    OrderModel.updateStatus.mockResolvedValue({});
    OrderModel.insertStatusHistory.mockResolvedValue({});
    OrderModel.findByIdWithItems.mockResolvedValue({});

    const cancelled = await OrderService.autoCancelExpiredOrders();

    expect(cancelled).toHaveLength(2);
    expect(OrderModel.updateStatus).toHaveBeenCalledWith(
      'o-a',
      expect.objectContaining({ status: 'cancelled', autoCancelled: true }),
      expect.any(Object)
    );
    expect(NotificationService.notifyOrderAutoCancelled).toHaveBeenCalledTimes(2);
  });

  it('returns empty when no expired orders', async () => {
    OrderModel.findPendingExpired.mockResolvedValue([]);

    const cancelled = await OrderService.autoCancelExpiredOrders();

    expect(cancelled).toEqual([]);
  });
});
