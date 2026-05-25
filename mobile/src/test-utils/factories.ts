/**
 * Typed test-data factories.
 *
 * Each `build<X>()` returns a complete, valid object of that domain type
 * with sensible defaults. Pass overrides to vary one field at a time.
 *
 *   const user = buildUser({ role: 'seller' });
 */
import type {
  Category,
  CartLine,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusEntry,
  SellerDetail,
  SellerProfile,
  SellerSummary,
  User,
} from '@/types/domain.types';

let id = 1000;
const nextId = (prefix = 'id') => `${prefix}-${++id}`;

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: nextId('user'),
    name: 'Fatima Test',
    email: 'fatima@example.com',
    phone: '+212612345678',
    role: 'customer',
    status: 'active',
    avatar_url: null,
    created_at: new Date('2026-01-01').toISOString(),
    seller_profile: null,
    ...overrides,
  };
}

export function buildSellerProfile(overrides: Partial<SellerProfile> = {}): SellerProfile {
  return {
    id: nextId('seller'),
    business_name: 'Dar Atika',
    description: 'Tagine, couscous, pastilla',
    city: 'Casablanca',
    delivery_radius_km: 8,
    status: 'approved',
    rejection_reason: null,
    approved_at: new Date('2026-01-01').toISOString(),
    is_open: true,
    ...overrides,
  };
}

export function buildSellerUser(overrides: Partial<User> = {}): User {
  return buildUser({
    role: 'seller',
    seller_profile: buildSellerProfile(),
    ...overrides,
  });
}

export function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: nextId('cat'),
    name: 'Tagine',
    slug: 'tagine',
    icon: '🥘',
    sort_order: 0,
    is_active: true,
    ...overrides,
  };
}

export function buildSellerSummary(overrides: Partial<SellerSummary> = {}): SellerSummary {
  return {
    id: nextId('seller'),
    business_name: 'Dar Atika',
    city: 'Casablanca',
    avatar_url: null,
    cover_image_url: null,
    rating: 4.7,
    item_count: 12,
    delivery_radius_km: 8,
    is_open: true,
    ...overrides,
  };
}

export function buildSellerDetail(overrides: Partial<SellerDetail> = {}): SellerDetail {
  return {
    ...buildSellerSummary(),
    description: 'Authentic family recipes',
    menus: [],
    ...overrides,
  };
}

export function buildMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: nextId('item'),
    menu_id: nextId('menu'),
    seller_id: nextId('seller'),
    category_id: null,
    name: 'Tagine Poulet aux Olives',
    description: 'Slow-cooked chicken with preserved lemon and olives',
    price: 80,
    image_url: null,
    is_available: true,
    ...overrides,
  };
}

export function buildCartLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    menu_item_id: nextId('item'),
    name: 'Tagine Poulet',
    price: 65,
    quantity: 1,
    image_url: null,
    ...overrides,
  };
}

export function buildOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  const price = overrides.price ?? 65;
  const quantity = overrides.quantity ?? 1;
  return {
    id: nextId('oi'),
    menu_item_id: nextId('item'),
    name: 'Tagine Poulet',
    price,
    quantity,
    subtotal: price * quantity,
    ...overrides,
  };
}

export function buildOrder(overrides: Partial<Order> = {}): Order {
  const items = overrides.items ?? [buildOrderItem()];
  const total = overrides.total_amount ?? items.reduce((s, i) => s + i.subtotal, 0);
  return {
    id: nextId('order'),
    status: 'pending' as OrderStatus,
    total_amount: total,
    items,
    customer: {
      id: nextId('user'),
      name: 'Fatima Customer',
      phone: '+212612345678',
    },
    seller: {
      id: nextId('seller'),
      business_name: 'Dar Atika',
      avatar_url: null,
      city: 'Casablanca',
    },
    delivery_address: {
      street: 'Rue Tarik Ibn Ziad, 24',
      district: 'Maarif',
      city: 'Casablanca',
    },
    customer_notes: null,
    estimated_ready_at: null,
    created_at: new Date('2026-05-25T12:00:00Z').toISOString(),
    ...overrides,
  };
}

export function buildStatusEntry(overrides: Partial<OrderStatusEntry> = {}): OrderStatusEntry {
  return {
    id: nextId('osh'),
    from_status: null,
    to_status: 'pending',
    note: null,
    changed_at: new Date('2026-05-25T12:00:00Z').toISOString(),
    ...overrides,
  };
}
