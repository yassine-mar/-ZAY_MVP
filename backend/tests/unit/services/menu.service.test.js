'use strict';

jest.mock('../../../src/models/menu.model');

const MenuModel = require('../../../src/models/menu.model');
const MenuService = require('../../../src/services/menu.service');

const sellerUser = (sellerId = 'sp-1') => ({
  id: 'u-1',
  role: 'seller',
  sellerProfile: { id: sellerId, status: 'approved' },
});

beforeEach(() => jest.clearAllMocks());

describe('MenuService.getMenus', () => {
  it('returns menus for the seller', async () => {
    MenuModel.findBySellerId.mockResolvedValue([{ id: 'm1', name: 'Plats' }]);

    const result = await MenuService.getMenus(sellerUser());

    expect(result).toHaveLength(1);
    expect(MenuModel.findBySellerId).toHaveBeenCalledWith('sp-1');
  });
});

describe('MenuService.createMenu', () => {
  it('creates a menu owned by the seller', async () => {
    MenuModel.create.mockResolvedValue({ id: 'm1', seller_id: 'sp-1', name: 'Plats' });

    const result = await MenuService.createMenu(sellerUser(), {
      name: 'Plats',
      description: 'Hot meals',
    });

    expect(result.id).toBe('m1');
    expect(MenuModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ sellerId: 'sp-1', name: 'Plats' })
    );
  });
});

describe('MenuService.getMenu', () => {
  it('returns the menu when seller owns it', async () => {
    MenuModel.findById.mockResolvedValue({ id: 'm1', seller_id: 'sp-1' });

    const result = await MenuService.getMenu(sellerUser(), 'm1');

    expect(result.id).toBe('m1');
  });

  it('returns 404 when menu does not exist', async () => {
    MenuModel.findById.mockResolvedValue(null);

    await expect(MenuService.getMenu(sellerUser(), 'm1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns 404 when menu belongs to another seller (no enumeration)', async () => {
    MenuModel.findById.mockResolvedValue({ id: 'm1', seller_id: 'other-seller' });

    await expect(MenuService.getMenu(sellerUser('sp-1'), 'm1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('MenuService.updateMenu', () => {
  it('updates when seller owns the menu', async () => {
    MenuModel.findById.mockResolvedValue({ id: 'm1', seller_id: 'sp-1' });
    MenuModel.update.mockResolvedValue({ id: 'm1', name: 'New' });

    const result = await MenuService.updateMenu(sellerUser(), 'm1', { name: 'New' });

    expect(result.name).toBe('New');
    expect(MenuModel.update).toHaveBeenCalledWith('m1', { name: 'New' });
  });

  it('rejects update by non-owner with 404', async () => {
    MenuModel.findById.mockResolvedValue({ id: 'm1', seller_id: 'other' });

    await expect(
      MenuService.updateMenu(sellerUser('sp-1'), 'm1', { name: 'X' })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(MenuModel.update).not.toHaveBeenCalled();
  });
});

describe('MenuService.deleteMenu', () => {
  it('soft-deletes when seller owns it', async () => {
    MenuModel.findById.mockResolvedValue({ id: 'm1', seller_id: 'sp-1' });
    MenuModel.softDelete.mockResolvedValue();

    await MenuService.deleteMenu(sellerUser(), 'm1');

    expect(MenuModel.softDelete).toHaveBeenCalledWith('m1');
  });

  it('rejects delete by non-owner', async () => {
    MenuModel.findById.mockResolvedValue({ id: 'm1', seller_id: 'other' });

    await expect(MenuService.deleteMenu(sellerUser(), 'm1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
