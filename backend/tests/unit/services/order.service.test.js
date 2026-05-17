'use strict';

/**
 * Unit tests for OrderService.
 * Mocks model layer — runs in milliseconds without a database.
 *
 * NOTE: These tests will fail until OrderService is implemented.
 * They serve as a specification of expected behavior.
 */

jest.mock('../../../src/models/order.model');
jest.mock('../../../src/models/item.model');
jest.mock('../../../src/models/seller.model');
jest.mock('../../../src/models/base.model');
jest.mock('../../../src/services/notification.service');
jest.mock('../../../src/config/socket');

const OrderService = require('../../../src/services/order.service');

describe.skip('OrderService.createOrder', () => {
  it('rejects order when seller is closed', async () => {
    // TODO: SellerModel.findById returns { is_open: false }
    // Expect: throws AppError(422, 'SELLER_CLOSED')
  });

  it('rejects order when seller is not approved', async () => {
    // TODO: SellerModel.findById returns { status: 'pending', is_open: true }
    // Expect: throws AppError(422, 'SELLER_CLOSED') or NOT_FOUND
  });

  it('rejects order when items span multiple sellers', async () => {
    // TODO: ItemModel.findByIds returns items with different menu->seller_id
    // Expect: throws AppError(422, 'CROSS_SELLER_ORDER')
  });

  it('rejects order when any item is unavailable', async () => {
    // TODO: ItemModel.findByIds returns one item with is_available = false
    // Expect: throws AppError(422, 'UNPROCESSABLE') with details
  });

  it('calculates total amount server-side, ignoring any client-sent total', async () => {
    // TODO: items = [{ menu_item_id, quantity: 2 }] with price = 50
    // Expect: order.total_amount === 100
  });

  it('runs INSERT order + INSERT order_items within a single transaction', async () => {
    // TODO: assert withTransaction was called with a callback
  });

  it('emits order:new socket event after successful placement', async () => {
    // TODO: assert getIO().to(`order:${id}`).emit was called
  });
});

describe.skip('OrderService.updateOrderStatus', () => {
  it('rejects invalid status transitions', async () => {
    // TODO: order.status = 'delivered', request to set 'accepted'
    // Expect: throws AppError(422, 'INVALID_TRANSITION')
  });

  it('requires order ownership by the seller', async () => {
    // TODO: order.seller_id !== user.sellerProfile.id
    // Expect: throws AppError(404, 'NOT_FOUND')
  });
});
