# @ZAY — Security Best Practices

---

## Table of Contents

- [Security Philosophy](#security-philosophy)
- [Authentication Security](#authentication-security)
- [API Security](#api-security)
- [Input Validation & Injection Prevention](#input-validation--injection-prevention)
- [Data Security](#data-security)
- [Infrastructure Security](#infrastructure-security)
- [Dependency Security](#dependency-security)
- [Security Headers](#security-headers)
- [OWASP Top 10 Coverage](#owasp-top-10-coverage)

---

## Security Philosophy

Security is not a feature you bolt on after launch — it is built into every layer from day one.

For @ZAY, the most critical assets to protect are:
1. **User credentials** (passwords, tokens)
2. **Personal data** (addresses, phone numbers)
3. **Order data** (financial history)
4. **Seller business data** (menus, pricing)

The platform handles food safety and financial transactions — any breach damages user trust in a way that is nearly impossible to recover from in a trust-based marketplace.

---

## Authentication Security

### Password Hashing

```js
// Bcrypt with cost factor 12
// Cost 12 = ~250ms per hash on modern hardware
// This is intentionally slow — brute force becomes impractical

const SALT_ROUNDS = 12;
const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
const isValid = await bcrypt.compare(plainPassword, storedHash);
```

**Never:**
- Store passwords in plaintext
- Store passwords MD5/SHA1 hashed (too fast, vulnerable to rainbow tables)
- Log passwords anywhere
- Return password_hash in API responses (even hashed)

### JWT Security

```js
// Always verify the signature, never just decode
const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],  // Explicitly specify — prevents algorithm confusion attacks
});

// Use process.env.JWT_SECRET — never hardcode
// Minimum 256 bits (32 bytes) of random entropy
```

**Token hygiene:**
- Short expiry (7 days) with user re-authentication requirement
- Different secrets for user and admin tokens (`JWT_SECRET` vs `ADMIN_JWT_SECRET`)
- No sensitive data in payload (no full address, no payment info)
- Always validate token on every request (re-fetch user from DB to check is_active)

### Brute Force Protection

```js
// Auth-specific rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                      // 10 attempts
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all auth routes
router.use('/auth/login', authLimiter);
router.use('/auth/register', authLimiter);
```

**Why not use account lockout?**
Account lockout is itself a DoS attack vector — an attacker can lock out legitimate users. Rate limiting by IP is safer: it slows attackers without blocking real users.

---

## API Security

### Helmet.js (Security Headers)

```js
const helmet = require('helmet');
app.use(helmet());

// This sets all of:
// - Content-Security-Policy
// - X-Frame-Options: DENY
// - X-Content-Type-Options: nosniff
// - Strict-Transport-Security (HSTS)
// - X-XSS-Protection
// - Referrer-Policy
```

### CORS Configuration

```js
const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN.split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
```

**Do not use `cors({ origin: '*' })` in production.** Wildcard CORS allows any website to make authenticated requests using a user's credentials.

### Request Size Limiting

```js
app.use(express.json({ limit: '10kb' }));   // JSON body limit
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// File uploads handled separately with multer (5MB per file)
```

Unlimited body size allows attackers to send gigabyte payloads to crash or slow the server.

---

## Input Validation & Injection Prevention

### SQL Injection Prevention

**Never use string interpolation in SQL queries.** Always use parameterized queries:

```js
// WRONG — SQL injection vulnerability:
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// CORRECT — Parameterized query:
const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
```

The `pg` (node-postgres) driver automatically escapes all `$N` parameters. This completely prevents SQL injection.

### XSS Prevention

**Never trust user input in HTML.** Since @ZAY is an API (not server-side rendered HTML), XSS risk is primarily on the frontend:
- React Native and React.js automatically escape values rendered in JSX
- Never use `dangerouslySetInnerHTML` with user content
- Sanitize any content that will be stored and later rendered as HTML

### Input Validation (Joi)

All request bodies are validated before reaching business logic:

```js
// schemas/order.schema.js
const Joi = require('joi');

const placeOrderSchema = Joi.object({
  seller_id: Joi.string().uuid().required(),
  items: Joi.array().items(
    Joi.object({
      menu_item_id: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).max(20).required(),
    })
  ).min(1).max(20).required(),
  delivery_address: Joi.object({
    street: Joi.string().min(5).max(200).required(),
    district: Joi.string().max(100),
    city: Joi.string().max(100).required(),
    notes: Joi.string().max(300),
  }).required(),
  customer_notes: Joi.string().max(300),
  payment_method: Joi.string().valid('cash').default('cash'),
});

module.exports = { placeOrderSchema };
```

### Path Traversal Prevention

Never use user input directly in file paths:
```js
// WRONG:
const filePath = path.join(__dirname, req.params.filename);

// CORRECT: Use Cloudinary for all user-uploaded files
// Never serve files directly from disk using user-controlled paths
```

---

## Data Security

### Sensitive Fields Never Returned in Responses

Build a user serializer that strips sensitive fields:

```js
// utils/serializers.js
const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar_url: user.avatar_url,
  created_at: user.created_at,
  // Excluded: password_hash, fcm_token
});
```

### Personal Data Minimization

- Only collect data needed for the service
- Phone number: needed for delivery coordination
- Address: stored in order (not user profile) for MVP — reduces GDPR-equivalent risk
- FCM token: stored but never exposed to other users

### Data Encryption at Rest

- PostgreSQL on a managed hosting service (Neon, Supabase, Railway) provides encryption at rest by default
- On self-hosted VPS: enable full-disk encryption (LUKS on Ubuntu)

### HTTPS Everywhere

- All traffic HTTPS (TLS 1.2+) via Nginx + Let's Encrypt
- HSTS header enforced (browsers remember to always use HTTPS)
- Redirect HTTP to HTTPS at Nginx level

---

## Infrastructure Security

### Server Hardening

```bash
# 1. Disable root SSH login
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no     # SSH keys only

# 2. Firewall rules (UFW)
ufw default deny incoming
ufw allow 22/tcp              # SSH
ufw allow 80/tcp              # HTTP (redirect to HTTPS)
ufw allow 443/tcp             # HTTPS
# PostgreSQL (5432) NOT opened — internal only
# Node.js (5000) NOT opened — Nginx proxy
ufw enable

# 3. Fail2ban (auto-ban brute force SSH attempts)
apt install fail2ban

# 4. Automatic security updates
apt install unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades
```

### Secrets Management

- **Never commit secrets to Git** (`.env` files in `.gitignore`)
- Use `.env.example` with placeholder values for documentation
- In production: use platform-native secrets (Railway env vars, DigitalOcean App Platform env vars)
- For self-hosted: secrets in environment files with `chmod 600`
- Consider Doppler or HashiCorp Vault for Phase 2

### Database Security

- Database not exposed to internet (internal Docker/VPS network only)
- Separate database user per application (principle of least privilege)
- Database user only has SELECT/INSERT/UPDATE/DELETE — not CREATE/DROP
- Regular automated backups encrypted and stored off-server

---

## Dependency Security

### npm Audit

```bash
# Run on every CI/CD build
npm audit --audit-level=high

# Auto-fix low-risk issues
npm audit fix
```

### Dependency Pinning

```json
// package.json — pin major versions
{
  "dependencies": {
    "express": "^4.18.2",   // Lock to major version
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0"
  }
}
```

### Key Dependencies to Keep Updated

| Package | Why Critical |
|---------|-------------|
| `jsonwebtoken` | JWT vulnerabilities can compromise all auth |
| `bcryptjs` | Crypto library — must stay patched |
| `express` | Framework vulnerabilities can be critical |
| `pg` | Database driver — SQL injection fixes |
| `multer` | File upload — path traversal risks |

---

## Security Headers

Applied by `helmet.js`:

| Header | Value | Protection |
|--------|-------|-----------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `X-XSS-Protection` | `1; mode=block` | XSS filter in older browsers |
| `Strict-Transport-Security` | `max-age=31536000` | Forces HTTPS for 1 year |
| `Content-Security-Policy` | Configured | Prevents injected scripts |
| `Referrer-Policy` | `no-referrer` | Doesn't leak referrer |

---

## OWASP Top 10 Coverage

| # | Vulnerability | @ZAY Mitigation |
|---|--------------|-----------------|
| A01 | Broken Access Control | RBAC middleware, own-resource checks, JWT role validation |
| A02 | Cryptographic Failures | bcrypt for passwords, HTTPS, TLS 1.2+, encrypted DB at rest |
| A03 | Injection | Parameterized SQL queries, Joi input validation |
| A04 | Insecure Design | Threat modeled architecture, principle of least privilege |
| A05 | Security Misconfiguration | helmet.js, strict CORS, firewall rules, no default credentials |
| A06 | Vulnerable Components | npm audit in CI, dependency pinning |
| A07 | Auth Failures | Bcrypt, JWT with proper validation, brute force protection |
| A08 | Software & Data Integrity | Package-lock.json committed, no `npm audit` failures |
| A09 | Logging & Monitoring | Winston structured logging, request IDs, error tracking |
| A10 | Server-Side Request Forgery | No user-controlled URLs fetched server-side in MVP |
