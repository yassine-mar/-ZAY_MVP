'use strict';

jest.mock('../../../src/models/item.model');
jest.mock('../../../src/models/seller.model');

const ItemModel = require('../../../src/models/item.model');
const SellerModel = require('../../../src/models/seller.model');
const CartService = require('../../../src/services/cart.service');

const customer = { id: 'u-1', role: 'customer' };

const openApprovedSeller = (id = 'sp-1') => ({
  id,
  business_name: 'Dar Test',
  city: 'Casablanca',
  status: 'approved',
  is_open: true,
  delivery_radius_km: 5,
});

beforeEach(() => jest.clearAllMocks());

describe('CartService.validate — happy path', () => {
  it('returns valid=true when all items available and seller open', async () => {
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i1', name: 'Tagine', price: 65, seller_id: 'sp-1', image_url: null },
      { id: 'i2', name: 'Harira', price: 25, seller_id: 'sp-1', image_url: null },
    ]);
    SellerModel.findById.mockResolvedValue(openApprovedSeller());

    const result = await CartService.validate(customer, {
      items: [
        { menu_item_id: 'i1', quantity: 2 },
        { menu_item_id: 'i2', quantity: 1 },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.total_amount).toBe(65 * 2 + 25); // 155
    expect(result.seller_id).toBe('sp-1');
    expect(result.items).toHaveLength(2);
    expect(result.items.every((i) => i.available)).toBe(true);
  });

  it('returns server-side prices even when client did not provide client_price', async () => {
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i1', name: 'Tagine', price: 65, seller_id: 'sp-1' },
    ]);
    SellerModel.findById.mockResolvedValue(openApprovedSeller());

    const result = await CartService.validate(customer, {
      items: [{ menu_item_id: 'i1', quantity: 2 }],
    });

    expect(result.items[0].current_price).toBe(65);
    expect(result.items[0].price_changed).toBe(false);
    expect(result.total_amount).toBe(130);
  });
});

describe('CartService.validate — per-item issues', () => {
  it('flags unavailable items', async () => {
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i1', name: 'Tagine', price: 65, seller_id: 'sp-1' },
    ]);
    SellerModel.findById.mockResolvedValue(openApprovedSeller());

    const result = await CartService.validate(customer, {
      items: [
        { menu_item_id: 'i1', quantity: 1 },
        { menu_item_id: 'i-deleted', quantity: 1 },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.warnings).toContain('items_unavailable');
    const dead = result.items.find((i) => i.menu_item_id === 'i-deleted');
    expect(dead.available).toBe(false);
    expect(dead.issues).toContain('item_unavailable');
    expect(dead.subtotal).toBe(0);
  });

  it('flags price_changed when client_price differs from server price', async () => {
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i1', name: 'Tagine', price: 75, seller_id: 'sp-1' }, // server now charges 75
    ]);
    SellerModel.findById.mockResolvedValue(openApprovedSeller());

    const result = await CartService.validate(customer, {
      items: [{ menu_item_id: 'i1', quantity: 2, client_price: 65 }], // client saw 65
    });

    const item = result.items[0];
    expect(item.price_changed).toBe(true);
    expect(item.current_price).toBe(75);
    expect(item.client_price).toBe(65);
    expect(item.subtotal).toBe(150); // recalculated at current price
    expect(result.warnings).toContain('prices_changed');
    expect(result.valid).toBe(false);
  });

  it('does not flag price_changed when client and server prices match', async () => {
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i1', name: 'Tagine', price: 65, seller_id: 'sp-1' },
    ]);
    SellerModel.findById.mockResolvedValue(openApprovedSeller());

    const result = await CartService.validate(customer, {
      items: [{ menu_item_id: 'i1', quantity: 1, client_price: 65 }],
    });

    expect(result.items[0].price_changed).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('dedupes repeat menu_item_id entries (sums quantity)', async () => {
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i1', name: 'Tagine', price: 65, seller_id: 'sp-1' },
    ]);
    SellerModel.findById.mockResolvedValue(openApprovedSeller());

    const result = await CartService.validate(customer, {
      items: [
        { menu_item_id: 'i1', quantity: 1 },
        { menu_item_id: 'i1', quantity: 2 },
      ],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(3);
    expect(result.total_amount).toBe(195);
  });
});

describe('CartService.validate — per-cart blockers', () => {
  it('blocks cross-seller orders', async () => {
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i1', name: 'A', price: 50, seller_id: 'sp-1' },
      { id: 'i2', name: 'B', price: 50, seller_id: 'sp-2' },
    ]);

    const result = await CartService.validate(customer, {
      items: [
        { menu_item_id: 'i1', quantity: 1 },
        { menu_item_id: 'i2', quantity: 1 },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.blockers).toContain('cross_seller_order');
    expect(result.total_amount).toBe(0);
    // We don't bother looking up the seller — checkout is dead in the water.
    expect(SellerModel.findById).not.toHaveBeenCalled();
  });

  it('blocks when seller is closed', async () => {
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i1', name: 'Tagine', price: 65, seller_id: 'sp-1' },
    ]);
    SellerModel.findById.mockResolvedValue({
      ...openApprovedSeller(),
      is_open: false,
    });

    const result = await CartService.validate(customer, {
      items: [{ menu_item_id: 'i1', quantity: 1 }],
    });

    expect(result.valid).toBe(false);
    expect(result.blockers).toContain('seller_closed');
  });

  it('blocks when seller is not approved', async () => {
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i1', name: 'X', price: 50, seller_id: 'sp-1' },
    ]);
    SellerModel.findById.mockResolvedValue({
      ...openApprovedSeller(),
      status: 'suspended',
    });

    const result = await CartService.validate(customer, {
      items: [{ menu_item_id: 'i1', quantity: 1 }],
    });

    expect(result.valid).toBe(false);
    expect(result.blockers).toContain('seller_not_approved');
  });

  it('blocks when requested seller_id mismatches the items\' seller', async () => {
    ItemModel.findByIds.mockResolvedValue([
      { id: 'i1', name: 'X', price: 50, seller_id: 'sp-actual' },
    ]);
    SellerModel.findById.mockResolvedValue({
      ...openApprovedSeller(),
      id: 'sp-actual',
    });

    const result = await CartService.validate(customer, {
      seller_id: 'sp-claimed',
      items: [{ menu_item_id: 'i1', quantity: 1 }],
    });

    expect(result.blockers).toContain('wrong_seller');
  });

  it('blocks when ALL items are unavailable', async () => {
    ItemModel.findByIds.mockResolvedValue([]); // nothing found

    const result = await CartService.validate(customer, {
      items: [
        { menu_item_id: 'i1', quantity: 1 },
        { menu_item_id: 'i2', quantity: 1 },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.blockers).toContain('all_items_unavailable');
    expect(result.total_amount).toBe(0);
  });
});

describe('CartService.validate — input edge cases', () => {
  it('rejects empty items array', async () => {
    await expect(CartService.validate(customer, { items: [] })).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('rejects null items', async () => {
    await expect(CartService.validate(customer, { items: null })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
