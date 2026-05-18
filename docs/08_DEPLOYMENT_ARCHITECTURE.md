# @ZAY — Production Deployment Architecture

> **Status:** Definitive Deployment Architecture — MVP  
> **Audience:** Engineers responsible for shipping and operating @ZAY in production  
> **Supersedes:** `08_DEVOPS.md` (kept for historical reference)  
> **Constraint:** This document specifies infrastructure, not implementation code (Dockerfiles already exist in `backend/`).

---

## Table of Contents

1. [Deployment Topology](#1-deployment-topology)
2. [Docker Setup](#2-docker-setup)
3. [CI/CD Pipeline](#3-cicd-pipeline)
4. [Environment Management](#4-environment-management)
5. [Hosting Providers & Cost](#5-hosting-providers--cost)
6. [PostgreSQL Deployment](#6-postgresql-deployment)
7. [Image Storage (Cloudinary)](#7-image-storage-cloudinary)
8. [Firebase / FCM Setup](#8-firebase--fcm-setup)
9. [Mobile App Distribution](#9-mobile-app-distribution)
10. [Monitoring & Alerting](#10-monitoring--alerting)
11. [Logging Strategy](#11-logging-strategy)
12. [Security Hardening](#12-security-hardening)
13. [Backup & Disaster Recovery](#13-backup--disaster-recovery)
14. [Scalability Strategy](#14-scalability-strategy)
15. [Production Checklist](#15-production-checklist)

---

## 1. Deployment Topology

### MVP Architecture (Single VPS)

```
                          ┌───────────────────────┐
                          │     Cloudflare        │
                          │  DNS + CDN + DDoS     │
                          │  Free SSL certs       │
                          └───────────┬───────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       VPS (Hetzner / DigitalOcean)               │
│                       4 GB RAM · 2 vCPU · 40 GB SSD              │
│                                                                  │
│   ┌────────────────────────────────────────────────────────┐    │
│   │                   NGINX (port 443)                      │    │
│   │   • SSL termination (Let's Encrypt via certbot)        │    │
│   │   • api.zay.ma     → :5000 (Express)                   │    │
│   │   • admin.zay.ma   → /var/www/admin (static)           │    │
│   │   • Rate limit: 10r/s burst 20                         │    │
│   └─────────────────┬──────────────────┬───────────────────┘    │
│                     │                  │                         │
│                     ▼                  ▼                         │
│   ┌─────────────────────────┐  ┌─────────────────────────┐      │
│   │  Express API (Docker)   │  │  Admin SPA              │      │
│   │  PM2 cluster × 2        │  │  Static files (Vite     │      │
│   │  :5000                  │  │  build output)          │      │
│   └────────────┬────────────┘  └─────────────────────────┘      │
│                │                                                  │
│                ▼                                                  │
│   ┌─────────────────────────┐                                   │
│   │  PostgreSQL 15 (Docker) │                                   │
│   │  :5432 (Docker net only)│                                   │
│   │  Volume: /var/lib/pg    │                                   │
│   └─────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
                     │                                  │
                     ▼                                  ▼
        ┌────────────────────────┐         ┌────────────────────────┐
        │   Cloudinary           │         │   Firebase FCM         │
        │   (image CDN + store)  │         │   (push notifications) │
        └────────────────────────┘         └────────────────────────┘
                     ▲                                  ▲
                     │                                  │
              ┌──────┴──────────────────────────────────┴──────┐
              │  Mobile clients (React Native / Expo)          │
              │  Admin dashboard (browser)                     │
              └────────────────────────────────────────────────┘

         ┌────────────────────────────────────────────────────┐
         │  Off-site backup: Backblaze B2 (daily pg_dump)     │
         └────────────────────────────────────────────────────┘
```

### Domain Layout

| Domain | Serves | Routing |
|--------|--------|---------|
| `zay.ma` | Marketing site (Phase 2 — for MVP, redirects to app stores) | Cloudflare Pages |
| `api.zay.ma` | REST API + Socket.io | Nginx → Express :5000 |
| `admin.zay.ma` | Admin dashboard SPA | Nginx → static files |

DNS managed by Cloudflare. SSL handled by Cloudflare's edge certs at the proxy layer, with Let's Encrypt as a fallback at the VPS Nginx layer for end-to-end encryption.

### What Runs Where

| Component | Where | Why |
|-----------|-------|-----|
| Mobile app | App Store / Play Store | Distribution via Expo EAS Build |
| Admin dashboard | Nginx static (`/var/www/admin`) | Pure SPA — no server runtime needed |
| Backend API | Docker on VPS | Stateful (sockets), needs Node.js runtime |
| PostgreSQL | Docker on VPS | Single instance, shared with API via Docker network |
| Images | Cloudinary | Offload bandwidth + transformations |
| Push notifications | Firebase FCM | Standard for cross-platform push |
| Backups | Backblaze B2 | Cheap S3-compatible off-site |
| Error tracking | Sentry SaaS | Free tier sufficient for MVP |
| Uptime monitoring | UptimeRobot SaaS | Free tier sufficient |

---

## 2. Docker Setup

### Three Compose Files

| File | Purpose | Used By |
|------|---------|---------|
| `docker-compose.yml` | Development — hot reload, dev tools | Developers locally |
| `docker-compose.staging.yml` | Staging — production-like, smaller resources | Staging VPS (Phase 2) |
| `docker-compose.prod.yml` | Production — optimized, secured | Production VPS |

### `docker-compose.yml` (Development)

```yaml
services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports: ["5000:5000"]
    volumes:
      - ./backend/src:/app/src
      - ./backend/migrations:/app/migrations
      - /app/node_modules
    env_file: ./backend/.env
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: zay_user
      POSTGRES_PASSWORD: zay_dev_password
      POSTGRES_DB: zay_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zay_user -d zay_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

  adminer:
    image: adminer:latest
    ports: ["8080:8080"]
    depends_on: [postgres]

volumes:
  postgres_data:
```

### `docker-compose.prod.yml`

```yaml
services:
  api:
    image: ghcr.io/zay-app/backend:${VERSION}
    restart: always
    expose: ["5000"]
    env_file: /opt/zay/.env
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER_FILE: /run/secrets/pg_user
      POSTGRES_PASSWORD_FILE: /run/secrets/pg_password
      POSTGRES_DB: zay_prod
    volumes:
      - /opt/zay/postgres:/var/lib/postgresql/data
    secrets: [pg_user, pg_password]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s

  nginx:
    image: nginx:alpine
    restart: always
    ports: ["80:80", "443:443"]
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /opt/zay/nginx.conf:/etc/nginx/nginx.conf:ro
      - /var/www/admin:/var/www/admin:ro
    depends_on: [api]

secrets:
  pg_user:
    file: /opt/zay/secrets/pg_user.txt
  pg_password:
    file: /opt/zay/secrets/pg_password.txt
```

### Dockerfile (Backend Production — Multi-Stage)

Already exists at `backend/Dockerfile`. Key properties:
- Multi-stage build (smaller final image)
- Non-root user (`nodejs`)
- Healthcheck via `/api/v1/health` endpoint
- Runs `node migrations/migrate.js && node server.js` on start

### Admin Dockerfile

Admin is built once in CI, then served as static files by Nginx. No runtime container needed in production. For local dev:

```dockerfile
# admin/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
EXPOSE 5173
CMD ["npm", "run", "dev"]
```

### Image Registry

GitHub Container Registry (`ghcr.io`) — free for public repos, free private storage up to 500MB. Images tagged by git SHA + semantic version:

```
ghcr.io/zay-app/backend:1.0.0
ghcr.io/zay-app/backend:abc1234
ghcr.io/zay-app/backend:latest
```

`latest` is updated only on tagged releases, never on every commit.

---

## 3. CI/CD Pipeline

### Branch Strategy

| Branch | Purpose | Auto-Deploys To |
|--------|---------|-----------------|
| `main` | Production-ready code | Production VPS |
| `develop` | Integration branch | Staging VPS (Phase 2) |
| `feature/*` | Work in progress | Nothing (PRs to develop) |
| `hotfix/*` | Critical production fixes | Direct to main with review |

### GitHub Actions Workflows

#### `.github/workflows/backend-ci.yml`

Runs on every push and PR to `develop` or `main`:

```
jobs:
  lint:       npm ci → npm run lint
  test-unit:  npm ci → npm run test:unit
  test-integration:
              spin up postgres service
              npm ci → npm run migrate → npm run test:integration
  security:   npm audit (high+) → fail if found
  build:      docker build → cache layers
```

All four jobs run in parallel. If any fails, the PR cannot merge.

#### `.github/workflows/backend-deploy.yml`

Runs on push to `main` after CI passes:

```
1. Build Docker image with tag = git SHA
2. Push to ghcr.io
3. SSH to production VPS
4. Pull new image, run migrations, restart container with zero downtime:
     docker compose pull api
     docker compose up -d api --no-deps
5. Verify health check passes
6. Notify Slack/Discord webhook of deploy
7. If health check fails: auto-rollback to previous tag
```

#### `.github/workflows/admin-deploy.yml`

Admin is even simpler — pure static build:

```
1. npm ci
2. npm run build → produces dist/
3. rsync dist/ to VPS:/var/www/admin/
4. Nginx already serves from there; no restart needed
```

#### `.github/workflows/mobile-build.yml`

Mobile uses Expo EAS Build, triggered on tag push:

```
1. checkout
2. setup expo
3. eas build --platform all --non-interactive
4. Posts build URLs to Slack
```

For OTA updates (JavaScript-only changes), a separate workflow runs `eas update --auto` on every push to main.

### Secrets in GitHub Actions

Stored in GitHub repository settings → Secrets:

```
DOCKER_REGISTRY_TOKEN
PROD_VPS_HOST
PROD_VPS_USER
PROD_VPS_SSH_KEY
SENTRY_AUTH_TOKEN
EXPO_TOKEN
SLACK_WEBHOOK_URL
```

Never expose secrets via `echo` or logging in workflow files. Use `${{ secrets.NAME }}` syntax only.

### Rollback Procedure

```
ssh prod-vps
cd /opt/zay
echo "VERSION=<previous-sha>" > .env
docker compose pull api
docker compose up -d api
```

The previous image is always available in `ghcr.io` (we never delete tags).

---

## 4. Environment Management

### Three Environments

| Environment | URL | Database | Purpose |
|-------------|-----|----------|---------|
| Development | localhost | local Docker postgres | Engineer's machine |
| Staging | staging.zay.ma | separate postgres on staging VPS | QA + final pre-prod testing (Phase 2) |
| Production | zay.ma | production postgres | Real users |

For MVP launch: only development + production. Staging added in Phase 2 once team size justifies the cost.

### `.env` File Strategy

```
backend/
  .env.example     ← committed to git, template
  .env             ← gitignored, developer's local
  .env.test        ← committed, used by jest integration tests
```

In production:
- `/opt/zay/.env` lives on the VPS, owned by `root`, mode `600`
- Loaded by Docker Compose via `env_file:` directive
- Never committed to git, never sent over Slack, never copy-pasted into a ticket

### Secret Generation

Each environment has its own secrets:

```
# Generate strong JWT secret (64 hex chars)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate admin JWT secret (separate from user JWT)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Postgres password
openssl rand -base64 32
```

Production secrets are stored in a team password manager (1Password / Bitwarden). Developers have access to staging secrets only; production secrets accessible only to deployment lead + CTO.

### Environment Parity

The core principle: **production differs from development only in scale and secrets**.

Same versions of:
- Node.js (20.x LTS)
- PostgreSQL (15)
- Nginx (Alpine)
- All npm dependencies (pinned in package-lock.json)

Different in:
- Database URL
- API keys (separate Cloudinary cloud, separate Firebase project)
- Secrets (JWT, admin JWT)
- Log level (`debug` in dev, `info` in prod)
- CORS origins (localhost vs admin.zay.ma)

### Configuration Validation

`backend/src/config/env.js` validates every env var on startup with Joi. Missing or malformed config crashes the process before serving any request — fail fast, not silently.

### Secrets Rotation

| Secret | Rotation cadence | Trigger |
|--------|------------------|---------|
| Admin password | 90 days | Calendar |
| JWT secret | Never under normal operations | Suspected compromise → forced re-login for all users |
| ADMIN_JWT_SECRET | Quarterly | Calendar |
| Postgres password | 180 days | Calendar |
| Cloudinary API secret | When team member with access leaves | Personnel change |
| Firebase service account | Annually | Calendar |

Rotation playbook documented in `runbooks/secrets-rotation.md` (Phase 2).

---

## 5. Hosting Providers & Cost

### MVP Hosting Stack (Total: ~$15–25/month)

| Service | Provider | Tier | Cost/month |
|---------|----------|------|-----------:|
| Production VPS | Hetzner Cloud CX22 | 4GB / 2vCPU / 40GB | €5.83 (~$6.30) |
| DNS + CDN + SSL | Cloudflare | Free | $0 |
| Image storage | Cloudinary | Free (25GB) | $0 |
| Push notifications | Firebase FCM | Free | $0 |
| Error tracking | Sentry | Free (5K events) | $0 |
| Uptime monitoring | UptimeRobot | Free (50 monitors) | $0 |
| Off-site backup | Backblaze B2 | Pay-as-you-go (~10GB) | ~$0.10 |
| Domain | namecheap | `.ma` domain | ~$10/year |
| Email (transactional) | Resend / Postmark | Free tier | $0 |
| Mobile builds | Expo EAS | Free (30 builds/month) | $0 |
| **Total** | | | **~$7–10/month** |

Alternative VPS providers:

| Provider | Plan | Cost | Notes |
|----------|------|------|-------|
| Hetzner Cloud | CX22 | €5.83 | **Recommended** — Falkenstein DE = ~30ms to Morocco |
| DigitalOcean | Basic Droplet | $12 | Good docs, more expensive |
| Vultr | High Frequency | $12 | Amsterdam region, similar latency |
| Linode | Nanode | $5 | Fewer features, smaller resources |
| AWS Lightsail | 2GB | $10 | Easy AWS migration path later |

**Hetzner CX22 chosen because:**
- Best price-to-performance ratio in Europe
- Low latency to Morocco (Falkenstein, Nuremberg datacenters)
- Reliable infrastructure
- Easy upgrades without re-provisioning

### Phase 2 Hosting (10K+ DAU): ~$80–120/month

| Service | Upgrade |
|---------|---------|
| API server | Hetzner CX32 (8GB/4vCPU) — €11 |
| Database server | Separate Hetzner CX22 (4GB) — €5.83 |
| Database backups | Backblaze B2 (~50GB) — $0.25 |
| Image storage | Cloudinary Plus (free → $89 if needed) |
| Error tracking | Sentry Team — $26 |
| Uptime monitoring | UptimeRobot Pro — $5 |
| Email | Postmark — $15 |

### Phase 3 Hosting (50K+ DAU): ~$400+/month

Migrate to managed services:
- DigitalOcean Managed Postgres ($60) or AWS RDS
- Load balancer ($12)
- 2x backend instances ($24 each)
- Read replica ($60)
- S3 for backups ($5)
- Cloudinary Plus ($89)

---

## 6. PostgreSQL Deployment

### MVP: Single Instance in Docker

PostgreSQL 15 runs as a Docker container on the same VPS as the API. Data lives in a host-mounted volume (`/opt/zay/postgres`) — survives container restarts and Docker upgrades.

**Why same VPS for MVP:**
- Single point of administration
- No network latency (Unix socket via Docker bridge)
- 4GB RAM comfortably handles 50–100 concurrent connections
- Backup is a single host's responsibility

### Connection Pool

`backend/src/config/database.js`:

```
new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,                          // 10 connections per app instance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: production ? { rejectUnauthorized: false } : false,
})
```

PM2 cluster × 2 instances = 20 total connections. PostgreSQL `max_connections` default is 100 — 20% utilization, comfortable headroom.

### PostgreSQL Tuning (`postgresql.conf`)

For 4GB VPS with both Postgres + Node.js sharing memory:

```
shared_buffers = 1GB                 # 25% of RAM
effective_cache_size = 2GB           # 50% of RAM
work_mem = 16MB
maintenance_work_mem = 256MB
max_connections = 100
random_page_cost = 1.1               # SSD storage
effective_io_concurrency = 200       # SSD
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

Phase 2 (dedicated DB server with 8GB RAM): scale `shared_buffers` to 2GB, `effective_cache_size` to 6GB.

### Migrations on Startup

The production container's CMD runs migrations before starting the API:

```
node migrations/migrate.js && node server.js
```

`migrate.js` is idempotent — applied migrations are tracked in `schema_migrations` table. Re-running is safe; only new migrations execute.

### Health Check

`/api/v1/health` returns 200 only if `SELECT 1` succeeds on Postgres. Used by:
- Docker healthcheck (every 30s)
- UptimeRobot (every 5min)
- Cloudflare DNS healthcheck (Phase 2 — for failover)

### Database Access

Production database is **never** exposed to the public internet:
- Postgres binds to Docker bridge network only
- No port `5432` exposed in `docker-compose.prod.yml`
- DB admins SSH to the VPS, then use `docker exec -it postgres psql` or local pgcli through SSH tunnel
- No `psql` from a developer's laptop directly to prod

### Phase 2: Managed Postgres

Trigger to migrate to managed: DB size exceeds 20GB, or query latency consistently > 100ms.

Options:
- DigitalOcean Managed Postgres (~$15/month for 1GB / 10GB)
- AWS RDS (more expensive, more features)
- Hetzner doesn't offer managed Postgres — must self-manage on a dedicated VPS

---

## 7. Image Storage (Cloudinary)

### Account Setup

One Cloudinary account, two cloud configurations:

| Environment | Cloud Name |
|-------------|-----------|
| Production | `zay` |
| Staging / Dev | `zay-dev` |

This isolates staging uploads from production assets.

### Folder Structure

```
zay/                              ← cloud root
├── items/                        ← menu item photos
│   └── {item-uuid}.jpg
├── avatars/                      ← user profile photos
│   └── {user-uuid}.jpg
├── sellers/                      ← seller banners
│   └── {seller-uuid}.jpg
```

Folder structure encoded in `backend/src/services/upload.service.js` (`FOLDER_MAP`).

### Free Tier Limits

Cloudinary free plan:
- 25 GB storage
- 25 GB monthly bandwidth
- 25,000 transformations/month

Estimated MVP usage at 100 sellers × 20 items + 200 customers × avatar:
- Storage: ~2 GB (assuming 1MB avg per image)
- Bandwidth: Very low while customer count is small
- Transformations: 1 per upload + 1 per view × thousands of views/month

Free tier handles MVP comfortably. Monitor via Cloudinary dashboard monthly.

### Upload Pipeline

Backend uses `multer.memoryStorage()` + `cloudinary.uploader.upload_stream`. Files never touch the VPS disk:

```
Mobile → multipart POST /items/:id/image (max 5MB)
       → Express body parser
       → Multer (memory)
       → Cloudinary upload_stream (transformations applied at upload time)
       → Returns { secure_url, public_id }
       → Stored in `menu_items.image_url`
```

### Transformations

```
items:    w_800, h_600, c_fill, q_auto, f_auto
avatars:  w_200, h_200, c_fill, g_face, q_auto, f_auto
sellers:  w_1200, h_400, c_fill, q_auto, f_auto
```

`f_auto` serves WebP/AVIF to supporting clients, JPEG fallback otherwise. Bandwidth savings of 30-50% vs JPEG.

### Asset Cleanup

When a menu item image is replaced, the old Cloudinary asset is deleted before the new one is uploaded:

```
1. Fetch current item.image_public_id from DB
2. cloudinary.uploader.destroy(public_id)
3. Upload new image
4. Update DB with new url + public_id
```

Steps 2-4 are not atomic — if step 4 fails, the old image is gone and the new one is orphaned. Acceptable risk at MVP scale. Phase 2: wrap in retry logic + nightly orphan-cleanup job.

### Signed URLs (Phase 2)

For MVP, all images are public (food photos are not sensitive). Phase 2 may add signed URLs for:
- Seller documents (ID verification — currently out of scope)
- Customer photos in dispute claims (Phase 3)

---

## 8. Firebase / FCM Setup

### Firebase Projects

| Project | Used For |
|---------|----------|
| `zay-prod` | Production app builds |
| `zay-staging` | Staging builds (Phase 2) |
| `zay-dev` | Developer testing |

Each project has its own:
- iOS APNs certificate / Auth key
- Android `google-services.json`
- iOS `GoogleService-Info.plist`
- Server-side service account JSON (used by backend)

### Backend Configuration

The backend (`backend/src/config/firebase.js`) initializes the Firebase Admin SDK with three env vars:

```
FIREBASE_PROJECT_ID=zay-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@zay-prod.iam.gserviceaccount.com
```

The service account JSON is downloaded from Firebase Console → Project Settings → Service Accounts. The three fields above are extracted and added to the production `.env` on the VPS.

**The full JSON is never committed to git.**

### Mobile App Registration

For iOS:
- Apple Developer Account → register bundle ID `ma.zay.app`
- Generate APNs Auth Key (preferred over certificates — never expires)
- Upload key to Firebase Console
- Add `GoogleService-Info.plist` to `mobile/ios/zay/`

For Android:
- Firebase Console → Add Android app → package `ma.zay.app`
- Download `google-services.json`
- Add to `mobile/android/app/`

### Notification Flow

```
Backend OrderService creates notification record
   │
   ├── INSERT INTO notifications (...)        ← always succeeds
   │
   └── Fetch fcm_token from users table
         │
         ├── If exists: messaging.send({ token, notification, data })
         │       ├── On success: UPDATE notifications SET fcm_sent = TRUE
         │       └── On failure: UPDATE notifications SET fcm_error = ?, log warning
         │
         └── If not exists: skip (user disabled notifications)
```

This two-track design (DB + FCM in parallel) means a notification is never lost even if FCM is unreachable.

### Token Management

When a user logs in or launches the app:
1. `expo-notifications` requests permission
2. If granted, fetches device token
3. PATCH `/users/me/fcm-token` sends to backend
4. Backend stores in `users.fcm_token`
5. On logout: backend clears (`POST /auth/logout`)

Stale tokens (returned as `messaging/registration-token-not-registered` from FCM) trigger automatic clearing — handled in `NotificationService.sendFCM`.

---

## 9. Mobile App Distribution

### Build Service: Expo EAS Build

EAS Build compiles native iOS and Android binaries in the cloud — no Mac required for iOS builds.

Free tier: 30 builds/month total (across all platforms). Sufficient for MVP — 2 platforms × ~10 releases = 20 builds/month.

### Build Profiles (`eas.json`)

```
production:
  - distribution: store
  - submit to: App Store + Play Store
  - bundle identifier: ma.zay.app
  - env: API_URL=https://api.zay.ma, SENTRY_DSN=...

preview:
  - distribution: internal (TestFlight + internal Play track)
  - bundle identifier: ma.zay.app.preview
  - env: API_URL=https://staging.zay.ma
```

### App Store Submission

iOS:
1. EAS Build produces `.ipa`
2. `eas submit --platform ios` uploads to App Store Connect
3. Manual: complete metadata, screenshots, app review notes
4. Submit for review (typical: 24-48h)
5. On approval: release manually or auto-release

Android:
1. EAS Build produces `.aab` (Android App Bundle)
2. `eas submit --platform android` uploads to Play Console
3. Internal testing → closed testing → open testing → production
4. Play review: typical 1-3 hours

### Over-the-Air (OTA) Updates

For JavaScript-only changes (no native code changes):

```
eas update --branch production --message "Fix order detail layout"
```

Pushes a JS bundle to Expo's CDN. Mobile clients download on next app launch — no app store review required. Critical for quick bug fixes.

**OTA limits:** Cannot change native modules, app icons, native permissions, or anything that affects the binary. Those still require a full app store release.

### App Versioning

Semantic versioning with build numbers:

```
Version: 1.2.0
iOS Build: 42
Android Version Code: 42

Major.Minor.Patch + Build
  ↓     ↓     ↓
  1.    2.    0     ← shown to users
  
  +42                ← internal increment
```

`major` bumped for breaking changes. `minor` for new features. `patch` for bug fixes. Build number always increments.

### Minimum App Version Enforcement

(From Mobile Architecture Critique Issue #4): Every API response includes header `X-Min-App-Version: 1.2.0`. Mobile client compares to its own version. If older: shows a blocking "Please update" screen.

This prevents API v2 from breaking older client versions during gradual rollout.

---

## 10. Monitoring & Alerting

### Three-Layer Monitoring

| Layer | What | Tool |
|-------|------|------|
| Infrastructure | VPS CPU, RAM, disk, network | Hetzner Cloud Console (built-in) |
| Application | Backend uptime, response time, error rate | UptimeRobot + Sentry |
| Business | Orders/hour, GMV, active users | Admin dashboard analytics |

### Uptime Monitoring (UptimeRobot)

Configured monitors:

| Monitor | URL | Interval | Alert |
|---------|-----|----------|-------|
| API health | `https://api.zay.ma/api/v1/health` | 5 min | Email + SMS after 2 consecutive failures |
| Admin SPA | `https://admin.zay.ma` | 5 min | Email after 2 failures |
| Cloudinary | `https://res.cloudinary.com/zay/image/upload/v1/zay-logo.png` | 30 min | Email after 3 failures |

Free tier covers all three with capacity to spare (50 monitors free).

### Error Tracking (Sentry)

Three Sentry projects:

| Project | Captures |
|---------|----------|
| `zay-backend` | All Node.js exceptions, slow queries, errors |
| `zay-mobile` | React Native JS errors + native crashes |
| `zay-admin` | React errors, failed fetches |

Sentry SDK integrated in:
- Backend: error handler middleware → `Sentry.captureException(err)` for non-operational errors only
- Mobile: `@sentry/react-native` with auto session tracking
- Admin: `@sentry/react` with `BrowserTracing`

Free tier: 5,000 errors/month. Sufficient for MVP. Upgrade to Team ($26/month) at scale.

### Application Performance

PM2 ships built-in monitoring:

```
pm2 monit          # interactive dashboard on the VPS
pm2 list           # process state
pm2 logs           # tail logs
```

PM2 Plus ($39/month) adds web UI, but not needed for MVP.

### Custom Business Metrics

`/admin/analytics/overview` shows real-time business health. The admin dashboard is the primary "is everything OK?" view.

Phase 2: send these metrics to a time-series database (Prometheus + Grafana, or Datadog).

### Alert Routing

For MVP, simple email alerts:
- VPS issues → DevOps lead
- API errors > 50/hour → Backend lead
- Mobile crashes > 10/hour → Mobile lead
- Order error rate > 5% → Founders (business-critical)

Phase 2: Slack/Discord webhooks for richer routing. PagerDuty for on-call rotation if team grows.

### Sentry Alert Rules

```
Rule: "Backend errors spike"
  When: new issue OR issue count > 50 in 5 minutes
  Action: Send email to engineering

Rule: "Critical mobile crash"
  When: new issue tagged 'fatal'
  Action: Send email immediately

Rule: "Payment-related error"
  When: error message contains "payment" OR "order"
  Action: Send email + Slack
```

---

## 11. Logging Strategy

### Stack: Winston + Daily Rotate

Already implemented in `backend/src/utils/logger.js`:

```
- Console transport: colorized in dev, JSON in production
- File transport (prod only):
  - logs/error-YYYY-MM-DD.log  (error level only)
  - logs/combined-YYYY-MM-DD.log  (all levels)
  - 14-day rotation, then auto-deleted
```

### Log Levels

```
error  → unhandled exceptions, FCM failures, DB connection errors
warn   → operational errors (validation failures, deprecated calls)
info   → server start, order placed, status changed, notifications sent
http   → request/response (morgan output → winston)
debug  → query timing, cache hits (dev only)
```

Production runs at `info` level. Debug logs are too noisy and create disk pressure on a 40GB VPS.

### Log Storage

```
/opt/zay/logs/
├── error-2024-05-18.log     ~10 KB/day typical
├── combined-2024-05-18.log  ~5 MB/day typical
└── (older files auto-deleted after 14 days)
```

Total log storage: ~80 MB at steady state. Negligible disk impact.

### What Gets Logged

| Event | Level | Fields |
|-------|-------|--------|
| Server start | info | port, env, version |
| Database connection | info | pool_size |
| HTTP request | http | method, url, status, response_time, request_id |
| Order placed | info | orderId, customerId, sellerId, total |
| Order status changed | info | orderId, from, to, by |
| FCM sent | debug | userId, type |
| FCM failed | warn | userId, error, retry |
| Auto-cancel job | info | cancelled_count, duration |
| Validation error | warn | route, field |
| Unhandled exception | error | message, stack, request_id |

### What NEVER Gets Logged

- Passwords (raw or hashed)
- JWT tokens
- FCM tokens
- Full request/response bodies (PII risk)
- Cloudinary signed URLs
- Database connection strings (which contain passwords)

The logger is configured to redact known sensitive field names automatically.

### Log Aggregation (Phase 2)

When the team adds a staging server, individual log files per VPS become unwieldy. Ship logs to a central store:

- **Loki + Grafana** (self-hosted, cheap, complex setup)
- **Datadog Logs** (managed, expensive)
- **Better Stack / Logtail** (managed, affordable, easy setup) ← recommended

For MVP single-VPS, local files are sufficient. Access via:

```
ssh prod-vps
tail -f /opt/zay/logs/combined-$(date +%Y-%m-%d).log
```

### Request ID Correlation

Every request gets a UUID `req.requestId` (via `requestId` middleware). The ID is:
- Returned to the client in `X-Request-Id` header
- Included in every log line for that request
- Included in any Sentry error captured during the request

When a user reports an error, they (or support) can read the `X-Request-Id` from response headers, and you can grep all logs for that ID to reconstruct exactly what happened.

---

## 12. Security Hardening

### Server Hardening

#### SSH

```
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers deploy
Port 22                          # change to 2222 in Phase 2
```

Only SSH key authentication. Root login disabled. Use a `deploy` user with sudo access for ops.

#### Firewall (UFW)

```
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp       # SSH
ufw allow 80/tcp       # HTTP (redirects to HTTPS)
ufw allow 443/tcp      # HTTPS
ufw enable
```

Postgres port 5432 is NOT exposed. Docker handles container-to-container access internally.

#### Fail2Ban

Auto-blocks IPs that fail SSH or auth requests too many times:

```
/etc/fail2ban/jail.d/zay.conf:

[sshd]
enabled = true
maxretry = 3
bantime = 3600

[nginx-noscript]
enabled = true
maxretry = 6
bantime = 600
```

#### Automatic Security Updates

```
apt install unattended-upgrades
dpkg-reconfigure unattended-upgrades
```

Configured to install security updates daily at 03:00 local time. Auto-reboot if needed for kernel updates.

### Application Security (Already Implemented)

Recapping security measures baked into the backend (full detail in [`09_SECURITY.md`](09_SECURITY.md)):

| Defense | Implementation |
|---------|---------------|
| Password hashing | bcrypt cost 12 |
| JWT | HS256, separate user + admin secrets, in-memory on admin |
| SQL injection | Parameterized queries via `pg`, no string concatenation |
| XSS | Helmet CSP, no `dangerouslySetInnerHTML` in React |
| CSRF | Stateless API + Bearer tokens (no cookies) |
| Rate limiting | Three tiers (global 300/15min, auth 10/15min, upload 20/hr) |
| Brute force | Same as rate limiting + bcrypt slows guesses |
| Input validation | Joi on every endpoint |
| Body size | 10kb JSON limit, 5MB upload limit |
| HTTPS | Cloudflare edge + Let's Encrypt at Nginx |
| HSTS | `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| User enumeration | Generic login error messages |
| Timing attacks | bcrypt.compare always runs |

### SSL Certificates

#### Cloudflare Layer

Free Universal SSL covers `zay.ma` and `*.zay.ma`. Renews automatically. Terminates at Cloudflare's edge.

#### VPS Layer (End-to-End)

Let's Encrypt via certbot for `api.zay.ma` and `admin.zay.ma`. Cloudflare → Origin connection uses these certs (Cloudflare "Full (Strict)" mode).

```
certbot --nginx -d api.zay.ma -d admin.zay.ma
```

Auto-renewal via certbot timer. No manual intervention.

### Dependency Security

```
npm audit               # in CI on every PR
npm audit fix           # before each release
```

Critical or high vulnerabilities block deployment. Snyk or Dependabot configured in GitHub for automated PRs on vulnerable dependencies.

### Database Security

- Strong password (24+ chars from `openssl rand`)
- No remote access (port not exposed)
- Pg roles: one `zay_user` for the app (limited permissions, no SUPERUSER)
- Backup files encrypted at rest in Backblaze B2

### Cloudinary Security

- Use signed uploads only (server-generated upload presets)
- Never expose `api_secret` to the client
- Mobile/admin never upload directly to Cloudinary — always via backend

### Secrets Storage Hierarchy

```
Tier 1 (highest sensitivity):
  - Production .env on VPS                  → owned by root, mode 600
  - GitHub Secrets (CI/CD)                  → no direct access, used by Actions only
  - Team password manager (1Password/Bitwarden) → primary store

Tier 2:
  - Developer .env files                    → gitignored, individual machines

Tier 3:
  - .env.example                            → committed to repo, NO real values
```

A secret in Tier 3 (committed to git) is a security incident — rotate immediately.

### Periodic Security Tasks

| Task | Cadence |
|------|---------|
| Run `npm audit` | Every PR (CI) |
| Update OS packages | Automatic daily (unattended-upgrades) |
| Renew SSL certs | Automatic (certbot timer) |
| Rotate admin passwords | 90 days |
| Review Sentry errors | Weekly |
| Review access logs for suspicious patterns | Monthly |
| Penetration test | Annually (Phase 2) |
| Test backup restore | Quarterly |

---

## 13. Backup & Disaster Recovery

### Backup Targets

| Data | Backup Strategy |
|------|-----------------|
| PostgreSQL | Daily `pg_dump` to Backblaze B2 |
| Cloudinary images | Rely on Cloudinary's redundancy (multi-region storage) |
| Application code | GitHub (already redundant) |
| `.env` files | Team password manager (versioned) |
| Nginx config | Versioned in `infra/` git repo |
| SSL certs | Auto-regenerated by certbot — no backup needed |

### PostgreSQL Backup Script

Runs daily at 02:00 via cron on the VPS:

```
#!/bin/bash
# /opt/zay/scripts/backup-db.sh

set -e
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_FILE="/tmp/zay-${DATE}.sql.gz"

docker exec postgres pg_dump -U zay_user zay_prod | gzip > $BACKUP_FILE

# Upload to Backblaze B2
b2 upload-file zay-backups $BACKUP_FILE db/${DATE}.sql.gz

# Clean up local file
rm $BACKUP_FILE

# Delete B2 files older than retention period
b2 ls zay-backups db/ | while read line; do
  # complex retention logic — full script in repo
done
```

### Retention Policy

```
Daily backups:    7 days retained
Weekly backups:   4 weeks retained
Monthly backups:  12 months retained
```

A backup taken on the 1st of every month is auto-tagged as "monthly" and not deleted until 12 months later.

### Backup Storage Cost (Backblaze B2)

```
Storage: $0.006/GB/month
Download (only if restoring): $0.01/GB
```

10 GB of backups = $0.06/month. 50 GB = $0.30/month. Trivial cost.

### Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

| Metric | Target |
|--------|--------|
| RTO | 1 hour (full data restore + app online) |
| RPO | 24 hours (data lost since last daily backup) |

These are realistic MVP targets. Phase 2 reduces RPO to 1 hour with point-in-time recovery (PITR) via WAL archiving.

### Disaster Recovery Playbook

If the production VPS is destroyed (provider outage, accidental deletion, ransomware):

```
1. Provision new VPS (Hetzner takes ~30 seconds)
2. Install Docker + Docker Compose (5 minutes via cloud-init)
3. Clone the infrastructure repo (1 minute)
4. Restore .env from password manager (2 minutes)
5. Download latest DB backup from B2 (2 minutes)
6. docker compose up postgres (1 minute)
7. gunzip < latest.sql.gz | docker exec -i postgres psql -U zay_user zay_prod (5 minutes)
8. docker compose up -d (2 minutes)
9. Update Cloudflare DNS A record to new VPS IP (1 minute)
10. Verify health check + smoke test (5 minutes)

Total: ~25 minutes to restore service.
```

This playbook is rehearsed quarterly. The first attempt always reveals broken assumptions. Schedule a half-day per quarter for DR drill.

### Backup Verification

A weekly cron job restores the most recent backup to a temporary Postgres instance and runs sanity checks:

```
- Tables exist (users, orders, ...)
- Row counts > 0
- Recent order exists (within last 24h)
- Foreign keys valid
```

Failure triggers an immediate alert. **A backup not tested is not a backup.**

---

## 14. Scalability Strategy

### Three Scaling Axes

```
        Vertical
       (bigger box)
            │
            ▼
            ●─────────► Horizontal-App
            │           (more app servers)
            ▼
        Horizontal-DB
        (replicas, sharding)
```

### Stage 1: 0 → 1,000 DAU (MVP)

**Stack:** Single Hetzner CX22 (4GB / 2vCPU)
**Cost:** ~$10/month

This handles:
- ~100 concurrent users
- ~50-100 orders/day
- ~20 connections to Postgres
- ~5K HTTP requests/day

Monitoring triggers for next stage:
- CPU > 70% sustained
- Memory > 80% sustained
- DB connection pool > 80% utilized

### Stage 2: 1,000 → 10,000 DAU

**Action:** Vertical scale to CX32 (8GB / 4vCPU)
**Cost:** ~€11/month VPS (+~$5/month others)

Same architecture, bigger box. PM2 cluster can expand to 4 workers. Postgres tuning updated to use 2GB shared_buffers.

Key additions at this stage:
- PgBouncer in front of Postgres (handles connection bursts)
- In-memory cache for hot reads (Phase 2 architecture amendment #6)
- Move logs to centralized aggregator (Logtail)
- Cloudflare Argo Tunnel (lower latency origin pull)

### Stage 3: 10,000 → 50,000 DAU

**Action:** Separate database to its own VPS
**Cost:** ~€30/month

Architecture changes:
- Hetzner CX32 for API server
- Hetzner CX22 for dedicated Postgres
- Private network between them (Hetzner internal IPs)
- Read replica on a third VPS for analytics queries
- Backblaze B2 → AWS S3 for backups (more reliable for large volumes)

App-level changes:
- Read-write routing in DB pool: writes to primary, analytics reads to replica
- Redis for FCM token cache + rate-limit storage (replaces in-memory)

### Stage 4: 50,000 → 100,000+ DAU

**Action:** Multi-instance backend behind load balancer
**Cost:** ~$200+/month

Architecture:
- Load balancer (DigitalOcean LB or Hetzner LB) — $12-15/month
- 2-3x backend instances (each CX22) — €18-27/month
- Managed Postgres (DigitalOcean ~$60/month or AWS RDS)
- Redis Cluster for sessions + cache
- CloudFront in front of Cloudinary for additional CDN
- Sentry Team plan, Datadog APM

App changes:
- Socket.io Redis adapter (replaces cluster adapter) for cross-instance pub/sub
- Stateless everything — no sticky sessions
- Database migrations run as separate one-shot job, not on every deploy

### Stage 5: 100,000+ DAU (Phase 3+)

Consideration: migrate critical services to managed cloud platforms (AWS / GCP). At this scale:
- The cost of self-managing infrastructure exceeds managed service overhead
- 24/7 on-call becomes necessary
- Compliance requirements (data residency, audit logs) push toward cloud providers
- Auto-scaling on demand is non-negotiable

This is where the architecture's microservices migration path (documented in `05_BACKEND_ARCHITECTURE.md` §13) becomes relevant.

### What NOT to Optimize Prematurely

For MVP (Stage 1):
- ❌ Don't add Redis "just in case" — adds operational overhead
- ❌ Don't use Kubernetes — single VPS is simpler and sufficient
- ❌ Don't shard the database — single instance handles 100M+ rows fine
- ❌ Don't use a CDN for the API — Cloudflare DNS proxy is enough
- ❌ Don't add ElasticSearch — Postgres full-text search is enough

Each of these solves a real scaling problem at a specific stage. Adding them at MVP wastes engineering time and increases failure surface area.

---

## 15. Production Checklist

### One Week Before Launch

#### Infrastructure
- [ ] VPS provisioned with correct specs
- [ ] DNS records configured (A records for api.zay.ma, admin.zay.ma)
- [ ] Cloudflare account configured (proxied traffic, full strict SSL)
- [ ] Let's Encrypt cert generated and auto-renewal verified
- [ ] Firewall configured (UFW: 22, 80, 443 only)
- [ ] SSH key auth enforced (password auth disabled)
- [ ] Fail2Ban installed and tested
- [ ] Automatic security updates enabled

#### Database
- [ ] Production Postgres deployed with strong password
- [ ] All migrations run successfully
- [ ] Database tuning applied (`shared_buffers`, etc.)
- [ ] Backup script installed and tested
- [ ] Backblaze B2 bucket created with appropriate retention
- [ ] Backup restore tested on staging or temporary instance

#### Application
- [ ] All env vars set on production VPS (validated by `env.js` Joi schema)
- [ ] JWT secrets generated (64+ char random hex) and stored in password manager
- [ ] Cloudinary production account configured, transformations tested
- [ ] Firebase production project configured, FCM tested end-to-end
- [ ] Sentry projects created for backend, mobile, admin
- [ ] PM2 ecosystem file configured (cluster mode, 2 instances)
- [ ] Health check endpoint verified accessible

#### Mobile
- [ ] App Store Connect account ready
- [ ] Google Play Console account ready
- [ ] App icons exported (1024x1024 iOS, multiple Android sizes)
- [ ] Splash screen finalized
- [ ] Bundle ID `ma.zay.app` registered
- [ ] iOS APNs Auth Key uploaded to Firebase
- [ ] Android signing key generated and stored securely
- [ ] App Store metadata, screenshots, privacy policy URL ready
- [ ] Privacy policy + Terms of Service published at zay.ma/legal

#### Admin
- [ ] Admin user created in production DB (via seed script or manual SQL)
- [ ] Admin password set via password manager
- [ ] Admin login flow tested end-to-end

#### Monitoring
- [ ] UptimeRobot monitors created for api + admin
- [ ] Sentry projects receiving test errors
- [ ] Email alert routing tested
- [ ] PM2 monitoring accessible

#### Documentation
- [ ] Disaster recovery playbook reviewed by team
- [ ] Runbook for common ops tasks documented
- [ ] On-call rotation defined

### Launch Day

- [ ] Deploy latest backend tag to production
- [ ] Verify health check returns 200
- [ ] Smoke test: register customer → place test order → seller accepts → status transitions
- [ ] Smoke test: register seller → admin approves
- [ ] Smoke test: FCM push notification arrives on real device
- [ ] Smoke test: Cloudinary image upload + display
- [ ] Submit mobile builds to App Store + Play Store
- [ ] Update Cloudflare DNS if not already pointing to prod
- [ ] Announce launch (internal team only initially)
- [ ] Monitor Sentry for first 4 hours
- [ ] Monitor UptimeRobot for first 24 hours

### First 24 Hours

- [ ] Hourly Sentry review for new error patterns
- [ ] Hourly check of API response times via UptimeRobot
- [ ] DB performance check: any slow queries (`pg_stat_statements`)
- [ ] Disk usage check: any unexpected growth
- [ ] Memory check: PM2 instances steady, not climbing
- [ ] Order completion rate check: should be > 70% (some "first user" friction expected)
- [ ] Backup ran successfully and is restorable

### First Week

- [ ] Daily Sentry triage (resolve, ignore, fix)
- [ ] Review every customer support ticket for systemic issues
- [ ] Track key metrics:
  - Registrations / day
  - Orders / day
  - Order completion rate
  - Average response time
  - Crash-free user rate
- [ ] First retrospective: what broke that we didn't expect?
- [ ] Schedule first DR drill for the following quarter

### Post-Launch Cadence

- **Daily:** monitoring review, Sentry triage
- **Weekly:** metrics review with team, security audit (npm audit), incident review
- **Monthly:** cost review, capacity planning, backup verification
- **Quarterly:** DR drill, secrets rotation, dependency major version updates
- **Annually:** penetration test, vendor review, architecture review
