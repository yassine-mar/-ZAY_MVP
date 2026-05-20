'use strict';

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const ItemModel = require('../models/item.model');
const SellerModel = require('../models/seller.model');

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Sum repeat menu_item_id entries. The mobile cart shouldn't send dupes
 * but defensively dedupe here — a single line per item simplifies the
 * response shape and downstream checkout.
 */
const dedupeItems = (items) => {
  const map = new Map();
  for (const it of items) {
    const existing = map.get(it.menu_item_id);
    if (existing) {
      existing.quantity += it.quantity;
      // If client_price differs across dupes, last write wins — rare edge case.
      if (it.client_price !== undefined) existing.client_price = it.client_price;
    } else {
      map.set(it.menu_item_id, { ...it });
    }
  }
  return Array.from(map.values());
};

/**
 * Pre-checkout cart validation. Returns a structured report the mobile app
 * can consume to (a) show inline warnings before the user reaches checkout
 * and (b) hard-block the checkout button when blockers are present.
 *
 * Issue codes (per-item):
 *   item_unavailable   item missing OR is_available=false OR seller deactivated it
 *   price_changed      client_price provided AND differs from current server price
 *
 * Blocker codes (per-cart — checkout cannot proceed):
 *   cross_seller_order   items belong to more than one seller
 *   wrong_seller         requested seller_id doesn't match the items' seller
 *   seller_not_found     seller record missing (shouldn't happen — items orphaned)
 *   seller_not_approved  seller status != 'approved'
 *   seller_closed        seller is_open = false
 *   all_items_unavailable
 *
 * Warning codes (per-cart — checkout possible after the user confirms):
 *   items_unavailable    some items dropped — customer should review
 *   prices_changed       some prices drifted — customer should accept new total
 *
 * The response is `valid: true` only when blockers AND warnings are both empty.
 */
const validate = async (_user, { items, seller_id: requestedSellerId }) => {
  // Defense: Joi already enforces min 1 but check again before fanning out to the DB.
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, 'BAD_REQUEST', 'Cart is empty');
  }

  const deduped = dedupeItems(items);
  const requestedIds = deduped.map((i) => i.menu_item_id);

  // Single round-trip: fetch only the items that are currently AVAILABLE
  // (also filters out deleted items and items in deleted menus).
  const foundItems = await ItemModel.findByIds(requestedIds);
  const foundMap = new Map(foundItems.map((i) => [i.id, i]));

  // Build per-item results.
  const itemResults = deduped.map((req) => {
    const found = foundMap.get(req.menu_item_id);
    if (!found) {
      return {
        menu_item_id: req.menu_item_id,
        quantity: req.quantity,
        client_price: req.client_price,
        current_price: null,
        subtotal: 0,
        available: false,
        price_changed: false,
        issues: ['item_unavailable'],
      };
    }

    const currentPrice = Number(found.price);
    const result = {
      menu_item_id: found.id,
      name: found.name,
      image_url: found.image_url,
      quantity: req.quantity,
      current_price: round2(currentPrice),
      subtotal: round2(currentPrice * req.quantity),
      available: true,
      price_changed: false,
      issues: [],
    };

    if (req.client_price !== undefined) {
      const clientPrice = Number(req.client_price);
      result.client_price = round2(clientPrice);
      if (clientPrice !== currentPrice) {
        result.price_changed = true;
        result.issues.push('price_changed');
      }
    }

    return result;
  });

  /* ── Multi-seller detection ─────────────────────────────────────────── */

  const sellerIdsFromItems = [...new Set(foundItems.map((i) => i.seller_id))];
  const blockers = [];
  const warnings = [];

  if (sellerIdsFromItems.length > 1) {
    // Hard stop — cart spans multiple sellers. The mobile cart store enforces
    // single-seller carts, so reaching this state is either a bug or a stale
    // cart from before a seller deleted an item.
    blockers.push('cross_seller_order');
    return {
      valid: false,
      seller_id: null,
      seller: null,
      items: itemResults,
      total_amount: 0,
      issue_count: itemResults.reduce((n, i) => n + i.issues.length, 0),
      blockers,
      warnings,
    };
  }

  const inferredSellerId = sellerIdsFromItems[0] ?? null;

  /* ── Seller verification ────────────────────────────────────────────── */

  let seller = null;
  if (inferredSellerId) {
    if (requestedSellerId && requestedSellerId !== inferredSellerId) {
      blockers.push('wrong_seller');
    }

    seller = await SellerModel.findById(inferredSellerId);
    if (!seller) {
      blockers.push('seller_not_found');
    } else {
      if (seller.status !== 'approved') blockers.push('seller_not_approved');
      if (!seller.is_open) blockers.push('seller_closed');
    }
  } else if (requestedSellerId) {
    // No items were found at all but a seller_id was requested — can't verify it
    // matters since the cart has no items left. Skip wrong_seller check.
  }

  /* ── Total + warnings ──────────────────────────────────────────────── */

  const availableItems = itemResults.filter((i) => i.available);
  const total = availableItems.reduce((sum, i) => sum + i.subtotal, 0);

  if (availableItems.length === 0) {
    blockers.push('all_items_unavailable');
  } else if (itemResults.some((i) => !i.available)) {
    warnings.push('items_unavailable');
  }
  if (itemResults.some((i) => i.price_changed)) {
    warnings.push('prices_changed');
  }

  const valid = blockers.length === 0 && warnings.length === 0;

  if (blockers.length > 0 || warnings.length > 0) {
    logger.debug('Cart validation issues', {
      blockers,
      warnings,
      itemCount: itemResults.length,
      availableCount: availableItems.length,
    });
  }

  return {
    valid,
    seller_id: inferredSellerId,
    seller,
    items: itemResults,
    total_amount: round2(total),
    issue_count: itemResults.reduce((n, i) => n + i.issues.length, 0),
    blockers,
    warnings,
  };
};

module.exports = { validate };
