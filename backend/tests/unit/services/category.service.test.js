'use strict';

jest.mock('../../../src/models/category.model');

const CategoryModel = require('../../../src/models/category.model');
const CategoryService = require('../../../src/services/category.service');

beforeEach(() => jest.clearAllMocks());

describe('CategoryService.listActive', () => {
  it('returns only active categories from the model', async () => {
    CategoryModel.findActive.mockResolvedValue([
      { id: 'c1', name: 'Tagine', is_active: true },
      { id: 'c2', name: 'Couscous', is_active: true },
    ]);

    const result = await CategoryService.listActive();

    expect(result).toHaveLength(2);
    expect(CategoryModel.findActive).toHaveBeenCalledTimes(1);
    // listActive does NOT call findAll (no inactive leakage)
    expect(CategoryModel.findAll).not.toHaveBeenCalled();
  });

  it('returns empty array when no categories exist', async () => {
    CategoryModel.findActive.mockResolvedValue([]);

    const result = await CategoryService.listActive();

    expect(result).toEqual([]);
  });
});

describe('CategoryService.getBySlug', () => {
  it('delegates to model.findBySlug', async () => {
    CategoryModel.findBySlug.mockResolvedValue({ id: 'c1', slug: 'tagine' });

    const result = await CategoryService.getBySlug('tagine');

    expect(result.slug).toBe('tagine');
    expect(CategoryModel.findBySlug).toHaveBeenCalledWith('tagine');
  });

  it('returns null when not found', async () => {
    CategoryModel.findBySlug.mockResolvedValue(null);

    const result = await CategoryService.getBySlug('unknown');

    expect(result).toBeNull();
  });
});
