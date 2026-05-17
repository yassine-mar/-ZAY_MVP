# @ZAY — Testing Strategy

---

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Testing Stack](#testing-stack)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [API Testing](#api-testing)
- [Mobile App Testing](#mobile-app-testing)
- [Test Coverage Goals](#test-coverage-goals)
- [Test Data Management](#test-data-management)
- [Running Tests](#running-tests)

---

## Testing Philosophy

Tests exist to give developers **confidence to ship.** The goal is not 100% coverage — it is meaningful coverage of the things that can actually break and cause harm to users.

**Priority order:**
1. **Business-critical paths** — Order creation, status transitions, auth, seller approval
2. **Security-sensitive code** — Auth middleware, permission checks, input validation
3. **Complex logic** — Total calculation, status machine transitions, notification triggers
4. **API contracts** — Endpoints return expected shapes and status codes

**Do not write tests for:**
- Framework code (Express routing, React rendering primitives)
- Trivial getters/setters
- Config files

---

## Testing Stack

| Tool | Purpose | Scope |
|------|---------|-------|
| Jest | Test runner + assertions | Backend + Admin |
| Supertest | HTTP endpoint testing | Backend API |
| pg (test DB) | Real PostgreSQL in tests | Integration tests |
| React Testing Library | Component tests | Admin Dashboard |
| Expo Jest preset | Mobile component tests | Mobile App |
| Postman / Bruno | Manual API test collection | API exploration |

---

## Unit Testing

Unit tests verify individual functions and service methods in isolation. Services are the primary target — they contain business logic and are easy to test without HTTP.

### Service Unit Tests

**File: `tests/unit/services/order.service.test.js`**

```js
const OrderService = require('../../../src/services/order.service');
const OrderModel = require('../../../src/models/order.model');
const MenuItemModel = require('../../../src/models/menu_item.model');
const SellerModel = require('../../../src/models/seller.model');
const NotificationService = require('../../../src/services/notification.service');

// Mock all database calls — unit tests don't hit the DB
jest.mock('../../../src/models/order.model');
jest.mock('../../../src/models/menu_item.model');
jest.mock('../../../src/models/seller.model');
jest.mock('../../../src/services/notification.service');

describe('OrderService.createOrder', () => {
  const mockCustomerId = 'cust-uuid-123';
  const mockSeller = {
    id: 'sell-uuid-456',
    status: 'approved',
    is_open: true,
  };
  const mockItems = [
    { id: 'item-uuid-1', name: 'Tagine', price: 65.00, is_available: true, seller_id: 'sell-uuid-456' },
    { id: 'item-uuid-2', name: 'Harira', price: 25.00, is_available: true, seller_id: 'sell-uuid-456' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    SellerModel.findById.mockResolvedValue(mockSeller);
    MenuItemModel.findByIds.mockResolvedValue(mockItems);
    NotificationService.notifyNewOrder.mockResolvedValue(true);
  });

  it('calculates total correctly based on server-side prices', async () => {
    const orderData = {
      seller_id: 'sell-uuid-456',
      items: [
        { menu_item_id: 'item-uuid-1', quantity: 2 },
        { menu_item_id: 'item-uuid-2', quantity: 1 },
      ],
      delivery_address: { street: '12 Rue Hassan', city: 'Casablanca' },
      payment_method: 'cash',
    };

    OrderModel.create = jest.fn().mockResolvedValue({
      id: 'ord-uuid-789',
      total_amount: 155.00,
      status: 'pending',
    });

    const order = await OrderService.createOrder(mockCustomerId, orderData);

    // 2 * 65.00 + 1 * 25.00 = 155.00
    expect(OrderModel.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ total_amount: 155.00 })
    );
  });

  it('throws UNPROCESSABLE when an item is unavailable', async () => {
    MenuItemModel.findByIds.mockResolvedValue([
      { ...mockItems[0], is_available: false },
      mockItems[1],
    ]);

    const orderData = {
      seller_id: 'sell-uuid-456',
      items: [{ menu_item_id: 'item-uuid-1', quantity: 1 }],
      delivery_address: { street: '12 Rue Hassan', city: 'Casablanca' },
    };

    await expect(
      OrderService.createOrder(mockCustomerId, orderData)
    ).rejects.toMatchObject({
      code: 'UNPROCESSABLE',
      statusCode: 422,
    });
  });

  it('throws UNPROCESSABLE when seller is closed', async () => {
    SellerModel.findById.mockResolvedValue({ ...mockSeller, is_open: false });

    await expect(
      OrderService.createOrder(mockCustomerId, {
        seller_id: 'sell-uuid-456',
        items: [{ menu_item_id: 'item-uuid-1', quantity: 1 }],
        delivery_address: { street: '12 Rue Hassan', city: 'Casablanca' },
      })
    ).rejects.toMatchObject({ code: 'UNPROCESSABLE' });
  });
});
```

**File: `tests/unit/services/auth.service.test.js`**

```js
describe('AuthService', () => {
  it('hashes passwords with bcrypt', async () => {
    const hash = await AuthService.hashPassword('MyPassword123');
    expect(hash).not.toBe('MyPassword123');
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/);  // bcrypt hash format
  });

  it('generates valid JWT', () => {
    const token = AuthService.generateToken({ id: 'uuid', role: 'customer' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('uuid');
    expect(decoded.role).toBe('customer');
  });
});
```

### Utility Unit Tests

**File: `tests/unit/utils/orderStatusMachine.test.js`**

```js
describe('Order Status Transitions', () => {
  const validTransitions = [
    { from: 'pending',   to: 'accepted',  valid: true  },
    { from: 'pending',   to: 'cancelled', valid: true  },
    { from: 'pending',   to: 'preparing', valid: false },
    { from: 'accepted',  to: 'preparing', valid: true  },
    { from: 'preparing', to: 'ready',     valid: true  },
    { from: 'ready',     to: 'delivered', valid: true  },
    { from: 'delivered', to: 'cancelled', valid: false },
  ];

  validTransitions.forEach(({ from, to, valid }) => {
    it(`${from} → ${to} is ${valid ? 'valid' : 'invalid'}`, () => {
      expect(isValidTransition(from, to)).toBe(valid);
    });
  });
});
```

---

## Integration Testing

Integration tests hit a **real test database** (PostgreSQL). They test the full stack from HTTP request to database and back.

### Setup

```js
// tests/setup.js
const { Pool } = require('pg');
const { runMigrations } = require('../src/utils/migrations');

let pool;

beforeAll(async () => {
  pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await runMigrations(pool);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // Clean tables between tests (fastest approach)
  await pool.query(`
    TRUNCATE TABLE notifications, order_items, orders,
    menu_items, menus, seller_profiles, users, categories
    RESTART IDENTITY CASCADE
  `);
  // Re-seed categories
  await pool.query(/* insert categories */);
});
```

### Auth Integration Tests

**File: `tests/integration/auth.test.js`**

```js
const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/v1/auth/register', () => {
  it('creates a new customer and returns JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        phone: '+212612345678',
        password: 'TestPass123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
    expect(res.body.data.token).toBeTruthy();
  });

  it('returns 409 when email is already registered', async () => {
    // First registration
    await request(app).post('/api/v1/auth/register').send({
      name: 'Test User',
      email: 'duplicate@example.com',
      password: 'TestPass123!',
    });

    // Second registration — same email
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Another User',
      email: 'duplicate@example.com',
      password: 'AnotherPass123!',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test',
      email: 'not-an-email',
      password: 'TestPass123!',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### Order Integration Tests

**File: `tests/integration/orders.test.js`**

```js
describe('POST /api/v1/orders', () => {
  let customerToken, sellerId, menuItemId;

  beforeEach(async () => {
    // Create seller, approve them, add a menu item
    // Create customer
    // Get tokens
  });

  it('creates an order and notifies seller', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        seller_id: sellerId,
        items: [{ menu_item_id: menuItemId, quantity: 2 }],
        delivery_address: {
          street: '12 Rue Hassan II',
          city: 'Casablanca',
        },
        payment_method: 'cash',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.status).toBe('pending');
    expect(res.body.data.order.total_amount).toBe(130.00);  // 2 * 65.00
    expect(res.body.data.order.items).toHaveLength(1);
  });

  it('returns 403 when seller places order', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ /* valid order data */ });

    expect(res.status).toBe(403);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({ /* order data */ });

    expect(res.status).toBe(401);
  });
});
```

---

## API Testing

### Postman/Bruno Collection

Maintain a Postman (or Bruno — open source alternative) collection for manual API testing:

```
@ZAY API Collection
├── Auth
│   ├── Register Customer
│   ├── Register Seller
│   ├── Login
│   └── Get Profile
├── Browse
│   ├── Get Categories
│   ├── Browse Items
│   ├── Search Items
│   └── Get Seller Profile
├── Seller
│   ├── Create Menu
│   ├── Add Menu Item
│   ├── Upload Item Image
│   ├── Toggle Availability
│   ├── Get Orders
│   └── Update Order Status
├── Customer
│   ├── Place Order
│   ├── Get Order History
│   ├── Get Order Detail
│   └── Cancel Order
└── Admin
    ├── Admin Login
    ├── Get Pending Sellers
    ├── Approve Seller
    ├── Reject Seller
    └── Get Analytics
```

### Environment Variables in Postman

```json
{
  "baseUrl": "http://localhost:5000/api/v1",
  "customerToken": "{{set after login}}",
  "sellerToken": "{{set after login}}",
  "adminToken": "{{set after login}}"
}
```

### Pre-request Script to Auto-Login

```js
// Postman pre-request script
pm.sendRequest({
  url: pm.environment.get('baseUrl') + '/auth/login',
  method: 'POST',
  header: { 'Content-Type': 'application/json' },
  body: {
    mode: 'raw',
    raw: JSON.stringify({ email: 'test@example.com', password: 'TestPass123!' }),
  },
}, (err, response) => {
  pm.environment.set('customerToken', response.json().data.token);
});
```

---

## Mobile App Testing

### Component Tests (React Native + Jest)

```js
// tests/components/FoodCard.test.js
import { render, fireEvent } from '@testing-library/react-native';
import FoodCard from '../../src/components/food/FoodCard';

const mockItem = {
  id: 'item-1',
  name: 'Tagine Poulet',
  price: 65,
  prep_time_min: 45,
  image_url: 'https://...',
  is_available: true,
  category: { name: 'Tagine', icon: '🥘' },
};

describe('FoodCard', () => {
  it('displays item name and price', () => {
    const { getByText } = render(
      <FoodCard item={mockItem} onPress={jest.fn()} onAddToCart={jest.fn()} />
    );
    expect(getByText('Tagine Poulet')).toBeTruthy();
    expect(getByText('65 MAD')).toBeTruthy();
  });

  it('calls onAddToCart when add button pressed', () => {
    const onAddToCart = jest.fn();
    const { getByTestId } = render(
      <FoodCard item={mockItem} onPress={jest.fn()} onAddToCart={onAddToCart} />
    );
    fireEvent.press(getByTestId('add-to-cart-btn'));
    expect(onAddToCart).toHaveBeenCalledWith(mockItem);
  });
});
```

### Store Tests (Zustand)

```js
// tests/store/cartStore.test.js
import { useCartStore } from '../../src/store/cartStore';

describe('Cart Store', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], total: 0 });
  });

  it('adds item to cart', () => {
    const item = { id: 'item-1', name: 'Tagine', price: 65 };
    useCartStore.getState().addItem(item);

    const { items, total } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(total).toBe(65);
  });

  it('increments quantity for duplicate items', () => {
    const item = { id: 'item-1', name: 'Tagine', price: 65 };
    useCartStore.getState().addItem(item);
    useCartStore.getState().addItem(item);

    const { items } = useCartStore.getState();
    expect(items[0].quantity).toBe(2);
  });

  it('clears cart', () => {
    useCartStore.getState().addItem({ id: 'item-1', name: 'Tagine', price: 65 });
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
```

---

## Test Coverage Goals

| Area | Target Coverage | Priority |
|------|----------------|----------|
| Order service (business logic) | 90% | Critical |
| Auth service | 90% | Critical |
| Middleware (auth, validation) | 85% | High |
| API endpoints (integration) | 80% | High |
| Menu service | 75% | Medium |
| Notification service | 70% | Medium |
| Utility functions | 80% | Medium |
| Admin service | 70% | Medium |
| UI Components | 60% | Low |

**Overall target: 75% line coverage**

Run coverage:
```bash
npm run test:coverage
# Generates coverage/ directory with HTML report
```

---

## Test Data Management

### Test Fixtures

```js
// tests/fixtures/users.js
const createCustomerFixture = (overrides = {}) => ({
  name: 'Test Customer',
  email: `customer_${Date.now()}@test.com`,
  phone: '+212600000001',
  password: 'TestPass123!',
  role: 'customer',
  ...overrides,
});

const createSellerFixture = (overrides = {}) => ({
  name: 'Test Seller',
  email: `seller_${Date.now()}@test.com`,
  password: 'TestPass123!',
  business_name: 'Test Kitchen',
  city: 'Casablanca',
  ...overrides,
});
```

### Database Helpers

```js
// tests/helpers/db.helper.js
const createApprovedSeller = async (pool) => {
  const user = await UserModel.create({ /* seller data */ });
  const seller = await SellerModel.create({ user_id: user.id });
  await SellerModel.updateStatus(seller.id, 'approved');
  const token = generateToken({ id: user.id, role: 'seller' });
  return { user, seller, token };
};
```

---

## Running Tests

```bash
# All tests
npm test

# Watch mode (development)
npm run test:watch

# With coverage
npm run test:coverage

# Integration tests only
npm run test:integration

# Unit tests only
npm run test:unit

# Single file
npm test -- order.service.test.js

# CI mode (no watch, fail on any error)
npm run test:ci
```

### Jest Configuration

```js
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!src/config/**',
  ],
  setupFilesAfterFramework: ['./tests/setup.js'],
  testPathPattern: {
    unit: 'tests/unit',
    integration: 'tests/integration',
  },
  testTimeout: 30000,  // 30s for integration tests with DB
};
```
