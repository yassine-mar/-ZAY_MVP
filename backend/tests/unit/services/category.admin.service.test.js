'use strict';

jest.mock('../../../src/models/category.model');

const CategoryModel = require('../../../src/models/category.model');
const CategoryAdminService = require('../../../src/services/admin/category.admin.service');

beforeEach(() => jest.clearAllMocks());

describe('CategoryAdminService.listAll', () => {
  it('returns all categories including inactive', async () => {
    CategoryModel.findAll.mockResolvedValue([
      { id: 'c1', is_active: true },
      { id: 'c2', is_active: false },
    ]);

    const result = await CategoryAdminService.listAll();

    expect(result).toHaveLength(2);
  });
});

describe('CategoryAdminService.create', () => {
  it('auto-generates slug from name when not provided', async () => {
    CategoryModel.create.mockResolvedValue({ id: 'c1', name: 'Plats Chauds', slug: 'plats-chauds' });

    await CategoryAdminService.create({ name: 'Plats Chauds' });

    expect(CategoryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Plats Chauds', slug: 'plats-chauds' })
    );
  });

  it('strips diacritics in auto-generated slug (French/Moroccan names)', async () => {
    CategoryModel.create.mockResolvedValue({ id: 'c1' });

    await CategoryAdminService.create({ name: 'Pâtisserie Marocaine' });

    expect(CategoryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'patisserie-marocaine' })
    );
  });

  it('respects explicit slug over name', async () => {
    CategoryModel.create.mockResolvedValue({ id: 'c1' });

    await CategoryAdminService.create({ name: 'Tagine de Poulet', slug: 'tagine-chicken' });

    expect(CategoryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'tagine-chicken' })
    );
  });

  it('rejects when slug cannot be generated (all-special-chars name)', async () => {
    await expect(CategoryAdminService.create({ name: '!!!@@@' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_SLUG',
    });

    expect(CategoryModel.create).not.toHaveBeenCalled();
  });

  it('maps unique-slug violation to 409 CONFLICT with specific message', async () => {
    const err = new Error('duplicate');
    err.code = '23505';
    err.constraint = 'categories_slug_unique';
    CategoryModel.create.mockRejectedValue(err);

    await expect(
      CategoryAdminService.create({ name: 'Tagine', slug: 'tagine' })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('slug'),
    });
  });

  it('maps unique-name violation to 409 CONFLICT', async () => {
    const err = new Error('duplicate');
    err.code = '23505';
    err.constraint = 'categories_name_unique';
    CategoryModel.create.mockRejectedValue(err);

    await expect(CategoryAdminService.create({ name: 'Tagine' })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('name'),
    });
  });

  it('passes through default sort_order and is_active', async () => {
    CategoryModel.create.mockResolvedValue({ id: 'c1' });

    await CategoryAdminService.create({ name: 'X' });

    expect(CategoryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 0, isActive: true })
    );
  });
});

describe('CategoryAdminService.update', () => {
  it('returns 404 when category does not exist', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      CategoryAdminService.update('c1', { name: 'X' })
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    expect(CategoryModel.update).not.toHaveBeenCalled();
  });

  it('auto-regenerates slug when name changes and slug not provided', async () => {
    CategoryModel.findById.mockResolvedValue({ id: 'c1', name: 'Old Name', slug: 'old-name' });
    CategoryModel.update.mockResolvedValue({ id: 'c1', name: 'New Name', slug: 'new-name' });

    await CategoryAdminService.update('c1', { name: 'New Name' });

    expect(CategoryModel.update).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ name: 'New Name', slug: 'new-name' })
    );
  });

  it('does NOT regenerate slug when name is unchanged', async () => {
    CategoryModel.findById.mockResolvedValue({ id: 'c1', name: 'Same', slug: 'same' });
    CategoryModel.update.mockResolvedValue({});

    await CategoryAdminService.update('c1', { name: 'Same', icon: '🥘' });

    const callArgs = CategoryModel.update.mock.calls[0][1];
    expect(callArgs.slug).toBeUndefined();
  });

  it('respects explicit slug even when name also changed', async () => {
    CategoryModel.findById.mockResolvedValue({ id: 'c1', name: 'Old', slug: 'old' });
    CategoryModel.update.mockResolvedValue({});

    await CategoryAdminService.update('c1', { name: 'New', slug: 'custom-slug' });

    expect(CategoryModel.update).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ slug: 'custom-slug' })
    );
  });

  it('allows toggling is_active to reactivate a deactivated category', async () => {
    CategoryModel.findById.mockResolvedValue({ id: 'c1', name: 'X', slug: 'x', is_active: false });
    CategoryModel.update.mockResolvedValue({ id: 'c1', is_active: true });

    const result = await CategoryAdminService.update('c1', { is_active: true });

    expect(result.is_active).toBe(true);
  });

  it('maps unique-slug violation to 409', async () => {
    CategoryModel.findById.mockResolvedValue({ id: 'c1', name: 'X', slug: 'x' });
    const err = new Error('duplicate');
    err.code = '23505';
    err.constraint = 'categories_slug_unique';
    CategoryModel.update.mockRejectedValue(err);

    await expect(
      CategoryAdminService.update('c1', { slug: 'taken' })
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });
});

describe('CategoryAdminService.deactivate', () => {
  it('soft-deletes via model.deactivate', async () => {
    CategoryModel.deactivate.mockResolvedValue({ id: 'c1', is_active: false });

    const result = await CategoryAdminService.deactivate('c1');

    expect(result.is_active).toBe(false);
    expect(CategoryModel.deactivate).toHaveBeenCalledWith('c1');
  });

  it('returns 404 when category does not exist', async () => {
    CategoryModel.deactivate.mockResolvedValue(null);

    await expect(CategoryAdminService.deactivate('c1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});
