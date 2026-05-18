# @ZAY — Testing Strategy

> **Status:** Definitive Testing Strategy — MVP  
> **Audience:** Engineers, QA, tech lead  
> **Supersedes:** `10_TESTING.md` (kept for historical reference)  
> **Goal:** Catch real bugs before users do, without slowing down a 10-week MVP build.

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Coverage Targets & Rationale](#2-coverage-targets--rationale)
3. [Test Pyramid](#3-test-pyramid)
4. [Backend Unit Testing](#4-backend-unit-testing)
5. [Backend Integration Testing](#5-backend-integration-testing)
6. [API Contract Testing](#6-api-contract-testing)
7. [Mobile Testing](#7-mobile-testing)
8. [Admin Dashboard Testing](#8-admin-dashboard-testing)
9. [Manual QA Strategy](#9-manual-qa-strategy)
10. [Performance Testing](#10-performance-testing)
11. [Security Testing](#11-security-testing)
12. [Accessibility Testing](#12-accessibility-testing)
13. [Pre-Production Validation](#13-pre-production-validation)
14. [CI/CD Integration](#14-cicd-integration)
15. [Bug Triage & Severity](#15-bug-triage--severity)
16. [Time Budget for MVP](#16-time-budget-for-mvp)

---

## 1. Testing Philosophy

### Test What Hurts Users Most

A 10-week MVP doesn't have time for testing everything. The team tests the things that, if broken, cause real users real pain:

| Tier | Bug class | Test priority |
|------|-----------|---------------|
| **P0 — Catastrophic** | Order placed but money/food lost; duplicate orders; data leak between users | Maximum priority — multiple layers |
| **P1 — Major** | Customer cannot place an order; seller cannot accept; login broken | High priority — unit + integration |
| **P2 — Annoying** | Wrong field validation message; minor UI glitch; slow page | Medium — manual QA catches |
| **P3 — Cosmetic** | Wrong color shade; minor copy typo | Low — fix when noticed |

This document describes what to test, with what tool, and at what depth — calibrated to the bug class it prevents.

### Three Principles

1. **Test behavior, not implementation.** A test that breaks every time you refactor is a bad test. Test the contract: "given X, returns Y."
2. **Test the boundary, not the middle.** Test inputs to the service layer and outputs from it. Don't unit-test a helper function whose only consumer is one service function — test through the service.
3. **One test failing tells you what's broken.** Bad tests fail in ways that don't pinpoint the bug. Each test asserts one concrete behavior.

### What This Document Does NOT Recommend

- **100% code coverage** — chasing coverage produces brittle tests with low value
- **TDD strictly** — sometimes correct, often a slowdown for prototype-stage work
- **Comprehensive E2E suite** — fragile, slow, expensive to maintain at MVP scale
- **Snapshot testing on UI** — too much false positivity, breaks on every CSS tweak
- **Load testing in production** — only on staging, only with synthetic data

---

## 2. Coverage Targets & Rationale

### Coverage By Layer

| Layer | Statement | Branch | Notes |
|-------|-----------|--------|-------|
| Backend services | 80% | 75% | Business logic — high risk |
| Backend models | 50% | — | Mostly SQL, covered by integration tests |
| Backend utils | 90% | 85% | Pure functions — easy to test |
| Backend middleware | 70% | 60% | Auth, validation, error handling |
| Backend controllers | 30% | — | Thin wrappers, covered by integration tests |
| Mobile components/ui | 60% | 50% | Primitive components only |
| Mobile screens | 0% — manual QA | — | E2E manual; component testing too brittle |
| Mobile hooks | 75% | 65% | Business-relevant logic |
| Admin components/ui | 0% | — | Stock shadcn primitives |
| Admin pages | 40% | — | Mostly data display; light tests |

### Why Not 100%

A 100% coverage target produces:
- Tests for getters/setters that can't fail
- Tests for one-line wrappers
- Tests that re-implement the implementation
- Engineering hours spent on uncovered branches that don't matter

We target what catches real bugs. Untested code is acceptable if it's:
- Trivially correct (single-expression functions, type definitions)
- Already covered indirectly (controllers via integration tests)
- Visually verified (admin presentation components)

### The Coverage Threshold in CI

`backend/jest.config.js` enforces:
```
coverageThreshold: {
  global: { statements: 75, branches: 70, lines: 75, functions: 75 }
}
```

A PR that drops coverage below threshold fails CI. The threshold is for the **global** metric, not per-file — this lets us have 0%-covered config files and 95%-covered service files balance out.

---

## 3. Test Pyramid

```
                        ┌──────────────┐
                        │              │   Manual QA + smoke tests
                        │   Manual     │   Real device testing
                        │              │   Pre-prod validation
                        └──────────────┘
                      ┌─────────────────┐
                      │                 │  Backend integration tests (Supertest + real DB)
                      │  Integration    │  Mobile screen tests (with mocked API)
                      │                 │  Admin page tests
                      └─────────────────┘
                ┌─────────────────────────┐
                │                         │  Backend service unit tests (Jest, mocked models)
                │       Unit Tests        │  Util function tests
                │                         │  Component tests (mobile + admin)
                └─────────────────────────┘
```

### Why a Pyramid, Not an Inverted Pyramid

E2E tests are the most expensive form of testing — they run slowest, break most often (flaky), and pinpoint bugs least precisely. Unit tests are fast, stable, and surgical.

The pyramid is the right shape because:
- 100 unit tests run in 3 seconds
- 50 integration tests run in 30 seconds
- 10 E2E tests run in 5 minutes (and fail intermittently)

For MVP, we explicitly **skip E2E automation** — manual QA covers the integrated end-to-end flow. Phase 2 may introduce Detox for mobile and Playwright for admin.

---

## 4. Backend Unit Testing

### Stack

- **Test runner:** Jest 29
- **Assertion library:** Jest's built-in `expect`
- **Mocking:** Jest's `jest.mock` and `jest.fn`

### What to Unit Test

The **service layer** is the prime target — it contains all business logic, all the conditional code, all the rules.

| Service | What to test |
|---------|--------------|
| `AuthService` | Password hashing, login timing-safe behavior, JWT signing, seller registration transaction |
| `OrderService` | All transition validations, cross-seller order rejection, server-side total calculation, ownership checks, idempotency, auto-cancel logic |
| `NotificationService` | Two-track delivery (DB always succeeds even when FCM fails), notification type → recipient mapping, FCM error handling |
| `UserService` | Active-orders-block-deletion check |
| `SellerService` | Approve/reject/suspend state transitions |
| `AdminService` | Force-cancel state transition rules |

### Mocking Strategy

Mock the model layer entirely. The service layer should never touch a real database in unit tests:

```
jest.mock('../../../src/models/order.model');
jest.mock('../../../src/models/seller.model');
jest.mock('../../../src/services/notification.service');

// Set return values per test
OrderModel.findById.mockResolvedValue({ id: '...', status: 'pending', ... });
```

This isolates the service logic from DB behavior. A test failure pinpoints a service bug, not a SQL syntax issue.

### Critical Test Cases — OrderService.createOrder

```
✓ Successfully creates order with valid items from one seller
✓ Calculates total_amount server-side, ignoring client-provided total
✓ Rejects when seller is_open = false (SELLER_CLOSED)
✓ Rejects when seller status != 'approved'
✓ Rejects when any item is_available = false (UNPROCESSABLE)
✓ Rejects when items belong to multiple sellers (CROSS_SELLER_ORDER)
✓ Rejects when item quantity exceeds max (validation)
✓ Calls NotificationService.notifyOrderPlaced after creation
✓ Fires socket event after creation
✓ Returns the created order with items array populated
✓ Handles DB transaction rollback on error
✓ Idempotency key reuse returns existing order
```

That's 12 test cases for one function. Each is small (~10-20 lines). Total: ~200 lines of test code. Catches every business-rule bug.

### Critical Test Cases — AuthService.login

```
✓ Successfully logs in valid customer
✓ Successfully logs in valid approved seller
✓ Returns generic error for wrong password (no enumeration)
✓ Returns generic error for non-existent email (timing-safe via DUMMY_HASH)
✓ Rejects login for suspended account (ACCOUNT_SUSPENDED)
✓ Includes seller_status in JWT for seller role
✓ Does NOT include password_hash in response
✓ JWT is signed with HS256 algorithm
✓ JWT expiry matches configured JWT_EXPIRES_IN
```

### What NOT to Unit Test

- Controllers (one-liners — covered by integration tests)
- Routes (configuration — covered by integration tests)
- Models (covered by integration tests with real DB)
- Config files
- Type definitions

### Test File Structure

```
tests/unit/services/order.service.test.js

describe('OrderService', () => {
  describe('createOrder', () => {
    let user, validInput;

    beforeEach(() => {
      jest.clearAllMocks();
      user = { id: 'user-1', role: 'customer' };
      validInput = { seller_id: 'seller-1', items: [...], delivery_address: {...} };
    });

    it('creates order with valid input', async () => { ... });
    it('rejects when seller is closed', async () => { ... });
    // ...
  });

  describe('updateOrderStatus', () => {
    it('rejects invalid transitions', async () => {
      const order = { status: 'delivered', seller_id: 'seller-1' };
      OrderModel.findById.mockResolvedValue(order);

      await expect(
        OrderService.updateOrderStatus('order-1', sellerUser, { status: 'accepted' })
      ).rejects.toThrow(AppError);
      await expect(
        OrderService.updateOrderStatus('order-1', sellerUser, { status: 'accepted' })
      ).rejects.toMatchObject({ code: 'INVALID_TRANSITION', statusCode: 422 });
    });
  });
});
```

### Test Helpers

`tests/helpers/fixtures.js` — factory functions for test data:

```
const buildUser = (overrides = {}) => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'customer',
  status: 'active',
  ...overrides,
});

const buildSeller = (overrides = {}) => ({ ... });
const buildOrder = (overrides = {}) => ({ ... });
```

Factories make tests readable and reduce duplication. Override only what matters for that specific test.

---

## 5. Backend Integration Testing

### Stack

- **HTTP client:** Supertest
- **Test DB:** Real PostgreSQL (separate test database)
- **Database setup:** Run migrations + seed before each test file
- **Cleanup:** Truncate tables after each test (NOT drop — too slow)

### Test Database Setup

```
DATABASE_URL=postgresql://zay_user:test@localhost:5432/zay_test
```

A separate Postgres database, recreated from migrations on every CI run:

```
// tests/integration/setup.js
beforeAll(async () => {
  await runMigrations(testPool);
});

afterEach(async () => {
  await truncateAllTables(testPool);
});

afterAll(async () => {
  await testPool.end();
});
```

`truncateAllTables()` is far faster than dropping/recreating — typically <50ms.

### What to Integration Test

The **critical paths** end-to-end:

1. **Auth flow:** register → login → use token on protected route → logout
2. **Customer order flow:** browse → place order → fetch order → cancel
3. **Seller order flow:** seller registration → admin approves → seller accepts order → updates status → marks delivered
4. **Authorization:** customer cannot access seller routes, seller cannot access admin routes, suspended users get 403
5. **Validation:** required fields, format constraints, length limits
6. **Idempotency:** duplicate POST /orders with same Idempotency-Key returns same response
7. **Ownership:** customer A cannot view customer B's order

### Sample Integration Test

```
// tests/integration/auth.test.js

describe('POST /api/v1/auth/register', () => {
  it('creates a customer account and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Fatima',
        email: 'fatima@example.com',
        phone: '+212612345678',
        password: 'StrongPass1!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('fatima@example.com');
    expect(res.body.data.user.password_hash).toBeUndefined();  // not leaked
    expect(res.body.data.token).toBeDefined();

    // Verify it actually inserted
    const user = await UserModel.findByEmailWithPassword('fatima@example.com');
    expect(user).toBeDefined();
    expect(user.password_hash).toBeDefined();
    expect(user.password_hash).not.toBe('StrongPass1!');  // hashed
  });

  it('rejects duplicate email with 409', async () => { ... });
  it('rejects invalid phone format', async () => { ... });
  it('rejects weak password', async () => { ... });
});
```

### Database Assertions

After every mutation, integration tests verify the DB state. The HTTP response is one assertion; the DB row is another. Both must be correct.

### Don't Mock in Integration Tests

Integration tests use the real DB, real Express app, real middleware pipeline. The only acceptable mocks:

- **NotificationService** (we don't actually send FCM in tests — mock `messaging.send`)
- **UploadService** (don't upload to Cloudinary — mock `uploader.upload_stream`)
- **System time** (use `jest.useFakeTimers()` for date-dependent tests)

Everything else is real. This is the value of integration testing.

### Test Suite Organization

```
tests/integration/
├── setup.js              # global beforeAll, afterEach, afterAll
├── helpers/
│   ├── auth.helpers.js   # createCustomer, createSeller, getToken
│   ├── order.helpers.js  # createOrder fixtures
│   └── fixtures.js
├── auth.test.js          # /auth/* endpoints
├── browse.test.js        # public browse endpoints
├── orders.test.js        # customer order endpoints
├── seller.test.js        # /seller/* endpoints
├── admin.test.js         # /admin/* endpoints
├── notifications.test.js # /notifications/* endpoints
└── e2e-order-lifecycle.test.js  # full happy-path flow
```

The last file is a single test that goes through the entire order lifecycle as one connected scenario — the closest thing to E2E for backend.

### Performance

Integration tests should run in **< 2 minutes** for the full suite. If tests grow slow:
- Parallelize with `--maxWorkers=2`
- Use Postgres `UNLOGGED TABLES` for test schema (no WAL writes — 2-3× faster)
- Truncate, don't drop

---

## 6. API Contract Testing

### Postman / Bruno Collections

A maintained collection lets QA, mobile, and admin engineers explore the API without reading code.

**Bruno (recommended) or Postman:**
- One folder per resource: Auth, Users, Browse, Orders, Seller, Notifications, Admin
- Each request includes example body, expected response, environment variables
- Pre-request scripts set Authorization headers automatically
- Tests inside the collection verify response shape

### Environments

```
Local       → http://localhost:5000/api/v1
Staging     → https://api-staging.zay.ma/api/v1     (Phase 2)
Production  → https://api.zay.ma/api/v1             (read-only smoke tests)
```

### Pre-Request Script (Token Management)

```
// runs before every request in the collection
if (!pm.environment.get("token")) {
  const res = await pm.sendRequest({
    url: pm.environment.get("baseUrl") + "/auth/login",
    method: "POST",
    body: { email: pm.environment.get("testEmail"), password: pm.environment.get("testPassword") },
  });
  pm.environment.set("token", res.json().data.token);
}
pm.request.headers.add({ key: "Authorization", value: "Bearer " + pm.environment.get("token") });
```

### Contract Verification

Each request in the collection has post-response tests:

```
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Response has success: true", () => {
  pm.expect(pm.response.json().success).to.eql(true);
});
pm.test("Order has required fields", () => {
  const order = pm.response.json().data.order;
  pm.expect(order).to.have.property("id");
  pm.expect(order).to.have.property("status");
  pm.expect(order).to.have.property("total_amount");
  pm.expect(order.password_hash).to.be.undefined;  // never leaked
});
```

### When to Use API Tests vs Integration Tests

- **Integration tests (Supertest)** — automated, run in CI, prevent regressions
- **API tests (Postman/Bruno)** — manual exploration, debugging, documentation of behavior

The Postman collection is documentation as much as it is testing. Onboarding a new mobile engineer? Hand them the collection.

---

## 7. Mobile Testing

### Stack

- **Test runner:** Jest (with Expo's jest-expo preset)
- **Component testing:** React Native Testing Library (RNTL)
- **Mocking:** Jest's built-in
- **E2E:** None for MVP (deferred to Phase 2 with Detox)

### What to Test on Mobile

#### Component Tests (Primitives Only)

UI primitives in `components/ui/`:

```
✓ <Button> renders label
✓ <Button> calls onPress when tapped
✓ <Button variant="primary"> applies primary styles
✓ <Button disabled> does not call onPress
✓ <Button loading> shows spinner instead of label
✓ <Input> updates value via onChangeText
✓ <Input error> renders error state
✓ <PhoneInput> formats +212XXX value correctly
✓ <PriceInput> rejects non-numeric input
```

#### Hook Tests (Business-Relevant Hooks)

```
✓ useCart.addItem appends to items[]
✓ useCart.addItem from different seller prompts confirmation
✓ useCart.subtotal computes correctly
✓ useDebounce delays value updates
✓ useOrderUpdates subscribes/unsubscribes on focus
```

#### Domain Components

```
✓ <OrderStatusBadge status="pending"> renders amber color + clock icon + "Pending" label
✓ <OrderCard> shows status badge + price + relative time
✓ <SellerCard> shows "Closed" badge when is_open = false
```

### What NOT to Test on Mobile

- Whole screens (too much mocking required, brittle)
- Navigation transitions (RNTL is poor at navigation)
- Real API calls (use manual QA)
- Visual appearance (use real-device testing instead)

### Sample Component Test

```
// components/ui/__tests__/Button.test.tsx

import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders label', () => {
    const { getByText } = render(<Button>Place Order</Button>);
    expect(getByText('Place Order')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button onPress={onPress}>Place Order</Button>);
    fireEvent.press(getByText('Place Order'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button disabled onPress={onPress}>Place Order</Button>);
    fireEvent.press(getByText('Place Order'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows spinner when loading', () => {
    const { queryByText, getByTestId } = render(<Button loading>Place Order</Button>);
    expect(queryByText('Place Order')).toBeNull();
    expect(getByTestId('button-spinner')).toBeTruthy();
  });
});
```

### Device Testing Matrix

Real-device testing is critical — emulators miss real bugs:

| Device | OS | Why |
|--------|----|----|
| iPhone 12 / 13 | iOS 16+ | Mid-range iPhone — most common iOS device in Morocco |
| iPhone SE 2 | iOS 16+ | Small screen, tight budget — common in Morocco |
| iPhone 14 Pro | iOS 17 | Latest hardware + Dynamic Island |
| Samsung Galaxy A52 | Android 13 | Most common Android in Morocco (~30% market share) |
| Xiaomi Redmi Note 11 | Android 12 | Xiaomi has unreliable FCM — Amendment 5 of architecture |
| Low-end Android (4GB RAM) | Android 11 | Test memory pressure, slow startup |

Test each major release on at least one iOS and one Android device. Test FCM specifically on Xiaomi (known problem).

### Snapshot Testing

**Not used.** Snapshot tests produce noise: every CSS tweak fails snapshots, leading to "snapshot rot" where developers blindly accept changes. Visual regression testing (Phase 2 with Chromatic or Percy) is the better answer.

### Storybook (Phase 2)

A component playground for designers and engineers. Not in MVP scope — adds setup time without immediate value at 15 reusable components.

---

## 8. Admin Dashboard Testing

### Stack

- **Test runner:** Vitest (Vite-native, faster than Jest for Vite projects)
- **Component testing:** React Testing Library (RTL)
- **API mocking:** MSW (Mock Service Worker)

### What to Test on Admin

Even less than mobile — the admin is mostly data display, and admins are internal users who can report bugs directly.

#### Critical Paths Only

```
✓ Login page submits credentials and stores token
✓ Sellers list renders rows from API response
✓ Approve seller mutation invalidates queries
✓ Reject seller form validates required reason (10+ chars)
✓ Force cancel order form validates required reason
```

#### Components Worth Testing

```
✓ <DataTable> renders rows
✓ <DataTable> shows skeleton when isLoading
✓ <DataTable> shows empty state when items=[]
✓ <DataTablePagination> emits page change events
✓ <ConfirmDialog> calls onConfirm only after typed confirmation (Phase 2)
```

### MSW for API Mocking

```
const handlers = [
  http.get('/api/v1/admin/sellers', () => HttpResponse.json({
    success: true,
    data: { items: [/* mock sellers */], pagination: {...} },
  })),
  http.patch('/api/v1/admin/sellers/:id/approve', () => HttpResponse.json({
    success: true,
    data: { seller: {/* approved seller */} },
  })),
];
```

MSW intercepts fetch/axios at the network layer — components don't know they're talking to mocks.

### Skip Testing

- shadcn/ui primitives (they're already tested upstream)
- Layout components (tested by virtue of being visible during use)
- Animations
- Theme tokens

### Manual Coverage Compensates

Admin has fewer automated tests because admins use it daily. Bug reports come fast.

---

## 9. Manual QA Strategy

### When Manual QA Runs

| Trigger | Type | Time |
|---------|------|------|
| New feature merged to `develop` | Feature QA | 30-60 min |
| Before any production release | Smoke + Regression | 60-90 min |
| Hotfix candidate | Smoke + affected paths | 20 min |
| Major release | Full QA pass | Half day |

### Smoke Test Checklist (Run Before Every Release)

The minimum to confirm "everything basic works." Run on iOS + Android + admin.

**Authentication:**
- [ ] Customer can register
- [ ] Seller can register (status: pending)
- [ ] Customer can log in
- [ ] Logout clears session and redirects to AuthStack
- [ ] Invalid credentials show "Invalid email or password"
- [ ] Token persistence: close + reopen app → still logged in
- [ ] Expired token: receive 401 → redirected to login

**Browse:**
- [ ] HomeScreen loads categories and featured items
- [ ] Tapping a category shows items
- [ ] Tapping an item shows detail with price + photo + description
- [ ] Tapping a seller shows their profile + menus

**Cart & Order:**
- [ ] Add item to cart → cart badge updates
- [ ] Cart screen shows correct subtotal
- [ ] Remove item from cart
- [ ] Adding item from different seller prompts confirmation
- [ ] Place order with valid address succeeds
- [ ] Order appears in order history
- [ ] Order detail shows pending status

**Real-time:**
- [ ] On a second device as seller, accept the order
- [ ] Customer's OrderDetailScreen updates within 2 seconds (socket)
- [ ] Customer receives push notification (background app)

**Seller flow:**
- [ ] Approved seller logs in → DashboardScreen
- [ ] Pending seller sees PendingApprovalScreen
- [ ] Seller toggles "Open/Closed"
- [ ] Seller creates a menu
- [ ] Seller adds an item with image
- [ ] Seller marks an item as unavailable
- [ ] Seller accepts an order with ETA
- [ ] Seller cancels an order with reason

**Admin:**
- [ ] Admin logs in
- [ ] Sellers list filters by status (pending tab)
- [ ] Admin approves a pending seller → FCM arrives on seller's device
- [ ] Admin rejects with reason → seller sees Rejected screen on next launch
- [ ] Admin force-cancels an order → customer + seller notified

**Edge cases:**
- [ ] Place order works offline → shows "no connection" toast
- [ ] FCM token registers correctly on app launch
- [ ] Image upload progress shown during slow upload
- [ ] Auto-cancel cron fires after 30 min (verify via DB inspection)

### Role-Based QA Checklists

Each role gets a dedicated checklist focused on their flows.

**Customer Role — 22 items**
**Seller Role (Approved) — 18 items**
**Seller Role (Pending/Rejected/Suspended) — 8 items**
**Admin Role — 16 items**

(Full checklists maintained as living documents in `qa/checklists/` — not duplicated in this architecture doc.)

### Regression Checklist

Beyond the smoke test, the regression checklist covers things that have broken before:

- [ ] Multi-seller cart conflict prompt
- [ ] Phone number formatting on input
- [ ] Bottom-anchored CTA on small screens (iPhone SE)
- [ ] FCM on Xiaomi devices
- [ ] Login on slow network (timeout handling)
- [ ] Image upload while in airplane mode
- [ ] Token expiry mid-session

This list grows after every production bug. New bug found in prod = new regression test added.

### Bug Report Template

```
**Title:** [P0/P1/P2/P3] Brief description

**Environment:** iOS 17 / iPhone 14 Pro / app v1.0.3
**User role:** Customer

**Steps to reproduce:**
1. ...
2. ...
3. ...

**Expected:** ...
**Actual:** ...

**Screenshot/video:** ...

**Request ID:** (from response header or Sentry trace)
**Logs:** (paste from VPS if relevant)
```

---

## 10. Performance Testing

### Backend Load Testing

#### Tool: k6

k6 is a JavaScript-based load testing tool — easy to write, runs as a binary, no JVM required.

#### Pre-Launch Load Test

```
// load/order-placement.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // ramp to 10 users
    { duration: '3m', target: 50 },   // sustain 50 users
    { duration: '1m', target: 100 },  // spike to 100
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% under 500ms
    http_req_failed: ['rate<0.01'],      // <1% errors
  },
};

export default function () {
  const res = http.post(`${__ENV.BASE_URL}/api/v1/auth/login`, ...);
  check(res, { 'login 200': (r) => r.status === 200 });
  sleep(1);

  // Browse + place order flow
  // ...
}
```

#### Performance Targets

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| GET /health | < 10ms | < 30ms | < 100ms |
| POST /auth/login | < 200ms | < 500ms | < 1s |
| GET /browse/items | < 100ms | < 300ms | < 800ms |
| POST /orders | < 300ms | < 800ms | < 2s |
| PATCH /seller/orders/:id/status | < 100ms | < 300ms | < 600ms |

These are MVP targets on a 4GB VPS. Phase 2 targets tighten by ~30%.

#### When to Load Test

- **Pre-launch:** baseline numbers established
- **After major schema changes:** verify no regressions
- **After scaling decisions:** before upgrading VPS, before adding cache
- **Quarterly:** track gradual degradation

**Never run load tests against production with real user traffic.** Always on staging or a dedicated load-test environment.

### Database Query Performance

#### EXPLAIN ANALYZE Discipline

For every new query that hits the orders, menu_items, or browse tables, run:

```
EXPLAIN ANALYZE
SELECT mi.*, sp.business_name
FROM menu_items mi
JOIN menus m ON mi.menu_id = m.id
JOIN seller_profiles sp ON m.seller_id = sp.id
WHERE mi.is_available = TRUE
  AND sp.city = 'Casablanca'
ORDER BY mi.created_at DESC
LIMIT 20;
```

Check the plan:
- Is the query using indexes? (`Index Scan` or `Bitmap Index Scan`)
- Is there a sequential scan? (Bad on large tables)
- Total execution time should be < 50ms at MVP scale, < 200ms at 10K DAU

#### Slow Query Logging

Production Postgres logs queries > 1s automatically:

```
log_min_duration_statement = 1000  # milliseconds
```

Review the slow query log weekly. Add indexes or rewrite queries as needed.

#### N+1 Query Detection

The biggest performance trap. The order endpoint must use a single query with JOINs, not a loop:

```
❌ Bad:
  const order = await OrderModel.findById(id);
  for (const item of order.items) {
    item.menu_item = await ItemModel.findById(item.menu_item_id);  // N+1!
  }

✅ Good:
  const order = await OrderModel.findByIdWithItems(id);  // single JOIN query
```

Code review checklist explicitly checks for loops with awaited DB calls.

### Mobile Performance

#### FPS Monitoring

React Native dev tools include FPS overlay. Target: **60 FPS** during scrolling, gestures, and animations.

Common FPS killers:
- Large FlatList without virtualization
- Unmemoized list items re-rendering
- Images loaded without size constraints
- Animations on the JS thread (use Reanimated)

#### Memory Profiling

Real-device profiling via Flipper or React Native's built-in tools:

- Memory warnings → reduce image cache size
- Memory growth over time → check for socket listeners not cleaned up
- Crashes on low-end Android → reduce in-memory cache aggression

#### Bundle Size

```
expo export --platform ios     # check JS bundle size
```

Target: **< 5 MB JS bundle**. Larger → audit dependencies:
- Tree-shake icon libraries (`lucide-react` good, full `@fortawesome` bad)
- Use date-fns over moment (smaller)
- Avoid full lodash (`import { debounce } from 'lodash-es'`)

#### App Start Time

Target: **< 3 seconds** cold start on iPhone SE 2 and equivalent Android.

Optimization levers:
- Hermes engine enabled (default in Expo 50+)
- Lazy load screens not in initial route
- Defer non-critical SDK initialization (analytics, Sentry — initialize on first interaction)

### Admin Performance

Less critical (internal tool) but track:
- Page load < 2 seconds on dashboard
- Table render < 500ms for 50 rows
- Search debounce 300ms (prevents URL thrashing)

---

## 11. Security Testing

### Automated Security Scans

#### npm audit (in CI)

```
.github/workflows/backend-ci.yml:
  - run: npm audit --audit-level=high
```

Fails the build on high or critical vulnerabilities. Medium and low logged for awareness.

#### Dependabot (GitHub)

Configured in `.github/dependabot.yml` — auto-opens PRs for vulnerable dependencies. Merge after CI passes.

### Manual Security Tests

Before launch, attempt to break the system from a malicious user's perspective. Document each attempt and result.

#### Authentication

- [ ] Try login with wrong password 100 times → expect rate limit at 10
- [ ] Try valid token after logout → expect 401
- [ ] Try forging JWT with `alg: none` → expect rejection (algorithm pinned)
- [ ] Try JWT signed with admin secret on user route → expect 401
- [ ] Try expired token → expect 401 TOKEN_EXPIRED
- [ ] Try token for suspended user → expect 403

#### Authorization

- [ ] Customer A tries `GET /orders/<customer B's order>` → expect 404 (not 403, to avoid existence leak)
- [ ] Seller tries `PATCH /seller/orders/<other seller's order>/status` → expect 404
- [ ] Customer tries `POST /admin/sellers/<id>/approve` → expect 403
- [ ] Pending seller tries `POST /menus` → expect 403 SELLER_NOT_APPROVED
- [ ] Approved seller tries access to a different seller's menus → expect 404 on the menu

#### Input Validation

- [ ] SQL injection: `POST /auth/login { email: "' OR 1=1 --" }` → no SQL error leaked
- [ ] Extra fields ignored: `POST /orders { ..., is_admin: true }` → field stripped
- [ ] Oversized body: `POST /auth/register` with 100KB body → 400 BAD_REQUEST
- [ ] Invalid UUID in URL: `GET /orders/not-a-uuid` → 400 VALIDATION_ERROR
- [ ] Total amount injection: `POST /orders { ..., total_amount: 0.01 }` → server recalculates, ignores
- [ ] XSS in user fields: `name: "<script>alert(1)</script>"` → stored as-is but never rendered as HTML

#### Rate Limiting

- [ ] Send 11 login attempts in 15 min → 11th returns 429
- [ ] Send 21 image uploads in 1 hour → 21st returns 429
- [ ] Send 301 requests in 15 min → 301st returns 429

#### File Upload

- [ ] Upload 10MB image → 400 FILE_TOO_LARGE
- [ ] Upload .exe with image extension → mimetype check rejects
- [ ] Upload malformed image (zip renamed to .jpg) → multer/Cloudinary rejects

#### Information Disclosure

- [ ] Error response in production does NOT contain stack trace
- [ ] User object in any response does NOT contain `password_hash`
- [ ] Notification response does NOT contain `fcm_token` or `fcm_error`
- [ ] Health endpoint does NOT reveal Node version or DB version

### OWASP Top 10 Coverage

Cross-reference against [`09_SECURITY.md`](09_SECURITY.md). Each Top 10 risk has a corresponding test or architectural protection:

| OWASP 2021 | Defense | Test |
|------------|---------|------|
| A01 Broken Access Control | Ownership checks in services | Auth tests above |
| A02 Cryptographic Failures | bcrypt 12, JWT HS256, HTTPS | Manual review |
| A03 Injection | Parameterized queries, Joi validation | SQL injection test |
| A04 Insecure Design | Architecture review | This document + CTO critique |
| A05 Security Misconfiguration | Helmet, CORS whitelist, ENV validation | Manual review |
| A06 Vulnerable Components | npm audit in CI | Automated |
| A07 Auth Failures | Rate limiting, bcrypt, generic errors | Auth tests |
| A08 Software Integrity Failures | Pinned dependencies, image registry | Manual review |
| A09 Logging Failures | Winston structured logs, Sentry | Review log output |
| A10 SSRF | No outbound user-controlled URLs | Manual review |

### Penetration Testing

Out of scope for MVP. Phase 2 trigger: at 5,000 DAU or before launching online payment, contract an external security firm for a full pentest. Budget: $3,000-$8,000.

---

## 12. Accessibility Testing

### Tools

- **iOS:** VoiceOver, Accessibility Inspector (Xcode)
- **Android:** TalkBack, Accessibility Scanner (Google app)
- **Admin:** axe DevTools browser extension, Lighthouse Accessibility audit

### MVP Accessibility Checklist

Per `14_DESIGN_SYSTEM.md` §21, the targets are WCAG 2.1 AA. Pre-launch verification:

**Color contrast:**
- [ ] All body text meets 4.5:1 (run axe on all admin pages)
- [ ] All large text meets 3:1
- [ ] No information conveyed by color alone (status uses color + icon + label)

**Touch targets:**
- [ ] All buttons ≥ 44pt × 44pt (mobile)
- [ ] All interactive list rows ≥ 44pt tall (mobile)
- [ ] Sufficient spacing between adjacent tap targets

**Screen reader:**
- [ ] VoiceOver reads order placement flow correctly
- [ ] TalkBack reads seller approval flow correctly
- [ ] All icon-only buttons have accessibilityLabel
- [ ] Form errors announced via accessibilityLiveRegion

**Dynamic type:**
- [ ] iOS XXL text size doesn't break layouts
- [ ] Android 200% font scale doesn't break layouts
- [ ] Critical info (price, status) never truncated

**Reduced motion:**
- [ ] iOS reduce-motion setting respected (no slide animations)
- [ ] Toast appears instantly when reduce-motion is on

**Keyboard navigation (admin):**
- [ ] Tab order is logical
- [ ] Focus indicators visible on all interactive elements
- [ ] Esc closes any open dialog
- [ ] No keyboard traps (Tab cycles through everything)

### Color Blindness Check

Pass screenshots of key screens (OrderDetail, Seller Approval table) through:
- **Stark** (Figma plugin)
- **Sim Daltonism** (macOS)

Verify status badges remain distinguishable in Protanopia, Deuteranopia, and Tritanopia simulations. If two badges become identical: add an icon difference.

---

## 13. Pre-Production Validation

### After Every Backend Deploy

Automated smoke tests run via GitHub Actions immediately after deploy:

```
.github/workflows/post-deploy-smoke.yml:

1. Wait 30s for container to be healthy
2. GET /api/v1/health → expect 200
3. POST /api/v1/auth/login with test admin credentials → expect 200
4. GET /api/v1/admin/sellers (with token) → expect 200
5. If any step fails: trigger rollback workflow
```

This is the **deploy verification gate** — production isn't "live" until smoke tests pass.

### After Every Mobile Release

Manual smoke (5 minutes per platform):

- [ ] Cold-start app
- [ ] Log in with test account
- [ ] Browse home screen
- [ ] Place test order
- [ ] Receive push notification
- [ ] Verify Sentry captured no errors

### Canary Releases (Phase 2)

For now, all-or-nothing deploys. Phase 2 considerations:

- **Backend:** route 10% of traffic to new version for 1 hour before full rollout
- **Mobile:** EAS Update has gradual rollout (10% → 50% → 100% over 48 hours)
- **Admin:** rollout to internal users for a day before external admins

### Data Integrity Checks (Daily)

A nightly cron job verifies invariants:

```
# Run via cron at 03:00 UTC

✓ No orders with status='delivered' and delivered_at IS NULL
✓ No orders with negative total_amount
✓ No order_items where subtotal != price * quantity (DB CHECK should prevent, verify anyway)
✓ All approved sellers have non-null approved_at
✓ No users with conflicting status (suspended + active)
✓ Foreign key integrity (no orphaned order_items)
```

If any check fails: alert engineering. These shouldn't happen — when they do, it's evidence of a code bug.

### Rollback Readiness

Every production deploy is rollback-able within 5 minutes:

```
ssh prod-vps
cd /opt/zay
echo "VERSION=<previous-sha>" > .env
docker compose pull api && docker compose up -d api
```

Previous Docker image is always available in ghcr.io. Database migrations should be **forward-compatible**: avoid breaking changes that require downtime to roll back (drop columns are bad; deprecate then drop later is good).

---

## 14. CI/CD Integration

### Backend CI (Every PR + Every Push to main)

```
1. Lint           (~30s)   npm run lint
2. Unit tests     (~30s)   npm run test:unit
3. Integration    (~90s)   npm run test:integration (with postgres service)
4. Coverage gate  (~5s)    check threshold ≥ 75%
5. Security audit (~10s)   npm audit --audit-level=high
6. Build          (~60s)   docker build (cached layers)

Total: ~4 minutes when cached, ~7 minutes cold.
```

A failed step blocks the PR from merging.

### Mobile CI (Every PR)

```
1. Lint           npm run lint
2. Type check     npx tsc --noEmit
3. Unit tests     npm test (jest with jest-expo preset)
4. Bundle size    expo export + check size < 5MB
```

EAS Build only runs on tag pushes, not every PR (build minutes are limited on free tier).

### Admin CI (Every PR)

```
1. Lint           npm run lint
2. Type check     tsc --noEmit
3. Unit tests     vitest run
4. Build          vite build (catches build errors)
```

### Test Reports

CI publishes results as PR comments:

```
✅ Backend: 142/142 tests passing
✅ Coverage: 78% lines (above 75% threshold)
⚠️ Mobile: 23/24 tests passing — 1 failure in <Button> snapshot
❌ Admin: TypeScript error in pages/orders/columns.tsx:43
```

Engineers see failures inline on their PR — don't need to dig into CI logs for common cases.

---

## 15. Bug Triage & Severity

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **P0** | Catastrophic — data loss, security breach, full outage | Drop everything. Patch within 2 hours. |
| **P1** | Major — core flow broken (cannot place order, cannot log in) | Patch within 24 hours. Hotfix release. |
| **P2** | Significant — secondary feature broken, workaround exists | Next scheduled release. |
| **P3** | Minor — UI glitch, typo, cosmetic issue | Backlog. Fix when convenient. |

### Triage Workflow

```
Bug reported
   │
   ▼
Triage owner (rotates daily)
   │
   ├─ P0 → Page on-call + create hotfix branch immediately
   ├─ P1 → Assign to next sprint, mark as blocking
   ├─ P2 → Add to backlog, prioritize in next planning
   └─ P3 → Add to backlog, label as "good first issue" or "polish"
```

### Production Incident Response

For P0 incidents:

1. **Acknowledge** within 15 minutes (Slack message, "I'm on it")
2. **Investigate** — Sentry, logs, DB state, recent deploys
3. **Mitigate** — rollback if recent deploy, hotfix patch if not
4. **Communicate** — update internal channel every 30 minutes
5. **Resolve** — verify smoke tests pass post-fix
6. **Post-mortem** — within 48 hours, document root cause + prevention

### Post-Mortem Template

```
**Incident:** Order placement returned 500 for 12 minutes
**Detected:** 2024-05-18 14:32 via Sentry alert
**Resolved:** 2024-05-18 14:44 by rollback
**Impact:** ~30 customers experienced order failure; no data loss

**Timeline:**
14:30 Deploy v1.2.3 to production
14:32 Sentry alert: 500 error rate spike
14:35 Engineer acknowledges
14:38 Identified: missing migration in deploy
14:41 Rollback executed
14:44 Smoke tests pass, fully recovered

**Root cause:**
Migration 014_add_estimated_ready_at.sql was committed but not run
because the deploy script didn't include migrate.js step.

**Prevention:**
1. Dockerfile already runs migrations on startup — verify this is in prod-compose.
2. Add post-deploy smoke test for new feature (estimated_ready_at field).
3. Document in deploy runbook: every deploy must verify migration ran.
```

---

## 16. Time Budget for MVP

A realistic time allocation across the 10-week MVP sprint:

| Activity | Time per week | Total |
|----------|---------------|-------|
| Write unit tests alongside features | ~10% of feature time | ~30 hours |
| Write integration tests for new endpoints | ~15% of feature time | ~40 hours |
| Manual QA per release | 2-3 hours × ~6 releases | ~15 hours |
| Bug triage & fixes | ~5% of total | ~15 hours |
| Pre-launch security audit | One-shot | 8 hours |
| Pre-launch load test | One-shot | 6 hours |
| Pre-launch accessibility check | One-shot | 6 hours |
| Set up test infrastructure (CI, fixtures) | Week 1 | 12 hours |
| **Total** | | **~130 hours** |

For a 2-engineer team over 10 weeks (~800 engineering hours), testing is **~16% of the total budget**. Industry benchmark for shipping-quality MVPs: 15-25%.

### What's Cut from Testing for MVP

| Cut | Why | When to add |
|-----|-----|-------------|
| E2E mobile tests (Detox) | Setup cost > benefit at MVP scale | Phase 2 once flows are stable |
| Visual regression (Chromatic) | Adds CI complexity | Phase 2 with Storybook |
| Pentest | Out-of-pocket cost | Before online payment ships (Phase 2) |
| Real-device farm (BrowserStack) | $40/month, can borrow devices | Phase 2 when team ≥ 4 |
| Synthetic monitoring (Datadog) | $$ per check | Phase 3 at scale |
| Mutation testing | Long runtime, marginal value | Never for this app |

### What Cannot Be Cut

- Unit tests for OrderService — order bugs ruin trust
- Integration tests for auth — security non-negotiable
- Manual smoke before every release — eyes on the product
- Pre-launch security audit — once-only effort

---

## Summary — The 10 Testing Rules

1. **Test the service layer, not the controllers.**
2. **Mock the model in unit tests, hit the real DB in integration tests.**
3. **One assertion = one behavior. No test is "the test that checks everything."**
4. **Coverage targets are floors, not ceilings.**
5. **E2E manual > E2E automated for MVP.**
6. **Every bug found in prod adds one regression test.**
7. **Performance and security tests are pre-launch one-shots — repeat quarterly.**
8. **Smoke tests run automatically after every deploy.**
9. **Rollback within 5 minutes is non-negotiable for every deploy.**
10. **A test you can't read is a test you can't trust.**
