'use strict';

jest.mock('../../../src/models/item.model');
jest.mock('../../../src/models/menu.model');
jest.mock('../../../src/models/category.model');
jest.mock('../../../src/services/upload.service');

const ItemModel = require('../../../src/models/item.model');
const MenuModel = require('../../../src/models/menu.model');
const CategoryModel = require('../../../src/models/category.model');
const UploadService = require('../../../src/services/upload.service');
const ItemService = require('../../../src/services/item.service');

const sellerUser = (sellerId = 'sp-1') => ({
  id: 'u-1',
  role: 'seller',
  sellerProfile: { id: sellerId, status: 'approved' },
});

beforeEach(() => jest.clearAllMocks());

describe('ItemService.addItem', () => {
  it('adds an item when seller owns the menu and category exists', async () => {
    MenuModel.findById.mockResolvedValue({ id: 'm1', seller_id: 'sp-1' });
    CategoryModel.findById.mockResolvedValue({ id: 'c1', is_active: true });
    ItemModel.create.mockResolvedValue({ id: 'i1', name: 'Tagine' });

    const result = await ItemService.addItem(sellerUser(), 'm1', {
      name: 'Tagine',
      price: 65,
      category_id: 'c1',
    });

    expect(result.id).toBe('i1');
    expect(ItemModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ menuId: 'm1', categoryId: 'c1' })
    );
  });

  it('rejects when menu does not belong to seller', async () => {
    MenuModel.findById.mockResolvedValue({ id: 'm1', seller_id: 'other' });

    await expect(
      ItemService.addItem(sellerUser('sp-1'), 'm1', {
        name: 'X',
        price: 50,
        category_id: 'c1',
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(ItemModel.create).not.toHaveBeenCalled();
  });

  it('rejects when category is inactive', async () => {
    MenuModel.findById.mockResolvedValue({ id: 'm1', seller_id: 'sp-1' });
    CategoryModel.findById.mockResolvedValue({ id: 'c1', is_active: false });

    await expect(
      ItemService.addItem(sellerUser(), 'm1', { name: 'X', price: 50, category_id: 'c1' })
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_CATEGORY' });
  });

  it('rejects when category does not exist', async () => {
    MenuModel.findById.mockResolvedValue({ id: 'm1', seller_id: 'sp-1' });
    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      ItemService.addItem(sellerUser(), 'm1', { name: 'X', price: 50, category_id: 'c1' })
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_CATEGORY' });
  });
});

describe('ItemService.updateItem', () => {
  it('updates when seller owns the item', async () => {
    ItemModel.findByIdWithSeller.mockResolvedValue({
      id: 'i1',
      menu_id: 'm1',
      seller_id: 'sp-1',
    });
    ItemModel.update.mockResolvedValue({ id: 'i1', price: 70 });

    const result = await ItemService.updateItem(sellerUser(), 'i1', { price: 70 });

    expect(result.price).toBe(70);
  });

  it('rejects update by non-owner', async () => {
    ItemModel.findByIdWithSeller.mockResolvedValue({
      id: 'i1',
      seller_id: 'other-seller',
    });

    await expect(
      ItemService.updateItem(sellerUser('sp-1'), 'i1', { price: 70 })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('validates new category if changed', async () => {
    ItemModel.findByIdWithSeller.mockResolvedValue({ id: 'i1', seller_id: 'sp-1' });
    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      ItemService.updateItem(sellerUser(), 'i1', { category_id: 'bad-cat' })
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_CATEGORY' });
  });
});

describe('ItemService.toggleAvailability', () => {
  it('flips availability when seller owns the item', async () => {
    ItemModel.findByIdWithSeller.mockResolvedValue({ id: 'i1', seller_id: 'sp-1' });
    ItemModel.toggleAvailability.mockResolvedValue({ id: 'i1', is_available: false });

    const result = await ItemService.toggleAvailability(sellerUser(), 'i1', false);

    expect(result.is_available).toBe(false);
    expect(ItemModel.toggleAvailability).toHaveBeenCalledWith('i1', false);
  });
});

describe('ItemService.deleteItem', () => {
  it('soft-deletes when seller owns it', async () => {
    ItemModel.findByIdWithSeller.mockResolvedValue({ id: 'i1', seller_id: 'sp-1' });
    ItemModel.softDelete.mockResolvedValue();

    await ItemService.deleteItem(sellerUser(), 'i1');

    expect(ItemModel.softDelete).toHaveBeenCalledWith('i1');
  });
});

describe('ItemService.uploadItemImage', () => {
  it('uploads, updates DB, and deletes old asset', async () => {
    ItemModel.findByIdWithSeller.mockResolvedValue({
      id: 'i1',
      seller_id: 'sp-1',
      image_public_id: 'old-pub-id',
    });
    UploadService.uploadImage.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/zay/items/new.jpg',
      public_id: 'new-pub-id',
    });
    ItemModel.updateImage.mockResolvedValue();
    UploadService.deleteImage.mockResolvedValue(true);

    const result = await ItemService.uploadItemImage(sellerUser(), 'i1', {
      buffer: Buffer.from('fake'),
      mimetype: 'image/jpeg',
    });

    expect(UploadService.uploadImage).toHaveBeenCalledWith(expect.any(Buffer), 'items');
    expect(ItemModel.updateImage).toHaveBeenCalledWith('i1', expect.objectContaining({
      imageUrl: expect.stringContaining('new.jpg'),
      imagePublicId: 'new-pub-id',
    }));
    expect(result.image_url).toContain('new.jpg');
  });

  it('skips deleteImage when no previous image', async () => {
    ItemModel.findByIdWithSeller.mockResolvedValue({
      id: 'i1',
      seller_id: 'sp-1',
      image_public_id: null,
    });
    UploadService.uploadImage.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/zay/items/first.jpg',
      public_id: 'first-pub-id',
    });
    ItemModel.updateImage.mockResolvedValue();

    await ItemService.uploadItemImage(sellerUser(), 'i1', {
      buffer: Buffer.from('fake'),
      mimetype: 'image/jpeg',
    });

    expect(UploadService.deleteImage).not.toHaveBeenCalled();
  });

  it('rejects upload when no file provided', async () => {
    await expect(ItemService.uploadItemImage(sellerUser(), 'i1', null)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('rejects upload by non-owner with 404', async () => {
    ItemModel.findByIdWithSeller.mockResolvedValue({ id: 'i1', seller_id: 'other' });

    await expect(
      ItemService.uploadItemImage(sellerUser('sp-1'), 'i1', { buffer: Buffer.from('x') })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
