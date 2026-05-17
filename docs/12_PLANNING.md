# @ZAY — Agile Sprint Planning, Timeline & Risk Analysis

---

## Table of Contents

- [Development Team Roles](#development-team-roles)
- [Time Estimation](#time-estimation)
- [Sprint Planning](#sprint-planning)
- [Weekly Goals Breakdown](#weekly-goals-breakdown)
- [Risk Analysis](#risk-analysis)
- [Definition of Done](#definition-of-done)

---

## Development Team Roles

### Minimum Viable Team (2–3 people)

| Role | Responsibilities | Skills Required |
|------|-----------------|-----------------|
| **Full-Stack Developer** (lead) | Backend API, database, DevOps | Node.js, PostgreSQL, Docker |
| **Mobile Developer** | React Native app (customer + seller) | React Native, Expo, Zustand |
| **Frontend Developer** | React.js admin dashboard | React.js, Vite, REST APIs |

> For a school project with 1–2 developers, the full-stack developer handles backend + admin, and the mobile developer handles the React Native app.

### Extended Team (Phase 2)

| Role | Responsibilities |
|------|-----------------|
| Product Manager | Prioritization, user research, stakeholder communication |
| UI/UX Designer | Figma mockups, user testing, design system |
| QA Engineer | Manual testing, automated E2E tests, bug reporting |
| DevOps Engineer | Infrastructure scaling, monitoring, CI/CD |

---

## Time Estimation

### Total MVP Timeline: 10–12 Weeks

| Phase | Duration | What Gets Built |
|-------|----------|----------------|
| Setup & Foundation | 1 week | Project setup, DB schema, auth system |
| Core Backend | 2 weeks | All API endpoints, business logic |
| Mobile App — Customer | 2.5 weeks | Browse, cart, orders, notifications |
| Mobile App — Seller | 1.5 weeks | Menu management, order management |
| Admin Dashboard | 1.5 weeks | All admin pages |
| Integration & Polish | 1 week | Connect everything, bug fixes |
| Testing & Deployment | 1.5 weeks | Tests, staging, production deployment |

### Detailed Effort Estimates

| Feature Area | Estimated Hours | Complexity |
|-------------|----------------|------------|
| Project setup, Docker, CI/CD | 16h | Medium |
| Database schema + migrations | 8h | Low |
| Auth API (register, login, JWT) | 12h | Low |
| User profile API | 6h | Low |
| Seller registration + approval flow | 10h | Medium |
| Categories API | 4h | Low |
| Menu CRUD API | 10h | Low |
| Image upload (Cloudinary) | 8h | Medium |
| Browse/search API | 10h | Medium |
| Order creation + logic | 16h | High |
| Order status management | 10h | Medium |
| Notification system (FCM) | 12h | Medium |
| Admin APIs | 12h | Medium |
| Mobile: Auth screens | 8h | Low |
| Mobile: Home + Browse | 16h | Medium |
| Mobile: Food Detail + Cart | 12h | Medium |
| Mobile: Checkout + Order flow | 16h | High |
| Mobile: Notifications | 8h | Medium |
| Mobile: Profile | 6h | Low |
| Mobile: Seller dashboard | 12h | Medium |
| Mobile: Menu management | 14h | Medium |
| Mobile: Seller orders | 12h | Medium |
| Admin Dashboard: All pages | 30h | Medium |
| Testing (unit + integration) | 20h | Medium |
| Bug fixing + polish | 20h | — |
| Production deployment | 8h | Medium |
| **Total** | **~296 hours** | — |

**With 2 developers at 6h/day:** ~25 working days = ~5 weeks
**With 1 developer at 6h/day:** ~50 working days = ~10 weeks

---

## Sprint Planning

### Sprint 0: Foundation (Week 1)

**Goal:** Everything compiles, connects, and deploys.

**Backend tasks:**
- [ ] Initialize Node.js + Express project
- [ ] Configure ESLint, Prettier, Jest
- [ ] Set up PostgreSQL with Docker Compose
- [ ] Create all database migrations
- [ ] Implement auth middleware (JWT)
- [ ] Implement global error handler
- [ ] Implement logger (Winston)
- [ ] Set up Cloudinary config
- [ ] Set up Firebase Admin config
- [ ] Create health check endpoint
- [ ] Set up GitHub repo + basic CI

**Mobile tasks:**
- [ ] Initialize Expo project
- [ ] Configure navigation skeleton (Auth/Customer/Seller navigators)
- [ ] Set up Axios client with interceptors
- [ ] Configure Zustand auth store
- [ ] Configure AsyncStorage for token persistence

**Admin tasks:**
- [ ] Initialize Vite + React.js project
- [ ] Configure routing (React Router)
- [ ] Set up Axios client
- [ ] Create Sidebar + Topbar layout
- [ ] Protected route wrapper

**Deliverable:** Running dev environment. Can register, login, get profile.

---

### Sprint 1: Auth & User Basics (Week 2)

**Goal:** Full auth flow works end-to-end on mobile.

**Backend:**
- [ ] POST `/auth/register` (customer)
- [ ] POST `/auth/register/seller`
- [ ] POST `/auth/login`
- [ ] POST `/auth/logout`
- [ ] GET `/users/me`
- [ ] PUT `/users/me`
- [ ] PATCH `/users/me/avatar`
- [ ] GET `/categories`
- [ ] Unit tests for auth service

**Mobile:**
- [ ] WelcomeScreen
- [ ] LoginScreen
- [ ] RegisterScreen (customer)
- [ ] RegisterSellerScreen
- [ ] PendingApprovalScreen
- [ ] ProfileScreen
- [ ] Token storage + auto-login on app start
- [ ] Logout functionality

**Admin:**
- [ ] LoginPage (admin auth)
- [ ] Protected route redirect

**Deliverable:** Customer can register, login, view and edit profile. Seller can register (pending).

---

### Sprint 2: Browse & Menu (Week 3)

**Goal:** Customers can browse food. Sellers can manage menus.

**Backend:**
- [ ] GET `/browse/sellers`
- [ ] GET `/browse/sellers/:id`
- [ ] GET `/browse/items` (with category + search filters)
- [ ] GET `/browse/featured`
- [ ] POST `/menus`
- [ ] GET `/menus`
- [ ] PUT `/menus/:id`
- [ ] POST `/menus/:menuId/items`
- [ ] PUT `/items/:id`
- [ ] DELETE `/items/:id`
- [ ] PATCH `/items/:id/availability`
- [ ] POST `/items/:id/image` (Cloudinary upload)

**Mobile:**
- [ ] HomeScreen (categories, featured, seller cards)
- [ ] SearchScreen
- [ ] FoodDetailScreen
- [ ] CategoryPill component
- [ ] FoodCard component

**Mobile (Seller):**
- [ ] MenuManagementScreen
- [ ] AddMenuItemScreen
- [ ] EditMenuItemScreen
- [ ] Image picker + upload

**Deliverable:** Customer can browse and search food. Seller can manage menu with images.

---

### Sprint 3: Orders (Week 4–5)

**Goal:** Full order flow works end-to-end.

**Backend:**
- [ ] POST `/orders` (with full validation + transaction)
- [ ] GET `/orders` (customer history)
- [ ] GET `/orders/:id`
- [ ] PATCH `/orders/:id/cancel`
- [ ] GET `/seller/orders`
- [ ] PATCH `/seller/orders/:id/status`
- [ ] Order status state machine
- [ ] Notification triggers on status changes
- [ ] Integration tests for order flow

**Mobile (Customer):**
- [ ] CartScreen + CartItem component
- [ ] Cart store (Zustand)
- [ ] CheckoutScreen
- [ ] OrderConfirmationScreen
- [ ] OrderHistoryScreen
- [ ] OrderDetailScreen + status timeline
- [ ] Add to cart from FoodDetail

**Mobile (Seller):**
- [ ] SellerDashboardScreen
- [ ] SellerOrdersScreen (tabs: New/Active/History)
- [ ] SellerOrderDetailScreen
- [ ] Accept/Reject/Update status buttons

**Deliverable:** Complete order lifecycle works. Customer places order, seller manages it.

---

### Sprint 4: Notifications & Admin (Week 6–7)

**Goal:** Push notifications work. Admin can manage sellers and view orders.

**Backend:**
- [ ] Firebase Admin SDK integration
- [ ] NotificationService (FCM + DB record)
- [ ] GET `/notifications`
- [ ] PATCH `/notifications/:id/read`
- [ ] PATCH `/notifications/read-all`
- [ ] GET `/notifications/unread-count`
- [ ] PATCH `/users/me/fcm-token`
- [ ] Admin: GET/PATCH sellers (approve/reject/suspend)
- [ ] Admin: GET users
- [ ] Admin: GET orders
- [ ] Admin: GET analytics

**Mobile:**
- [ ] FCM token registration on login
- [ ] Foreground notification handler
- [ ] Background notification handler (navigate on tap)
- [ ] NotificationsScreen
- [ ] Unread badge on tab bar
- [ ] SellerProfileScreen

**Admin Dashboard:**
- [ ] DashboardPage (stat cards + charts)
- [ ] SellersPage (list + filters)
- [ ] SellerDetailPage (review + approve/reject)
- [ ] UsersPage
- [ ] OrdersPage
- [ ] ContentModerationPage

**Deliverable:** Full platform functional. Admin can approve sellers and monitor activity.

---

### Sprint 5: Polish, Testing & Deployment (Week 8–10)

**Goal:** Production-ready, tested, deployed.

**Testing:**
- [ ] Unit tests: auth, order, menu services (80%+ coverage)
- [ ] Integration tests: auth, orders, menus endpoints
- [ ] Manual end-to-end testing (full customer order flow)
- [ ] Manual seller flow testing
- [ ] Admin dashboard testing
- [ ] Push notification testing on real devices

**Polish:**
- [ ] Error states on all screens (empty state, error, loading)
- [ ] Form validation feedback
- [ ] Loading states on all async operations
- [ ] Image loading placeholders
- [ ] Confirmation dialogs for destructive actions
- [ ] Consistent typography and spacing review

**DevOps:**
- [ ] Production environment setup (VPS or Railway)
- [ ] Nginx configuration
- [ ] SSL certificate (Let's Encrypt)
- [ ] GitHub Actions CI/CD pipeline
- [ ] Production deployment
- [ ] Monitoring setup (UptimeRobot)
- [ ] Backup schedule

**Deliverable:** Production MVP deployed at api.zay.ma, admin.zay.ma, mobile app builds.

---

## Weekly Goals Breakdown

| Week | Focus | Key Deliverable |
|------|-------|-----------------|
| 1 | Foundation setup | Dev env running, DB schema done, auth API |
| 2 | Auth + User | Full auth flow on mobile, profile management |
| 3 | Browse + Menu | Customer browse works, seller menu management |
| 4 | Orders | Order placement and customer tracking |
| 5 | Order Management | Seller order management, status updates |
| 6 | Notifications | FCM push notifications working end-to-end |
| 7 | Admin Dashboard | All admin pages functional |
| 8 | Polish | Loading/error states, UI consistency |
| 9 | Testing | Unit + integration test suite |
| 10 | Deployment | Production deployment, monitoring |

---

## Risk Analysis

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Firebase FCM setup complexity | Medium | Medium | Allocate 2 extra days; test on real device early |
| Cloudinary upload performance on slow connections | Low | Medium | Compress images client-side before upload |
| PostgreSQL transaction deadlocks in order creation | Low | High | Keep transaction scope small; test under concurrent load |
| Expo managed workflow limitations (native modules) | Low | Medium | Evaluate bare workflow early if native push fails |
| JWT expiry edge case (token expires mid-order) | Low | Medium | Handle 401 in Axios interceptor → redirect to login |
| React Native navigation state bugs | Medium | Low | Use stable version of React Navigation (v6) |

### Project Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Scope creep | High | High | Keep non-MVP features in "Future" list, refuse scope changes during sprint |
| Single developer bottleneck | Medium | High | Document all decisions; use clear folder structure |
| Lack of real seller data for testing | Medium | Medium | Create detailed seed data with realistic scenarios |
| Push notifications not working on iOS (simulator) | High | Low | iOS simulator does not support push; test on real device |
| Time underestimation | Medium | High | Buffer 20% on every estimate; cut features before cutting quality |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Low seller adoption | Medium | High | Recruit sellers personally before tech launch |
| Food safety incident | Low | Critical | Clear T&C disclaimers; seller verification checklist |
| Regulatory intervention | Low | High | Research Moroccan food safety laws; add disclaimers |
| Copycat competition | Medium | Medium | Speed to market; build seller loyalty quickly |

---

## Definition of Done

A feature is "done" when:

1. ✅ Code is written and follows project conventions (lint passes)
2. ✅ Unit tests written for business logic
3. ✅ API documentation updated (if new endpoint)
4. ✅ Manually tested on:
   - Mobile: iOS simulator AND Android emulator/device
   - API: Postman collection tested
   - Admin: Chrome and Firefox
5. ✅ Edge cases handled (empty state, error state, loading state)
6. ✅ No regressions in existing functionality
7. ✅ PR created, reviewed, and merged to main
8. ✅ CI pipeline passes (lint + tests)
