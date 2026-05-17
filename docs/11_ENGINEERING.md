# @ZAY — Engineering Conventions, Git Workflow & UML

---

## Table of Contents

- [Coding Conventions](#coding-conventions)
- [Git Workflow Strategy](#git-workflow-strategy)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Standards](#commit-message-standards)
- [Pull Request Process](#pull-request-process)
- [Code Review Checklist](#code-review-checklist)
- [UML Diagrams](#uml-diagrams)
- [Production-Ready Engineering Recommendations](#production-ready-engineering-recommendations)

---

## Coding Conventions

### General Principles

1. **Readability over cleverness** — Future you (and your team) will thank you.
2. **Single responsibility** — Each function/file does one thing well.
3. **Explicit over implicit** — Code that states its intent clearly, not code that relies on hidden magic.
4. **Don't repeat yourself (DRY)** — But don't abstract prematurely either. Three repetitions, then abstract.
5. **Fail loudly** — Throw errors, don't silently return null. Unexpected states should crash loudly in development.

### JavaScript / Node.js Standards

- **Style:** Follow `eslint-config-airbnb-base` with minor overrides
- **Formatting:** Prettier (2-space indent, single quotes, semicolons)
- **Modern JS:** ES2022+ features, `async/await` everywhere (no callbacks, no `.then()` chains)
- **No `var`:** `const` by default, `let` when reassignment is needed
- **Destructuring:** Use destructuring for objects and function parameters

### ESLint Configuration

```js
// .eslintrc.js
module.exports = {
  extends: ['airbnb-base', 'prettier'],
  env: { node: true, es2022: true, jest: true },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.js', '**/seeds/**'] }],
  },
};
```

### Prettier Configuration

```json
// .prettierrc
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

### File & Function Naming

| Type | Convention | Example |
|------|-----------|---------|
| Files | `kebab-case.js` | `order.service.js` |
| Classes | `PascalCase` | `AppError` |
| Functions | `camelCase` | `createOrder()` |
| Constants | `UPPER_SNAKE_CASE` | `ORDER_STATUSES` |
| DB columns | `snake_case` | `created_at` |
| API params | `snake_case` | `seller_id` |
| React components | `PascalCase.jsx` | `FoodCard.jsx` |
| Hooks | `usePrefix.js` | `useOrders.js` |

### API Response Consistency

Always use the response helper:
```js
// utils/responseHelper.js
const successResponse = (message, data = null) => ({
  success: true,
  message,
  ...(data !== null && { data }),
});

const errorResponse = (code, message, details = null) => ({
  success: false,
  error: { code, message, ...(details && { details }) },
});
```

---

## Git Workflow Strategy

### Branch Strategy: GitHub Flow (simplified GitFlow)

**Why GitHub Flow over GitFlow?**
GitFlow (develop/release/hotfix branches) is designed for software with multiple simultaneous release versions. @ZAY is a SaaS product with continuous deployment — there is always exactly one production version. GitHub Flow is simpler and faster.

```
main                    ─────────────────────────────────────────────────►
(production)                    ↑           ↑               ↑
                                │           │               │
feature/auth-flow    ──────────►│           │               │
                                            │               │
feature/order-api    ──────────────────────►│               │
                                                            │
fix/seller-approval  ──────────────────────────────────────►│
```

### Branch Rules

| Branch | Purpose | Direct push | Requires PR |
|--------|---------|-------------|-------------|
| `main` | Production code | ❌ Never | ✅ Always |
| `feature/*` | New features | ✅ Yes | When merging to main |
| `fix/*` | Bug fixes | ✅ Yes | When merging to main |
| `refactor/*` | Code cleanup | ✅ Yes | When merging to main |
| `docs/*` | Documentation | ✅ Yes | When merging to main |
| `chore/*` | Dependencies, config | ✅ Yes | When merging to main |

---

## Branch Naming Conventions

Format: `<type>/<short-description>`

All lowercase, hyphen-separated, under 50 characters total.

### Examples

```
feature/user-auth
feature/order-placement
feature/seller-menu-management
feature/push-notifications
feature/admin-seller-approval
feature/browse-by-category

fix/order-total-calculation
fix/fcm-token-update-on-login
fix/seller-status-check-middleware

refactor/order-service-extract
refactor/auth-middleware-cleanup

docs/api-endpoints-documentation
docs/database-schema

chore/update-dependencies
chore/docker-compose-setup
chore/eslint-configuration
```

---

## Commit Message Standards

Format: **Conventional Commits** (`https://www.conventionalcommits.org/`)

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or modifying tests |
| `docs` | Documentation changes |
| `chore` | Build process, dependencies, config |
| `perf` | Performance improvement |
| `style` | Code style changes (formatting) |

### Examples

```
feat(auth): add seller registration with pending approval flow

fix(orders): correct total calculation when quantity > 1

fix(auth): prevent user enumeration on login endpoint

test(orders): add integration tests for order status transitions

chore(deps): update jsonwebtoken to 9.0.2

docs(api): add request/response examples for order endpoints

refactor(notification): extract FCM sending to notification service

perf(browse): add index on menu_items.category_id for faster filtering
```

### Commit Rules

- Present tense ("add feature" not "added feature")
- Lowercase type and scope
- Short description: max 72 characters
- Body explains WHY, not WHAT (the diff shows what)
- Reference issue numbers: `fix(orders): handle missing seller_id — closes #42`

---

## Pull Request Process

### PR Template

```markdown
## Summary

<!-- What does this PR do? 2-3 sentences. -->

## Changes

- [ ] Feature/fix description
- [ ] Any DB migrations?
- [ ] Any environment variable changes?

## Testing Done

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manually tested on device/browser

## Screenshots (if UI change)

<!-- Before / After -->

## Checklist

- [ ] Code follows project conventions (lint passes)
- [ ] No secrets or credentials committed
- [ ] API changes documented in docs/04_API.md
- [ ] DB schema changes reflected in docs/03_DATABASE.md
```

### PR Rules

- PRs must pass CI (lint + tests) before review
- At least 1 approval required for merge to `main`
- No merge commits — use squash merge for feature branches
- Delete branch after merge
- PR title follows Conventional Commits format

---

## Code Review Checklist

**Security:**
- [ ] No raw SQL strings (parameterized queries only)
- [ ] No credentials in code
- [ ] Authorization checks are present and correct
- [ ] Input is validated before use

**Correctness:**
- [ ] Business logic matches requirements
- [ ] Edge cases handled (empty arrays, null values, max limits)
- [ ] Error responses are appropriate (4xx vs 5xx)

**Maintainability:**
- [ ] Code is readable without explanation
- [ ] No dead code
- [ ] Naming is clear and consistent with conventions

**Performance:**
- [ ] No N+1 queries (fetch related data in bulk, not in loops)
- [ ] New DB queries use appropriate indexes
- [ ] No blocking synchronous operations in async code

---

## UML Diagrams

### 1. Use Case Diagram

```
                        @ZAY System
    ┌──────────────────────────────────────────────────────────┐
    │                                                          │
    │  ┌─────────────────────┐   ┌─────────────────────────┐  │
    │  │   <<Customer>>      │   │   <<Seller (Approved)>> │  │
    │  │                     │   │                         │  │
    │  │ ● Register/Login    │   │ ● Register (Pending)    │  │
    │  │ ● Browse Food       │   │ ● Manage Menu Items     │  │
    │  │ ● Search Items      │   │ ● Upload Food Images    │  │
    │  │ ● View Food Detail  │   │ ● Accept/Reject Orders  │  │
    │  │ ● Manage Cart       │   │ ● Update Order Status   │  │
    │  │ ● Place Order       │   │ ● Manage Kitchen Profile│  │
    │  │ ● Track Order       │   │ ● View Order History    │  │
    │  │ ● View History      │   │ ● Receive Notifications │  │
    │  │ ● Receive Notifs    │   │                         │  │
    │  │ ● Manage Profile    │   └─────────────────────────┘  │
    │  └─────────────────────┘                                 │
    │                                                          │
    │  ┌─────────────────────────────────────────────────┐    │
    │  │   <<Admin>>                                     │    │
    │  │                                                  │    │
    │  │ ● Login (Secure)       ● Monitor Orders         │    │
    │  │ ● Approve/Reject Sellers  ● View Analytics      │    │
    │  │ ● Suspend Sellers      ● Moderate Content       │    │
    │  │ ● Manage Users         ● Manage Categories      │    │
    │  └─────────────────────────────────────────────────┘    │
    │                                                          │
    │  External Systems:                                       │
    │  ● Firebase FCM (push notifications)                     │
    │  ● Cloudinary (image storage)                            │
    └──────────────────────────────────────────────────────────┘
```

### 2. Sequence Diagram — Order Placement

```
Customer      Mobile App      Backend API      DB          Seller App
   │               │               │            │               │
   │ Tap "Order"   │               │            │               │
   │──────────────►│               │            │               │
   │               │ POST /orders  │            │               │
   │               │──────────────►│            │               │
   │               │               │ Validate   │               │
   │               │               │ items/seller│               │
   │               │               │────────────►│               │
   │               │               │◄────────────│               │
   │               │               │            │               │
   │               │               │ BEGIN TX   │               │
   │               │               │ INSERT order│               │
   │               │               │────────────►│               │
   │               │               │ INSERT items│               │
   │               │               │────────────►│               │
   │               │               │ COMMIT TX  │               │
   │               │               │            │               │
   │               │               │ Send FCM ──────────────────►│
   │               │               │            │               │ Notification:
   │               │               │            │               │ "New Order!"
   │               │ 201 {order}   │            │               │
   │               │◄──────────────│            │               │
   │ Confirmation  │               │            │               │
   │◄──────────────│               │            │               │
```

### 3. Sequence Diagram — Order Status Update

```
Seller App    Backend API    DB    Customer App
    │               │         │         │
    │ PATCH /orders │         │         │
    │ /:id/status   │         │         │
    │ {status:"accepted"}     │         │
    │──────────────►│         │         │
    │               │ Validate│         │
    │               │ transition        │
    │               │ Check seller owns │
    │               │ this order        │
    │               │                   │
    │               │ UPDATE orders     │
    │               │────────►│         │
    │               │         │         │
    │               │ INSERT notification        │
    │               │────────►│         │
    │               │         │         │
    │               │ Send FCM ──────────────────►│
    │               │         │         │ "Order Accepted ✅"
    │               │         │         │
    │               │ 200 {order}        │
    │◄──────────────│         │         │
    │               │         │         │
```

### 4. Class Diagram (Conceptual)

```
┌────────────────────┐        ┌──────────────────────┐
│     User           │        │   SellerProfile       │
├────────────────────┤        ├──────────────────────┤
│ id: UUID           │1─────1 │ id: UUID              │
│ name: string       │        │ userId: UUID (FK)     │
│ email: string      │        │ businessName: string  │
│ phone: string      │        │ bio: string           │
│ passwordHash: str  │        │ address: string       │
│ role: UserRole     │        │ city: string          │
│ fcmToken: string   │        │ status: SellerStatus  │
│ isActive: boolean  │        │ isOpen: boolean       │
├────────────────────┤        ├──────────────────────┤
│ +create()          │        │ +approve()            │
│ +findById()        │        │ +reject(reason)       │
│ +updateFcmToken()  │        │ +toggleOpen()         │
└────────────────────┘        └──────────┬────────────┘
           │1                            │1
           │N                            │N
┌──────────┴──────────┐      ┌──────────┴────────────┐
│     Order           │      │    Menu               │
├─────────────────────┤      ├──────────────────────┤
│ id: UUID            │      │ id: UUID              │
│ customerId: UUID    │      │ sellerId: UUID (FK)   │
│ sellerId: UUID      │      │ name: string          │
│ status: OrderStatus │      │ isActive: boolean     │
│ totalAmount: decimal│      ├──────────────────────┤
│ deliveryAddress:JSON│      │ +create()             │
│ paymentMethod: str  │      │ +getItems()           │
├─────────────────────┤      └──────────┬────────────┘
│ +create()           │                 │1
│ +updateStatus()     │                 │N
│ +getWithItems()     │      ┌──────────┴────────────┐
└─────────┬───────────┘      │    MenuItem           │
          │1                 ├──────────────────────┤
          │N                 │ id: UUID              │
┌─────────┴───────────┐      │ menuId: UUID (FK)    │
│    OrderItem        │      │ categoryId: UUID (FK) │
├─────────────────────┤      │ name: string          │
│ id: UUID            │      │ price: decimal        │
│ orderId: UUID (FK)  │      │ prepTimeMin: integer  │
│ menuItemId: UUID    │N────1│ imageUrl: string      │
│ name: string (snap) │      │ isAvailable: boolean  │
│ price: decimal(snap)│      ├──────────────────────┤
│ quantity: integer   │      │ +toggleAvailability() │
│ subtotal: decimal   │      │ +uploadImage()        │
└─────────────────────┘      └──────────────────────┘
```

---

## Production-Ready Engineering Recommendations

### 1. Health Check Endpoint

Always have a health check endpoint for load balancers and monitoring:

```js
// app.js
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');  // Verify DB connection
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      db: 'connected',
    });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});
```

### 2. Graceful Shutdown

```js
// server.js
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await db.pool.end();
    process.exit(0);
  });
  // Force quit after 30 seconds if graceful shutdown hangs
  setTimeout(() => process.exit(1), 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 3. Request ID Middleware

```js
const { v4: uuidv4 } = require('uuid');

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});
```

### 4. Async Error Handler Wrapper

```js
// utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
```

This eliminates the need for try/catch in every controller:
```js
// Controller without try/catch
const placeOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.createOrder(req.user.id, req.body);
  res.status(201).json(successResponse('Order placed', { order }));
});
```

### 5. Custom AppError Class

```js
// utils/AppError.js
class AppError extends Error {
  constructor(code, statusCode, message, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;  // Distinguishes expected errors from unexpected ones
  }
}

module.exports = AppError;
```

### 6. Never Log to Console in Production

```js
// BAD:
console.log('Order created:', order.id);

// GOOD:
logger.info('Order created', { orderId: order.id, requestId: req.requestId });
```

Console.log output is unstructured, can't be queried, and pollutes PM2/Docker logs.

### 7. Environment-Aware Error Responses

In production, never expose stack traces or internal error details to clients:

```js
// middleware/errorHandler.middleware.js
const errorHandler = (err, req, res, _next) => {
  // Log the full error (including stack) server-side
  logger.error('Request error', {
    code: err.code || 'INTERNAL_ERROR',
    message: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.path,
  });

  // Operational errors: safe to expose message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Unexpected errors: hide internals from client
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
```
