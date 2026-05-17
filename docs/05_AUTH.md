# @ZAY — Authentication, Authorization & User Roles

---

## Table of Contents

- [Authentication Flow](#authentication-flow)
- [JWT Strategy](#jwt-strategy)
- [Token Lifecycle](#token-lifecycle)
- [User Roles & Permissions](#user-roles--permissions)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Seller Approval Flow](#seller-approval-flow)
- [Security Considerations](#security-considerations)

---

## Authentication Flow

### Customer Registration & Login

```
1. User submits email + password + name + phone
        ↓
2. Backend validates input (Joi schema)
        ↓
3. Check if email already exists → 409 if conflict
        ↓
4. Hash password with bcrypt (salt rounds: 12)
        ↓
5. INSERT user into users table (role = 'customer')
        ↓
6. Generate JWT (payload: { id, email, role })
        ↓
7. Return { user, token } to client
        ↓
8. Client stores token in AsyncStorage
        ↓
9. Client includes token in all subsequent requests:
   Authorization: Bearer <token>
```

### Seller Registration Flow

```
1. User submits seller registration form
   (name, email, password, business_name, bio, address, city)
        ↓
2. Backend validates input
        ↓
3. Hash password
        ↓
4. INSERT user (role = 'seller') + INSERT seller_profile (status = 'pending')
   — wrapped in a single PostgreSQL transaction
        ↓
5. Generate JWT (payload: { id, email, role, seller_status: 'pending' })
        ↓
6. Return { user, seller_profile, token }
        ↓
7. Admin receives notification of new seller pending approval
        ↓
8. Client shows "Account pending approval" screen
   (seller cannot access seller features until status = 'approved')
```

### Login Flow

```
1. User submits email + password
        ↓
2. Find user by email → 401 if not found (generic message)
        ↓
3. Compare password with bcrypt.compare() → 401 if mismatch
        ↓
4. Check if user is active → 403 if suspended
        ↓
5. If seller: fetch seller_profile.status
        ↓
6. Generate JWT
        ↓
7. Update user.fcm_token if provided in request body
        ↓
8. Return { user, [seller_profile], token }
```

### Why Generic Error Messages for Login?

The API returns the same error message ("Invalid credentials") for both "email not found" and "wrong password". This prevents **user enumeration attacks** — attackers using login to discover which emails are registered.

---

## JWT Strategy

### Token Structure

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "a1b2c3d4-e5f6-...",       // User UUID (subject)
  "email": "fatima@example.com",
  "role": "customer",                 // "customer" | "seller" | "admin"
  "seller_status": null,             // "pending" | "approved" | "rejected" | "suspended" (sellers only)
  "iat": 1705312200,                 // Issued at (Unix timestamp)
  "exp": 1705916200                  // Expires at (7 days later)
}
```

**Signing:**
- Algorithm: HS256
- Secret: 256-bit random string stored in `JWT_SECRET` environment variable
- Expiry: 7 days (`JWT_EXPIRES_IN=7d`)

### What's in the Payload

The JWT payload includes `seller_status` so the mobile app can make immediate routing decisions after login without an extra API call. However, the backend **always re-fetches the seller status from the database** on seller-gated endpoints — the JWT value is used for client-side UX only, not for backend authorization.

### Token Refresh Strategy

In MVP, there is no refresh token mechanism. When the 7-day token expires, the user is redirected to the login screen. This is acceptable for MVP.

In Phase 2, implement:
1. Short-lived access token (15 minutes)
2. Long-lived refresh token (30 days) stored in an httpOnly cookie
3. `/auth/refresh` endpoint validates refresh token and issues new access token

---

## Token Lifecycle

```
Register/Login
    ↓
Generate JWT (7 days)
    ↓
Store in AsyncStorage (mobile) or memory (admin dashboard)
    ↓
Attach to every request: Authorization: Bearer <token>
    ↓
Backend middleware verifies on each request:
  - Token exists?
  - Token valid (signature)?
  - Token not expired?
  - User still active in DB?
    ↓
If any check fails → 401 Unauthorized
    ↓
Client intercepts 401 → clear local storage → redirect to login
```

### Token Storage

| Client | Storage | Notes |
|--------|---------|-------|
| Mobile (React Native) | `AsyncStorage` | Expo SecureStore preferred in production |
| Admin (React.js) | Memory (JavaScript variable) | Not localStorage — admin sessions should not persist across browser restarts |

### Logout

On logout:
1. Client clears the stored token
2. Client calls `POST /auth/logout` which sets `users.fcm_token = NULL` (stops notifications)
3. No server-side token blacklist in MVP (acceptable given 7-day expiry)

Phase 2 token blacklist: When a user logs out or is suspended, add the token JTI (JWT ID) to a Redis blacklist checked on each request.

---

## User Roles & Permissions

### Role Definitions

| Role | Description | Access |
|------|-------------|--------|
| `customer` | End customer who browses and orders food | Customer app features |
| `seller` | Home cook who lists and sells food | Seller app features (when approved) |
| `admin` | Platform administrator | Full admin dashboard access |

### Permission Matrix

| Resource | Action | customer | seller (approved) | seller (pending) | admin |
|----------|--------|----------|-------------------|------------------|-------|
| Browse items | Read | ✅ | ✅ | ✅ | ✅ |
| Own profile | Read/Update | ✅ | ✅ | ✅ | ✅ |
| Orders | Create | ✅ | ❌ | ❌ | ❌ |
| Own orders | Read | ✅ | ✅ (seller view) | ❌ | ✅ |
| Own orders | Cancel | ✅ (pending only) | ❌ | ❌ | ❌ |
| Seller orders | Read | ❌ | ✅ | ❌ | ✅ |
| Order status | Update | ❌ | ✅ | ❌ | ✅ |
| Own menus | CRUD | ❌ | ✅ | ❌ | ✅ |
| Own menu items | CRUD | ❌ | ✅ | ❌ | ✅ |
| Seller profile | Read | ❌ | ✅ (own) | ❌ | ✅ |
| Seller status | Update | ❌ | ❌ | ❌ | ✅ |
| All users | Read | ❌ | ❌ | ❌ | ✅ |
| All orders | Read | ❌ | ❌ | ❌ | ✅ |
| Categories | CRUD | ❌ | ❌ | ❌ | ✅ |
| Analytics | Read | ❌ | ❌ | ❌ | ✅ |

---

## Role-Based Access Control (RBAC)

### Middleware Stack

```js
// Route with layered auth middleware:
router.patch(
  '/seller/orders/:id/status',
  authenticate,              // 1. Verify JWT
  requireRole('seller'),     // 2. Check role = 'seller'
  requireApprovedSeller,     // 3. Check seller_profile.status = 'approved'
  validateBody(orderStatusSchema), // 4. Validate request body
  OrderController.updateStatus
);
```

### `authenticate` Middleware

```
1. Extract token from Authorization header
2. Verify token signature (jsonwebtoken.verify)
3. Decode payload → { id, role, email }
4. Fetch user from database (verify still active)
5. Attach user to req.user
6. Call next()
```

The database fetch on every request is important: if an admin suspends a user, their next request is blocked immediately, not after their JWT expires.

### `requireRole` Middleware

```js
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new AppError('FORBIDDEN', 403, 'Access denied for your role');
  }
  next();
};
```

### `requireApprovedSeller` Middleware

```js
const requireApprovedSeller = async (req, res, next) => {
  const seller = await SellerModel.findByUserId(req.user.id);
  if (!seller || seller.status !== 'approved') {
    throw new AppError('SELLER_NOT_APPROVED', 403,
      'Your seller account is not yet approved');
  }
  req.seller = seller;
  next();
};
```

---

## Seller Approval Flow

```
Seller registers
    ↓
seller_profiles.status = 'pending'
    ↓
Admin dashboard shows seller in "Pending Approvals" list
    ↓
Admin reviews:
  - Seller name and bio
  - Address and city
  - Profile picture (if uploaded)
    ↓
Admin clicks "Approve" or "Reject"
    ↓
  ┌──── Approve ────────────────────────────────────┐
  │  seller_profiles.status = 'approved'            │
  │  seller_profiles.approved_at = NOW()            │
  │  Send FCM notification: "Account approved! 🎉"  │
  └─────────────────────────────────────────────────┘

  ┌──── Reject ─────────────────────────────────────┐
  │  seller_profiles.status = 'rejected'            │
  │  seller_profiles.rejected_reason = 'reason'     │
  │  Send FCM notification: "Account not approved"  │
  └─────────────────────────────────────────────────┘

  ┌──── Suspend (post-approval) ────────────────────┐
  │  seller_profiles.status = 'suspended'           │
  │  Seller cannot accept orders                    │
  │  Seller's items hidden from browse              │
  └─────────────────────────────────────────────────┘
```

### Client-Side Routing Based on Status

After login, the mobile app reads the seller status and routes accordingly:

```
if role === 'seller':
  if status === 'pending'   → ShowPendingApprovalScreen
  if status === 'approved'  → LoadSellerNavigator
  if status === 'rejected'  → ShowRejectedScreen (with reason)
  if status === 'suspended' → ShowSuspendedScreen
```

---

## Security Considerations

### Password Security

- Hashed with `bcrypt` at cost factor 12 (balances security and performance)
- Never stored in plaintext, ever
- Never returned in API responses
- Password reset (Phase 2): Email-based OTP, not secret questions

### JWT Security

- Secret is minimum 256 bits (32 random bytes, base64 encoded)
- Stored only in environment variables, never in code
- HTTPS enforced in production (prevents token interception)
- Token expiry is 7 days — reasonable for a mobile app with active users

### Brute Force Protection

- Rate limit on `/auth/login`: 10 attempts per 15 minutes per IP
- Rate limit on `/auth/register`: 5 attempts per hour per IP
- Generic error messages (no user enumeration)

### Authorization Checks

- Role check happens server-side on every request
- User active check happens server-side on every request
- Seller status check happens server-side on seller routes
- Own-resource checks: Controllers verify `order.customer_id === req.user.id` before returning data

### Admin Account

- Admin account created manually via database seed (never via API)
- Admin login endpoint is separate (`/admin/auth/login`) with stricter rate limiting
- Admin JWT includes additional `admin: true` claim
- Consider IP whitelisting for admin endpoints in production
