# @ZAY — Moroccan Homemade Food Marketplace

> **Connecting home cooks with customers seeking healthy, authentic homemade meals.**

@ZAY is a food-tech startup built for the Moroccan market that empowers women cooking from home to sell their meals online, while giving busy customers access to healthy, authentic, and affordable homemade food — the kind only a home kitchen can produce.

---

## Table of Contents

- [Project Overview](#project-overview)
- [The Problem We Solve](#the-problem-we-solve)
- [MVP Features](#mvp-features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Documentation Index](#documentation-index)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

| Field           | Details                                               |
|-----------------|-------------------------------------------------------|
| **Product**     | @ZAY — Homemade Food Marketplace                      |
| **Market**      | Morocco (Phase 1), MENA Region (Phase 2+)             |
| **Model**       | Two-sided marketplace: Home Cooks ↔ Customers         |
| **Revenue**     | Commission on orders (Phase 2), Subscription (Phase 3)|
| **Status**      | MVP Development                                       |
| **Type**        | Mobile-first platform with web admin dashboard        |

---

## The Problem We Solve

### For Customers
- Fast food and restaurant food is unhealthy and repetitive
- Busy professionals have no time to cook
- No digital platform offers authentic homemade Moroccan meals
- Lack of trust in restaurant kitchens

### For Home Cooks
- Talented women have cooking skills but no market access
- No income independence or financial empowerment
- No easy-to-use digital tools designed for their workflow
- Underrepresented in the formal food economy

---

## MVP Features

### Client App (React Native)
- User registration, login, profile management
- Browse food menus, categories, featured meals
- Food detail pages with images, descriptions, price, prep time
- Cart management and order placement
- Cash-on-delivery payment
- Order tracking (status-based)
- Push notifications for order updates

### Seller App (React Native — same app, role-based)
- Seller registration (pending admin approval)
- Menu management (create, edit, delete, image upload)
- Order management (accept, reject, update status)
- Kitchen profile management

### Admin Dashboard (React.js)
- Secure admin login
- Seller approval / rejection / suspension
- User management
- Order monitoring
- Content moderation
- Basic analytics (users, orders, revenue estimate)

---

## Tech Stack

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| Mobile App         | React Native (Expo)                 |
| Admin Dashboard    | React.js + Vite                     |
| Backend API        | Node.js + Express.js                |
| Database           | PostgreSQL                          |
| Authentication     | JWT (JSON Web Tokens)               |
| Push Notifications | Firebase Cloud Messaging (FCM)      |
| File Storage       | Cloudinary (images)                 |
| Containerization   | Docker + Docker Compose             |
| Reverse Proxy      | Nginx                               |
| Hosting (API)      | Railway / Render / VPS              |
| Hosting (Admin)    | Vercel / Netlify                    |

---

## Repository Structure

```
@ZAY_MVP/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── config/             # DB, Firebase, Cloudinary config
│   │   ├── controllers/        # Route handler logic
│   │   ├── middleware/         # Auth, validation, rate limit, upload
│   │   ├── models/             # PostgreSQL query models
│   │   ├── routes/             # Express route definitions
│   │   ├── services/           # Business logic layer
│   │   ├── utils/              # Helpers, constants, logger
│   │   └── app.js              # Express app setup
│   ├── migrations/             # Database migration scripts
│   ├── seeds/                  # Development seed data
│   ├── tests/                  # Backend tests (Jest)
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── mobile/                     # React Native (Expo) App
│   ├── src/
│   │   ├── api/                # Axios API client
│   │   ├── components/         # Shared UI components
│   │   ├── screens/            # App screens by role
│   │   │   ├── auth/
│   │   │   ├── customer/
│   │   │   └── seller/
│   │   ├── navigation/         # React Navigation setup
│   │   ├── store/              # Zustand state management
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Helpers, formatters
│   │   └── constants/          # Colors, fonts, routes
│   ├── assets/
│   ├── app.json
│   └── package.json
│
├── admin/                      # React.js Admin Dashboard
│   ├── src/
│   │   ├── api/                # Axios API client
│   │   ├── components/         # Shared components
│   │   ├── pages/              # Dashboard pages
│   │   ├── store/              # Zustand state
│   │   ├── hooks/
│   │   └── utils/
│   ├── public/
│   ├── vite.config.js
│   └── package.json
│
├── docs/                       # Full project documentation
│   ├── 01_PRODUCT_VISION.md
│   ├── 02_ARCHITECTURE.md
│   ├── 03_DATABASE.md
│   ├── 03_DATABASE_DESIGN.md
│   ├── 04_API.md
│   ├── 04_API_DESIGN.md
│   ├── 05_AUTH.md
│   ├── 06_MOBILE_UX.md
│   ├── 07_WORKFLOWS.md
│   ├── 08_DEVOPS.md
│   ├── 09_SECURITY.md
│   ├── 10_TESTING.md
│   ├── 11_ENGINEERING.md
│   ├── 12_PLANNING.md
│   └── 13_BUSINESS.md
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .gitignore
└── README.md                   # This file
```

---

## Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [Product Vision](docs/01_PRODUCT_VISION.md) | Vision, scope, MVP definition |
| 02 | [Architecture](docs/02_ARCHITECTURE.md) | Full system architecture |
| 03 | [Database](docs/03_DATABASE.md) | PostgreSQL schema, ERD, indexing |
| 03+ | [Database Design](docs/03_DATABASE_DESIGN.md) | **Definitive** — improved schema, audit trail, amendments |
| 04 | [API Reference](docs/04_API.md) | Basic endpoint reference |
| 04+ | [API Design](docs/04_API_DESIGN.md) | **Definitive** — full architecture, middleware, critique |
| 05 | [Authentication](docs/05_AUTH.md) | JWT strategy, roles, permissions |
| 05+ | [Backend Architecture](docs/05_BACKEND_ARCHITECTURE.md) | **Definitive** — layered backend, scalability, microservices path |
| 06 | [Mobile & UX](docs/06_MOBILE_UX.md) | Visual design, screens, design system |
| 06+ | [Mobile Architecture](docs/06_MOBILE_ARCHITECTURE.md) | **Definitive** — engineering architecture, nav, state, critique |
| 07 | [Workflows](docs/07_WORKFLOWS.md) | Order flow, notifications, uploads |
| 07+ | [Admin Architecture](docs/07_ADMIN_ARCHITECTURE.md) | **Definitive** — React+Vite+shadcn, tables, analytics, workflows |
| 08 | [DevOps](docs/08_DEVOPS.md) | Original deployment notes |
| 08+ | [Deployment Architecture](docs/08_DEPLOYMENT_ARCHITECTURE.md) | **Definitive** — VPS topology, CI/CD, hosting tiers, checklist |
| 09 | [Security](docs/09_SECURITY.md) | Security best practices |
| 10 | [Testing](docs/10_TESTING.md) | Unit, integration, API testing |
| 11 | [Engineering](docs/11_ENGINEERING.md) | Conventions, Git workflow, UML |
| 12 | [Planning](docs/12_PLANNING.md) | Sprints, timeline, risk analysis |
| 13 | [Business](docs/13_BUSINESS.md) | SWOT, competitive analysis, roadmap |
| 14 | [Design System](docs/14_DESIGN_SYSTEM.md) | **Definitive** — brand, tokens, components, accessibility, Moroccan inspiration |

---

## Quick Start

### Prerequisites

- Node.js v20+
- PostgreSQL v15+
- Docker & Docker Compose (optional but recommended)
- Expo CLI (`npm install -g expo-cli`)

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/zay-mvp.git
cd zay-mvp
```

### 2. Start with Docker (Recommended)

```bash
# Copy environment file
cp backend/.env.example backend/.env
# Fill in your values in backend/.env

# Start all services
docker-compose up --build
```

### 3. Start Manually

```bash
# Backend
cd backend
npm install
npm run migrate
npm run seed
npm run dev

# Admin Dashboard
cd ../admin
npm install
npm run dev

# Mobile App
cd ../mobile
npm install
npx expo start
```

---

## Environment Variables

See [backend/.env.example](backend/.env.example) and the full breakdown in [docs/08_DEVOPS.md](docs/08_DEVOPS.md).

Key variables:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/zay_db
JWT_SECRET=your-very-secret-key
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
FIREBASE_PROJECT_ID=your-project-id
```

---

## Contributing

This is an MVP project following a structured Git workflow. See [docs/11_ENGINEERING.md](docs/11_ENGINEERING.md) for:
- Branch naming conventions
- Commit message standards
- Pull request process
- Code review checklist

---

## License

MIT License — See LICENSE file.

---

> Built with purpose. Powered by community. Made in Morocco.
