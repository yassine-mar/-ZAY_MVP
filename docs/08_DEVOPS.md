# @ZAY — DevOps, Deployment & Infrastructure

---

## Table of Contents

- [Environment Variables](#environment-variables)
- [Docker Setup](#docker-setup)
- [Deployment Architecture](#deployment-architecture)
- [Hosting Providers](#hosting-providers)
- [CI/CD Recommendations](#cicd-recommendations)
- [Nginx Configuration](#nginx-configuration)
- [Production Deployment Checklist](#production-deployment-checklist)

---

## Environment Variables

### Backend `.env.example`

```env
# =============================================
# @ZAY Backend — Environment Variables
# =============================================

# Server
NODE_ENV=development          # development | production | test
PORT=5000

# Database
DATABASE_URL=postgresql://zay_user:password@localhost:5432/zay_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zay_db
DB_USER=zay_user
DB_PASSWORD=your_strong_password
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_IDLE=10000

# JWT
JWT_SECRET=replace_with_256bit_random_secret_minimum_32chars
JWT_EXPIRES_IN=7d

# Admin JWT (separate secret for admin tokens)
ADMIN_JWT_SECRET=replace_with_different_256bit_random_secret
ADMIN_JWT_EXPIRES_IN=12h

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Firebase (FCM)
# Option A: Path to service account JSON file (local dev)
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
# Option B: Base64-encoded JSON (production env var)
FIREBASE_CREDENTIALS=base64_encoded_service_account_json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX=300             # requests per window
AUTH_RATE_LIMIT_MAX=10         # login attempts per window

# Logging
LOG_LEVEL=debug                # debug | info | warn | error
LOG_DIR=./logs

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8081

# Feature Flags (future use)
FEATURE_ONLINE_PAYMENT=false
```

### Mobile App `.env`

```env
# =============================================
# @ZAY Mobile App — Environment Variables
# =============================================

EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
EXPO_PUBLIC_API_BASE_URL_PROD=https://api.zay.ma/api/v1

# Firebase (set in app.json, not .env)
# EXPO_PUBLIC_FIREBASE_API_KEY=...
```

### Admin Dashboard `.env`

```env
# =============================================
# @ZAY Admin Dashboard — Environment Variables
# =============================================

VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_API_BASE_URL_PROD=https://api.zay.ma/api/v1
```

### Secret Generation

```bash
# Generate a strong JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using openssl
openssl rand -hex 32
```

---

## Docker Setup

### Development: `docker-compose.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: zay_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: zay_db
      POSTGRES_USER: zay_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d  # Auto-run migrations
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U zay_user -d zay_db']
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: zay_backend
    restart: unless-stopped
    ports:
      - '5000:5000'
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://zay_user:dev_password@postgres:5432/zay_db
    env_file:
      - ./backend/.env
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
    command: npm run dev

  admin:
    build:
      context: ./admin
      dockerfile: Dockerfile
    container_name: zay_admin
    restart: unless-stopped
    ports:
      - '3000:3000'
    volumes:
      - ./admin:/app
      - /app/node_modules
    command: npm run dev

volumes:
  postgres_data:
```

### Backend `Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

### Backend `Dockerfile.dev` (with hot reload)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
```

### Production: `docker-compose.prod.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    # NOT exposed to host in production — only internal network
    networks:
      - internal

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    env_file: ./backend/.env.production
    environment:
      NODE_ENV: production
    depends_on:
      - postgres
    networks:
      - internal
      - web

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot_webroot:/var/www/certbot
    depends_on:
      - backend
    networks:
      - web

  certbot:
    image: certbot/certbot
    volumes:
      - ./nginx/ssl:/etc/letsencrypt
      - certbot_webroot:/var/www/certbot

volumes:
  postgres_data:
  certbot_webroot:

networks:
  internal:
  web:
```

---

## Deployment Architecture

### MVP Deployment (Single VPS)

```
Internet
    ↓ HTTPS (443)
┌─────────────────────────────────────────────────────┐
│                    VPS (Ubuntu 22.04)                │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │               NGINX (Reverse Proxy)          │    │
│  │  api.zay.ma → :5000 (Backend)               │    │
│  │  admin.zay.ma → :3000 (Admin)               │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────┐  ┌──────────────────────┐     │
│  │   Node.js API    │  │   Static Admin App   │     │
│  │   Port 5000      │  │   Port 3000 (serve)  │     │
│  └──────────────────┘  └──────────────────────┘     │
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │          PostgreSQL  (Port 5432)          │       │
│  │          (internal network only)          │       │
│  └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘

External Services:
├── Cloudinary (image storage + CDN)
└── Firebase (FCM push notifications)
```

### Recommended VPS Specs for MVP

| Spec | Minimum | Recommended |
|------|---------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Storage | 20 GB SSD | 40 GB SSD |
| Bandwidth | 1 TB/month | 2 TB/month |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

**Estimated cost:** $6–12/month (DigitalOcean, Hetzner, OVH)

### Admin Dashboard Deployment

The admin dashboard (React.js SPA) is a collection of static files after build. Deploy to:
- **Vercel** (free, recommended) — `vercel --prod` from admin directory
- **Netlify** (free)
- Or serve from Nginx on the same VPS

---

## Hosting Providers

### Recommended Providers by Role

| Service | Provider | Plan | Monthly Cost |
|---------|----------|------|-------------|
| API + DB VPS | DigitalOcean Droplet | $12/mo 2GB RAM | $12 |
| API + DB Managed | Railway | Starter | $5–20 |
| API + DB Managed | Render | Starter | Free → $7 |
| PostgreSQL Only | Supabase | Free | $0 (then $25) |
| PostgreSQL Only | Neon | Free tier | $0 (then $19) |
| Admin Dashboard | Vercel | Hobby | Free |
| Admin Dashboard | Netlify | Starter | Free |
| Images | Cloudinary | Free | $0 (25GB) |
| Push Notifications | Firebase | Spark | Free |

### Recommendation for MVP

**Cheapest full setup:**
- **Neon** (PostgreSQL) — Free
- **Railway** (Node.js API) — $5/month
- **Vercel** (Admin Dashboard) — Free
- **Cloudinary** (Images) — Free
- **Firebase** (FCM) — Free

**Total MVP cost: ~$5/month**

**Most reliable setup:**
- **DigitalOcean $12 Droplet** (VPS running PostgreSQL + Node.js together via Docker Compose)
- **Vercel** (Admin)
- **Cloudinary + Firebase** (Free tiers)

---

## CI/CD Recommendations

### GitHub Actions Workflow

**File: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: zay_test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run migrations
        working-directory: ./backend
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/zay_test

      - name: Run tests
        working-directory: ./backend
        run: npm test
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/zay_test
          JWT_SECRET: test_secret_for_ci

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to server via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/zay
            git pull origin main
            cd backend && npm ci --only=production
            npm run migrate
            pm2 restart zay-api
```

### CI/CD Pipeline Stages

```
Developer pushes to feature branch
    ↓
PR opened → CI runs:
  ├── npm run lint (ESLint)
  ├── npm run test (Jest — unit + integration)
  └── Build check (no compilation errors)
    ↓
Code review + PR approval
    ↓
Merge to main
    ↓
CD runs:
  ├── Full test suite
  ├── Build Docker image
  ├── SSH deploy to VPS:
  │   ├── git pull
  │   ├── npm ci
  │   ├── npm run migrate (safe, idempotent)
  │   └── pm2 restart zay-api
  └── Health check: GET /health → 200
```

### Process Management (PM2)

On the VPS, Node.js is managed by PM2 for automatic restarts and clustering:

```bash
# Install PM2
npm install -g pm2

# Start the app
pm2 start server.js --name zay-api --instances 2 --exec-mode cluster

# Auto-restart on server reboot
pm2 startup
pm2 save

# View logs
pm2 logs zay-api

# Monitor
pm2 monit
```

---

## Nginx Configuration

```nginx
# /etc/nginx/sites-available/zay

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.zay.ma admin.zay.ma;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# API Server
server {
    listen 443 ssl http2;
    server_name api.zay.ma;

    ssl_certificate     /etc/letsencrypt/live/api.zay.ma/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.zay.ma/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting at Nginx level (additional layer)
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req zone=api burst=50 nodelay;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # File upload limit
        client_max_body_size 10M;
    }
}

# Admin Dashboard
server {
    listen 443 ssl http2;
    server_name admin.zay.ma;

    ssl_certificate     /etc/letsencrypt/live/admin.zay.ma/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.zay.ma/privkey.pem;

    root /var/www/zay-admin/dist;
    index index.html;

    # SPA routing — all paths serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set in production
- [ ] `JWT_SECRET` is a strong 256-bit random value (not the dev placeholder)
- [ ] `NODE_ENV=production` is set
- [ ] Database migrations have been tested in staging
- [ ] Cloudinary API keys are from production account
- [ ] Firebase service account key is from production project
- [ ] Admin account seeded in production database
- [ ] SSL certificate obtained (Let's Encrypt via Certbot)
- [ ] Nginx configuration tested (`nginx -t`)
- [ ] Firewall configured (allow 80, 443; block 5432, 5000 from external)

### Security Hardening

- [ ] PostgreSQL not exposed to internet (internal network only)
- [ ] SSH key authentication only (password auth disabled)
- [ ] Fail2ban installed for SSH brute force protection
- [ ] Automatic security updates enabled (`unattended-upgrades`)
- [ ] Non-root user for running Node.js process
- [ ] `helmet.js` enabled in Express (security headers)
- [ ] `cors` configured with explicit origin whitelist
- [ ] Rate limiting enabled on all routes

### Performance

- [ ] PM2 cluster mode enabled (2 instances minimum)
- [ ] Nginx gzip compression enabled
- [ ] PostgreSQL connection pool configured
- [ ] Cloudinary auto-format and auto-quality enabled
- [ ] Static admin dashboard assets cached with long TTL

### Monitoring

- [ ] PM2 log rotation configured
- [ ] Winston logs writing to `/var/log/zay/`
- [ ] Server disk space monitored
- [ ] Database backup scheduled (daily `pg_dump` to cloud storage)
- [ ] Uptime monitoring set up (UptimeRobot — free)

### Post-Deployment Verification

- [ ] GET `/health` returns `200 { status: "ok" }`
- [ ] Registration flow works end-to-end
- [ ] Login flow works
- [ ] Browse items works (no auth)
- [ ] Image upload works
- [ ] Push notification received on test device
- [ ] Admin dashboard loads and admin login works
- [ ] Seller approval flow works

### Database Backup Strategy

```bash
# Daily automated backup script (cron job)
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backups/zay_db_${TIMESTAMP}.sql.gz"

pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# Upload to cloud storage (e.g., Cloudflare R2 / S3)
# aws s3 cp $BACKUP_FILE s3://zay-backups/

# Keep only last 7 days of backups
find /backups -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

Cron entry:
```
0 2 * * * /opt/zay/scripts/backup.sh >> /var/log/zay/backup.log 2>&1
```
