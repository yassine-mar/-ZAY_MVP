'use strict';

const ItemModel = require('../models/item.model');
const SellerModel = require('../models/seller.model');
const MenuModel = require('../models/menu.model');
const CategoryModel = require('../models/category.model');
const AppError = require('../utils/AppError');
const { parsePaginationParams, buildPaginationMeta } = require('../utils/pagination');

const DEFAULT_FEATURED_LIMIT = 20;

/**
 * Public browse — paginated, filtered, searchable list of available items
 * from approved sellers.
 */
const getItems = async (queryParams) => {
  const { page, limit, offset } = parsePaginationParams(queryParams);

  const filters = {
    page,
    limit,
    offset,
    city: queryParams.city,
    categorySlug: queryParams.category,
    sellerId: queryParams.seller_id,
    minPrice: queryParams.min_price,
    maxPrice: queryParams.max_price,
    search: queryParams.search,
    sort: queryParams.sort,
  };

  // Run COUNT + page query in parallel.
  const [items, total] = await Promise.all([
    ItemModel.findAvailableForBrowse(filters),
    ItemModel.countAvailableForBrowse(filters),
  ]);

  return {
    items,
    pagination: buildPaginationMeta(page, limit, total),
  };
};

const getFeaturedItems = async (queryParams = {}) => {
  const limit = Number(queryParams.limit) || DEFAULT_FEATURED_LIMIT;
  return ItemModel.findFeatured({ limit, city: queryParams.city });
};

const getCategories = async () => CategoryModel.findActive();

/* ── Seller browse (used by Seller list + Seller profile) ──────────────── */

const getSellers = async (queryParams) => {
  // The seller browse feature is implemented in the seller management step.
  // For now, return paginated approved sellers with optional city filter.
  // (Real implementation will live in the seller feature step.)
  throw new AppError(501, 'NOT_IMPLEMENTED', 'Seller browse is part of the seller feature');
};

/**
 * Full seller profile with their menus + items inlined.
 * Used by the public mobile screen "SellerProfileScreen".
 */
const getSellerProfile = async (sellerId) => {
  const seller = await SellerModel.findById(sellerId);
  if (!seller || seller.status !== 'approved') {
    throw new AppError(404, 'NOT_FOUND', 'Seller not found');
  }

  // Fetch all (non-deleted) menus for this seller; we'll inline their items.
  const menus = await MenuModel.findBySellerId(sellerId);
  const menusWithItems = await Promise.all(
    menus.map(async (m) => {
      const full = await MenuModel.findByIdWithItems(m.id);
      return full;
    })
  );

  return { seller, menus: menusWithItems.filter(Boolean) };
};

module.exports = {
  getItems,
  getFeaturedItems,
  getCategories,
  getSellers,
  getSellerProfile,
};
