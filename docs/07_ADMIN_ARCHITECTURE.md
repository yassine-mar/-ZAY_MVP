# @ZAY — Admin Dashboard Architecture

> **Status:** Definitive Admin Dashboard Architecture — MVP  
> **Audience:** Frontend engineers building the admin dashboard  
> **Scope:** Architecture, routing, state, tables, analytics, workflows, UX  
> **Constraint:** Documentation only. No implementation code.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Architecture Pattern](#2-architecture-pattern)
3. [Complete Folder Structure](#3-complete-folder-structure)
4. [Routing Architecture](#4-routing-architecture)
5. [Authentication Strategy](#5-authentication-strategy)
6. [Protected Routes Pattern](#6-protected-routes-pattern)
7. [State Management Strategy](#7-state-management-strategy)
8. [API Layer Architecture](#8-api-layer-architecture)
9. [Data Tables Architecture](#9-data-tables-architecture)
10. [URL-as-State Strategy](#10-url-as-state-strategy)
11. [Analytics Architecture](#11-analytics-architecture)
12. [Seller Approval Workflow](#12-seller-approval-workflow)
13. [Order Monitoring Architecture](#13-order-monitoring-architecture)
14. [Forms & Validation](#14-forms--validation)
15. [Error Handling](#15-error-handling)
16. [Theme & Design System](#16-theme--design-system)
17. [Layout & Navigation UX](#17-layout--navigation-ux)
18. [Keyboard Shortcuts](#18-keyboard-shortcuts)
19. [Responsive Strategy](#19-responsive-strategy)
20. [Complete Pages Inventory](#20-complete-pages-inventory)
21. [UI/UX Recommendations](#21-uiux-recommendations)

---

## 1. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Build tool | Vite | 100x faster than CRA, instant HMR |
| Framework | React 18 | Concurrent features, Suspense for data |
| Language | TypeScript (strict) | Type safety on admin actions = no silent data loss |
| Routing | React Router 6 | `createBrowserRouter` for declarative, type-safe routes |
| Server state | TanStack Query (React Query v5) | Same as mobile — consistent patterns across the codebase |
| Client state | Zustand | Same as mobile — token, sidebar state, UI prefs |
| HTTP | axios | Interceptors for auth + error normalization |
| Forms | React Hook Form + Zod | Lightweight, type-inferred validation |
| Tables | TanStack Table v8 | Headless, fully composable, handles 10K+ rows |
| Charts | Recharts | React-native chart components, simple API |
| Component library | shadcn/ui | Radix UI primitives + Tailwind — copy-paste, no runtime overhead |
| Styling | Tailwind CSS | Utility-first, tree-shaken, fast compilation |
| Icons | lucide-react | Tree-shakeable, modern, matches shadcn aesthetic |
| Date | date-fns | Tree-shakeable, locale support |
| Real-time | socket.io-client | Live order feed |
| Command palette | cmdk (Radix) | Built into shadcn/ui — `⌘K` for everything |
| Notifications | sonner | Toast library shadcn recommends |

### What's NOT in the Stack

- **Material-UI / Ant Design** — heavyweight, hard to customize, locked-in component APIs
- **Redux Toolkit** — Zustand + React Query cover the state surface area
- **Create React App** — abandoned, slow, replaced by Vite
- **CSS-in-JS (styled-components, emotion)** — runtime cost, Tailwind compiles to static CSS
- **react-table v7** — superseded by TanStack Table v8

---

## 2. Architecture Pattern

### Page-Based Architecture

Unlike the mobile app (which is screen-based and role-segmented), the admin dashboard is a **single-role single-shell SPA**. Every authenticated admin sees the same set of pages.

```
admin/src/
├── pages/        organized by RESOURCE (sellers, users, orders, categories, analytics)
├── components/   organized by REUSABILITY TYPE (ui, layout, tables, charts, forms)
├── routes/       routing config + guard components
├── api/          one file per backend resource
└── store/        small Zustand stores (auth, ui)
```

### Why Page-Based, Not Feature-Based

Feature-based architecture (`features/sellers/{pages, components, hooks, api}`) works well for apps with **isolated** features. The admin dashboard is the opposite — every page consumes shared components (DataTable, charts, layout) and shared API client. Co-locating would force significant duplication.

### Why a Single Shell

The admin dashboard does not have role-based branches like the mobile app. There is one role: `admin`. The shell (sidebar + topbar + page content) is mounted once and pages swap inside the outlet. This is simpler, faster, and matches industry conventions for admin tools (Linear, Vercel, Notion all work this way).

### The Layer Boundary Rule

```
pages/  →  consume API hooks, render UI components
api/    →  HTTP only, no React, no UI
store/  →  client state only (token, sidebar collapsed)
hooks/  →  shared cross-page hooks (useDebounce, useDataTable)
components/ → presentational, no API calls
```

A page knows how to call the API and render a table. A component knows how to render a table given data. They never blur.

---

## 3. Complete Folder Structure

```
admin/
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── components.json              # shadcn/ui config
├── .env.example
├── .env
├── Dockerfile
├── nginx.conf                   # serves the built SPA
│
├── public/
│   ├── favicon.svg
│   └── logo.svg
│
└── src/
    │
    ├── main.tsx                 # Vite entry: ReactDOM + StrictMode
    ├── App.tsx                  # Providers (QueryClient, RouterProvider, Toaster)
    ├── index.css                # Tailwind directives + CSS variables
    │
    ├── api/
    │   ├── client.ts            # axios + interceptors
    │   ├── auth.api.ts          # adminLogin
    │   ├── sellers.api.ts       # list, detail, approve, reject, suspend
    │   ├── users.api.ts         # list, detail, suspend
    │   ├── orders.api.ts        # list, detail, forceCancel
    │   ├── categories.api.ts    # CRUD
    │   └── analytics.api.ts     # overview, order trends, top sellers
    │
    ├── components/
    │   ├── ui/                  # shadcn/ui primitives (copy-paste, owned in repo)
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   ├── form.tsx
    │   │   ├── select.tsx
    │   │   ├── textarea.tsx
    │   │   ├── switch.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   ├── alert-dialog.tsx
    │   │   ├── sheet.tsx
    │   │   ├── popover.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── tabs.tsx
    │   │   ├── table.tsx
    │   │   ├── badge.tsx
    │   │   ├── avatar.tsx
    │   │   ├── skeleton.tsx
    │   │   ├── separator.tsx
    │   │   ├── command.tsx      # ⌘K palette primitive
    │   │   ├── tooltip.tsx
    │   │   ├── calendar.tsx
    │   │   ├── date-range-picker.tsx
    │   │   ├── checkbox.tsx
    │   │   └── pagination.tsx
    │   │
    │   ├── layout/
    │   │   ├── AppLayout.tsx    # Sidebar + Topbar + <Outlet />
    │   │   ├── Sidebar.tsx
    │   │   ├── SidebarNavItem.tsx
    │   │   ├── Topbar.tsx
    │   │   ├── Breadcrumbs.tsx
    │   │   ├── PageHeader.tsx
    │   │   ├── CommandPalette.tsx  # ⌘K global search/nav
    │   │   └── UserMenu.tsx
    │   │
    │   ├── tables/
    │   │   ├── DataTable.tsx           # Generic TanStack Table wrapper
    │   │   ├── DataTableToolbar.tsx    # Search + filters
    │   │   ├── DataTablePagination.tsx
    │   │   ├── DataTableColumnHeader.tsx  # Sortable header
    │   │   ├── DataTableFacetedFilter.tsx # Multi-select column filter
    │   │   ├── DataTableViewOptions.tsx   # Show/hide columns
    │   │   └── DataTableRowActions.tsx    # Per-row dropdown menu
    │   │
    │   ├── charts/
    │   │   ├── LineChart.tsx           # Recharts wrapper for trends
    │   │   ├── BarChart.tsx            # Recharts wrapper for counts
    │   │   ├── PieChart.tsx            # For category breakdowns
    │   │   ├── MetricCard.tsx          # Big-number KPI card
    │   │   └── TrendIndicator.tsx      # +12% ↑ / -3% ↓ badge
    │   │
    │   ├── forms/
    │   │   ├── FormField.tsx           # RHF Controller wrapper
    │   │   ├── RejectSellerForm.tsx
    │   │   ├── SuspendForm.tsx
    │   │   ├── CancelOrderForm.tsx
    │   │   └── CategoryForm.tsx
    │   │
    │   ├── feedback/
    │   │   ├── ErrorBoundary.tsx
    │   │   ├── ErrorPage.tsx
    │   │   ├── LoadingPage.tsx
    │   │   ├── EmptyState.tsx
    │   │   └── ConfirmDialog.tsx
    │   │
    │   └── domain/
    │       ├── SellerStatusBadge.tsx
    │       ├── OrderStatusBadge.tsx
    │       ├── UserRoleBadge.tsx
    │       ├── OrderTimeline.tsx       # Vertical status history
    │       ├── ApprovalActions.tsx     # Approve/Reject button group
    │       ├── RelativeTime.tsx        # "3 minutes ago"
    │       └── LiveOrdersFeed.tsx
    │
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── NotFoundPage.tsx
    │   │
    │   ├── sellers/
    │   │   ├── SellersListPage.tsx
    │   │   ├── SellerDetailPage.tsx
    │   │   ├── columns.tsx              # TanStack Table column defs
    │   │   └── filters.tsx              # Faceted filter config
    │   │
    │   ├── users/
    │   │   ├── UsersListPage.tsx
    │   │   ├── UserDetailPage.tsx
    │   │   └── columns.tsx
    │   │
    │   ├── orders/
    │   │   ├── OrdersListPage.tsx
    │   │   ├── OrderDetailPage.tsx
    │   │   ├── LiveOrdersPage.tsx       # Auto-refreshing feed
    │   │   ├── columns.tsx
    │   │   └── filters.tsx
    │   │
    │   ├── categories/
    │   │   ├── CategoriesPage.tsx
    │   │   └── columns.tsx
    │   │
    │   ├── analytics/
    │   │   ├── AnalyticsPage.tsx
    │   │   ├── OverviewSection.tsx      # 4 KPI cards
    │   │   ├── OrderTrendsSection.tsx
    │   │   ├── TopSellersSection.tsx
    │   │   └── CategoryBreakdownSection.tsx
    │   │
    │   └── settings/
    │       └── SettingsPage.tsx
    │
    ├── routes/
    │   ├── index.tsx                    # createBrowserRouter() definition
    │   ├── ProtectedRoute.tsx
    │   ├── PublicRoute.tsx
    │   └── paths.ts                     # Named route constants
    │
    ├── store/
    │   ├── auth.store.ts                # Zustand: token (memory), admin user
    │   └── ui.store.ts                  # Zustand: sidebar, saved filters
    │
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useDebounce.ts
    │   ├── useDataTable.ts              # Wraps TanStack Table + React Query
    │   ├── useTableUrlState.ts          # Syncs filters/pagination to URL
    │   ├── useKeyboardShortcuts.ts
    │   ├── useLiveOrders.ts             # Polling + socket.io subscription
    │   ├── useIdleLogout.ts             # Auto-logout after 30 min idle
    │   └── useToast.ts                  # Re-export sonner
    │
    ├── lib/
    │   ├── utils.ts                     # cn() — Tailwind class merger
    │   ├── queryClient.ts               # QueryClient instance + defaults
    │   └── socket.ts                    # socket.io-client init
    │
    ├── utils/
    │   ├── format.ts                    # formatCurrency, formatDate, formatPhone
    │   ├── validation.ts                # Zod schemas
    │   ├── error.ts                     # parseApiError → user-facing
    │   └── permissions.ts               # Admin action authorization (future)
    │
    ├── constants/
    │   ├── api.ts                       # BASE_URL
    │   ├── orderStatus.ts               # Status enum + labels + Tailwind colors
    │   ├── sellerStatus.ts
    │   ├── cities.ts
    │   └── config.ts                    # Feature flags
    │
    └── types/
        ├── api.types.ts                 # ApiResponse<T>, PaginatedResponse<T>
        ├── domain.types.ts              # Mirror of backend types
        └── table.types.ts               # TanStack Table column helpers
```

**Total:** ~90 files across 11 directories.

---

## 4. Routing Architecture

### React Router 6 with `createBrowserRouter`

Modern data-router API. Defined once in `routes/index.tsx`:

```
/                        → redirect to /dashboard
/login                   → LoginPage              (public)
/                        → AppLayout              (protected)
  /dashboard             → DashboardPage
  /sellers               → SellersListPage
  /sellers/:id           → SellerDetailPage
  /users                 → UsersListPage
  /users/:id             → UserDetailPage
  /orders                → OrdersListPage
  /orders/live           → LiveOrdersPage
  /orders/:id            → OrderDetailPage
  /categories            → CategoriesPage
  /analytics             → AnalyticsPage
  /settings              → SettingsPage
/*                       → NotFoundPage
```

### Route Structure

```
{
  path: '/',
  element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
  errorElement: <ErrorPage />,
  children: [
    { index: true, element: <Navigate to="/dashboard" replace /> },
    { path: 'dashboard', element: <DashboardPage /> },
    { path: 'sellers', element: <SellersListPage /> },
    { path: 'sellers/:id', element: <SellerDetailPage /> },
    // ...
  ]
}
```

### Why `createBrowserRouter` Over `<BrowserRouter>` + `<Routes>`

- Supports data loaders (`loader`, `action`) — though we use React Query instead, the modern API is still preferred
- Better TypeScript inference for route params
- Cleaner error boundaries (per-route `errorElement`)
- Future-proof: matches the direction of Remix and the broader React Router ecosystem

### Named Path Constants

```
// routes/paths.ts
export const PATHS = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  SELLERS: '/sellers',
  SELLER_DETAIL: (id: string) => `/sellers/${id}`,
  ORDERS: '/orders',
  ORDERS_LIVE: '/orders/live',
  ORDER_DETAIL: (id: string) => `/orders/${id}`,
  // ...
} as const;
```

Every `navigate()` call uses these constants. No magic strings. Refactoring a URL is one change.

---

## 5. Authentication Strategy

### In-Memory Token Storage

The admin JWT is stored **only in Zustand state in memory**. It is never written to `localStorage`, `sessionStorage`, or cookies.

```
authStore = {
  token: string | null,    // <-- memory only
  user: AdminUser | null,
  isAuthenticated: boolean,
}
```

### Why Not localStorage

`localStorage` is accessible to any JavaScript running on the page. A single XSS vulnerability — even in a third-party dependency — exposes every admin token to attackers. For a tool that can approve sellers, suspend users, and cancel orders, this is unacceptable.

### The Trade-Off

In-memory storage means **the token is lost on page refresh**. The admin must log in again after pressing F5.

This is the correct trade-off for an admin tool because:
1. Admins log in infrequently (typically once at the start of a work session)
2. Re-logging-in takes 10 seconds
3. The alternative (XSS theft) can compromise the entire platform

A typical admin workflow:
- Morning: log in once → token in memory
- Use the dashboard for 8 hours → token persists across navigation (SPA, no full reloads)
- Token expires after 8 hours → forced re-login (matches admin session lifetime)

### Why Not HttpOnly Cookies + CSRF

HttpOnly cookies (set by the backend, inaccessible to JS) are **more secure** but require:
- CORS with `credentials: true`
- CSRF token issuance + validation on every state-changing request
- Backend cookie-handling code

For MVP, the in-memory approach achieves 90% of the security at 30% of the implementation cost. Phase 2: migrate to HttpOnly cookies once the team has bandwidth.

### Auto-Logout on Idle

`useIdleLogout` hook tracks `mousemove`, `keypress`, and `scroll` events. After 30 minutes of no activity:
- Show a 60-second warning modal: "You'll be logged out in 60 seconds"
- Mouse movement extends the session
- Inaction → silent logout → redirect to login

This protects against an admin walking away from an unlocked screen — a real risk in shared office spaces.

### Login Flow

```
LoginPage
   │  admin enters email + password, submits
   │
   ▼
authApi.adminLogin({ email, password })
   │  POST /admin/auth/login
   │  → { user, token }
   │
   ▼
authStore.setAuth({ user, token })
   │
   ▼
Navigate to redirect target:
   const target = location.state?.from?.pathname || '/dashboard'
   navigate(target, { replace: true })
```

### Logout Flow

```
UserMenu "Log Out" → confirmation tooltip → click
   │
   ▼
authStore.reset()           // clears token + user from memory
queryClient.clear()         // drops all cached server data
socket.disconnect()         // closes real-time connection
navigate('/login', { replace: true })
```

### Token Expiry Handling

axios response interceptor catches 401:
1. `authStore.reset()` immediately
2. Toast: "Your session has expired. Please log in again."
3. `navigate('/login')` with `state: { from: location.pathname }`
4. After re-login, return to where they were

---

## 6. Protected Routes Pattern

### ProtectedRoute Component

```
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

### PublicRoute Component (Login Page)

```
function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

This prevents authenticated admins from seeing the login page (a small but expected behavior).

### Why Wrapper Components, Not Loader Functions

React Router 6 supports `loader` functions that run before route render. They can perform auth checks. But:

- Loaders run outside React, so they can't use hooks (Zustand, etc.)
- Loaders make testing harder
- The wrapper pattern is more familiar to React developers

For MVP, the wrapper pattern wins on simplicity. Phase 2 can migrate to loaders if data-fetching benefits are needed.

### No Role-Based Sub-Permissions in MVP

Every authenticated admin has full access. There is no "read-only admin" or "seller-approver-only admin" role.

Phase 2 may introduce sub-roles. The architecture has a clear extension point: add a `permissions` field to the JWT payload, and create a `<RequirePermission>` wrapper component for granular gates.

---

## 7. State Management Strategy

### Mirror of Mobile: Zustand + TanStack Query

The same hard rule applies:

> Server state → TanStack Query.  
> Client state → Zustand.  
> Never overlap.

### Zustand Owns

| Store | Contents |
|-------|----------|
| `authStore` | `token, user, isAuthenticated, login(), logout(), reset()` |
| `uiStore` | `sidebarCollapsed, savedFilters, lastVisitedPage` |

That's it. The admin has very little client state — almost everything lives on the server.

### TanStack Query Owns

| Query Key | Endpoint | Refetch Strategy |
|-----------|----------|------------------|
| `['sellers', { status, city, page, search }]` | GET /admin/sellers | on focus, on page change |
| `['seller', id]` | GET /admin/sellers/:id | on focus, on mount |
| `['users', { role, status, page, search }]` | GET /admin/users | on focus |
| `['user', id]` | GET /admin/users/:id | on mount |
| `['orders', { status, sellerId, page, dateRange }]` | GET /admin/orders | on focus, every 30s on live view |
| `['orders', 'live']` | GET /admin/orders?from=24h | every 10s |
| `['order', id]` | GET /admin/orders/:id | on focus |
| `['categories']` | GET /admin/categories | on focus, after mutations |
| `['analytics', 'overview']` | GET /admin/analytics/overview | every 60s, on focus |
| `['analytics', 'orders', { days }]` | GET /admin/analytics/orders | on params change |
| `['analytics', 'top-sellers', { limit }]` | GET /admin/analytics/sellers | on focus |

### Default Query Options

```
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,            // 30s before refetch on focus
      gcTime: 5 * 60_000,           // 5min before unused cache eviction
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: {
      retry: 0,                     // never auto-retry mutations
    },
  },
})
```

### Mutations & Invalidations

After every state-changing action, invalidate the relevant queries:

```
const approveMutation = useMutation({
  mutationFn: (sellerId: string) => sellersApi.approve(sellerId),
  onSuccess: (_, sellerId) => {
    queryClient.invalidateQueries(['sellers']);
    queryClient.invalidateQueries(['seller', sellerId]);
    queryClient.invalidateQueries(['analytics', 'overview']);
    toast.success('Seller approved');
  },
  onError: (err) => toast.error(parseApiError(err).message),
});
```

The convention: invalidate the list and the detail, plus any analytics that count this entity.

### Optimistic Updates

For low-risk mutations (e.g., toggling a category's `is_active`), use optimistic updates to make the UI feel instant:

```
onMutate: async (newData) => {
  await queryClient.cancelQueries(['categories']);
  const previous = queryClient.getQueryData(['categories']);
  queryClient.setQueryData(['categories'], (old) =>
    old.map(c => c.id === newData.id ? { ...c, ...newData } : c)
  );
  return { previous };
},
onError: (_err, _data, context) => {
  queryClient.setQueryData(['categories'], context.previous);
},
```

**Do not** use optimistic updates for:
- Seller approval/rejection (real consequences, must confirm server response)
- Order cancellation (financial impact)
- User suspension (account-level action)

These all wait for server confirmation before updating the UI.

---

## 8. API Layer Architecture

### Axios Client

```
api/client.ts:
  - axios.create({ baseURL: env.VITE_API_URL, timeout: 15000 })
  - Request interceptor: attach `Authorization: Bearer ${authStore.getState().token}`
  - Response interceptor:
      - 2xx → return response.data
      - 401 → authStore.reset() + navigate('/login') + toast "Session expired"
      - 403 → toast "You don't have permission for this action"
      - 422 → return as field errors for forms
      - 5xx → toast "Server error. Please try again."
      - Network error → toast "No internet connection"
```

### One File Per Resource

```
api/sellers.api.ts
  list(params): Promise<PaginatedResponse<Seller>>
  get(id): Promise<Seller>
  approve(id, note?): Promise<Seller>
  reject(id, reason): Promise<Seller>
  suspend(id, reason): Promise<Seller>

api/orders.api.ts
  list(params): Promise<PaginatedResponse<Order>>
  get(id): Promise<Order>
  forceCancel(id, reason): Promise<Order>

api/analytics.api.ts
  overview(): Promise<AnalyticsOverview>
  orderTrends(days): Promise<OrderTrendPoint[]>
  topSellers(limit): Promise<TopSeller[]>
```

Each function returns a typed Promise. The success/error envelope is unwrapped in the interceptor — pages never see it.

---

## 9. Data Tables Architecture

### Stack: TanStack Table v8 (Headless)

TanStack Table provides the **logic** (sorting, filtering, pagination, column visibility, row selection). The UI is built with shadcn/ui `<Table>` primitives.

This separation is critical:
- TanStack Table doesn't dictate visual design
- shadcn/ui doesn't dictate data behavior
- Combined: full customization, zero bloat

### The Generic DataTable Component

```
<DataTable
  columns={columns}
  data={data}
  totalCount={total}
  pagination={{ pageIndex, pageSize, onChange }}
  filters={filters}
  isLoading={isLoading}
/>
```

Used by every list page. Renders:
- Toolbar: search input + faceted filters + column visibility dropdown
- Header: sortable columns with sort indicators
- Body: rows or `<DataTableSkeleton />` while loading
- Pagination: page number + size selector

### Per-Page Column Definitions

```
// pages/sellers/columns.tsx
export const sellerColumns: ColumnDef<Seller>[] = [
  { id: 'business_name', accessorKey: 'business_name', header: 'Business' },
  { id: 'city', accessorKey: 'city', header: 'City' },
  { id: 'status', accessorKey: 'status', cell: ({ row }) => <SellerStatusBadge status={row.original.status} /> },
  { id: 'created_at', accessorKey: 'created_at', header: 'Registered', cell: ({ row }) => <RelativeTime date={row.original.created_at} /> },
  { id: 'actions', cell: ({ row }) => <DataTableRowActions seller={row.original} /> },
];
```

One file per page, defines exactly what's shown.

### Server-Side Pagination & Filtering

The backend handles pagination, sorting, and filtering. The client passes them as query params.

```
const { page, pageSize, sort, filters } = useTableUrlState();

const { data, isLoading } = useQuery({
  queryKey: ['sellers', { page, pageSize, sort, ...filters }],
  queryFn: () => sellersApi.list({ page, pageSize, sort, ...filters }),
});
```

Why server-side: with 10,000+ records, client-side filtering is wasteful (loads everything) and fragile (memory spikes).

### Faceted Filters

Status, city, role — these have a known set of values. The toolbar shows multi-select dropdowns:

```
<DataTableFacetedFilter
  column="status"
  title="Status"
  options={[
    { label: 'Pending', value: 'pending', icon: ClockIcon },
    { label: 'Approved', value: 'approved', icon: CheckIcon },
    { label: 'Rejected', value: 'rejected', icon: XIcon },
  ]}
/>
```

Selection updates URL params, triggers refetch.

### Row Actions Menu

A dropdown menu (3-dot icon) at the end of each row:

```
Sellers row:
  - View details
  - Approve (if pending)
  - Reject (if pending)
  - Suspend (if approved)

Orders row:
  - View details
  - Cancel (force) — only if not delivered/cancelled

Users row:
  - View details
  - Suspend
```

Destructive actions (suspend, cancel, reject) always open a `<ConfirmDialog>` with a required reason input.

---

## 10. URL-as-State Strategy

### URL is the Source of Truth

For list pages, filters and pagination state live in the URL search params, not in component state.

```
/orders?status=pending,accepted&seller_id=abc&page=2&pageSize=50&sort=created_at:desc
```

This is non-negotiable for an admin dashboard. Benefits:
- **Shareable links** — "Look at this order: [URL]"
- **Bookmarkable views** — "Pending sellers in Casablanca"
- **Browser back/forward** — natural navigation through history
- **Refresh-safe** — F5 doesn't lose the filter state

### The useTableUrlState Hook

```
const {
  page, pageSize, sort, filters,
  setPage, setPageSize, setSort, setFilters,
} = useTableUrlState({
  defaultPageSize: 20,
  defaultSort: 'created_at:desc',
});
```

Wraps `useSearchParams` from React Router. Reads from URL on mount, updates URL on change. Pages never call `setSearchParams` directly.

### Debounced Search Input

Text search updates the URL with a 300ms debounce — prevents URL thrashing on every keystroke:

```
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  setFilters({ ...filters, search: debouncedSearch });
}, [debouncedSearch]);
```

---

## 11. Analytics Architecture

### Stack: Recharts

Lightweight, React-native, composable charts. Used for:
- Line chart: daily order trends (last 30/60/90 days)
- Bar chart: orders per seller (top 10)
- Pie chart: category breakdown

For MVP, this is sufficient. Phase 2 considerations: D3 directly (more flexibility) or Tremor (Recharts-based with more presets).

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Dashboard                                                      │
│  Welcome back, [Admin Name]                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Total Users │ │ Orders Today│ │ GMV (Month) │ │ Pending     │
│   1,247     │ │     47      │ │  144,360 MAD│ │ Approvals   │
│ +12% ▲      │ │ +8% ▲       │ │ +23% ▲      │ │     12 ⚠   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

┌──────────────────────────────────┐ ┌─────────────────────────┐
│  Orders Trend (Last 30 Days)     │ │  Top Categories         │
│                                  │ │                         │
│  [Line chart]                    │ │  [Pie chart]            │
│                                  │ │  Tagine 38%             │
│                                  │ │  Couscous 22%           │
└──────────────────────────────────┘ └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Top Sellers (Last 30 Days)                                     │
│                                                                  │
│  [Table: business_name, order_count, total_revenue, avg_order]  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Recent Orders                                                   │
│                                                                  │
│  [Table: 10 most recent orders]                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Loading

All sections fetch in parallel via React Query:

```
const { data: overview } = useQuery(['analytics', 'overview']);
const { data: trends } = useQuery(['analytics', 'orders', { days: 30 }]);
const { data: topSellers } = useQuery(['analytics', 'top-sellers', { limit: 10 }]);
const { data: recentOrders } = useQuery(['orders', { page: 1, pageSize: 10, sort: 'created_at:desc' }]);
```

Each section shows its own skeleton while loading — the page doesn't wait for the slowest one.

### Refresh Strategy

- Overview KPIs: refetch every 60s while page is visible
- Trends chart: refetch on focus, when date range changes
- Top sellers: refetch on focus

The user can click a "Refresh" button in the page header to force a full reload.

### MetricCard Component

```
<MetricCard
  title="Total Orders Today"
  value={47}
  trend={{ value: 8, direction: 'up' }}     // "+8% ▲"
  comparison="vs. yesterday"
  icon={ShoppingBagIcon}
/>
```

Trend logic: compare current period to previous period. If unknown (first-time use), show no trend indicator.

---

## 12. Seller Approval Workflow

### Default View: Pending Tab

`/sellers` route opens with the **Pending** filter active by default. This is intentional — the admin's primary task is reviewing new applications.

```
Tabs at top: [Pending (12)] [Approved] [Rejected] [Suspended] [All]
```

The badge on "Pending" shows the count, fetched from a lightweight query that runs every 60s.

### Pending Sellers Table

| Column | Source |
|--------|--------|
| Business Name | seller_profiles.business_name |
| Contact | users.name + users.phone |
| City | seller_profiles.city |
| Registered | seller_profiles.created_at (relative time) |
| Quick Actions | "Review" button → SellerDetailPage |

The row is fully clickable — clicking anywhere navigates to the detail page.

### Seller Detail Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Sellers                                               │
│  Dar Khadija Kitchen                          [Status: Pending]  │
│  Registered 3 days ago by Khadija Benali                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐ ┌─────────────────────────┐
│  Business Information            │ │  Owner Account          │
│                                  │ │                         │
│  Name: Dar Khadija Kitchen       │ │  Name: Khadija Benali   │
│  Bio: Authentic Moroccan...      │ │  Email: khadija@...     │
│  Address: Rue Hassan II          │ │  Phone: +212698765432   │
│  City: Casablanca                │ │  Registered: 3 days ago │
│  Delivery Radius: 8 km           │ │                         │
└──────────────────────────────────┘ └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Actions                                                         │
│                                                                  │
│  [✓ Approve]  [✗ Reject]                                         │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Audit Log                                                       │
│                                                                  │
│  • Registered — 3 days ago                                       │
│  (Future entries will appear here)                               │
└──────────────────────────────────────────────────────────────────┘
```

### Approve Flow

1. Admin clicks **Approve**
2. Confirmation dialog: "Approve [Business Name]?" with optional note field
3. Submit → `PATCH /admin/sellers/:id/approve { note }`
4. Loading spinner on the button (mutation pending)
5. Server returns updated seller
6. React Query invalidates `['sellers']`, `['seller', id]`, `['analytics', 'overview']`
7. Toast: "Seller approved successfully"
8. UI re-renders with new status badge
9. Audit log section shows: "Approved by [Admin Name] — just now"

The seller's user account receives an FCM notification automatically (server-side from `seller.admin.service.js`).

### Reject Flow

1. Admin clicks **Reject**
2. Modal with required reason textarea (10–500 chars):
   - "Why are you rejecting this application?"
   - Examples shown as placeholder: "Documents incomplete", "Unable to verify identity", etc.
3. Submit → `PATCH /admin/sellers/:id/reject { reason }`
4. Same invalidation + toast pattern as approve
5. Seller receives FCM with the reason

The reason is stored in `seller_profiles.rejection_reason` and shown in the audit log.

### Approved Sellers — Suspend Flow

For approved sellers, the action menu changes to **Suspend**:

1. Admin opens detail page of an approved seller
2. Clicks **Suspend** (a destructive action — red button)
3. Modal: "Suspend [Business Name]?"
   - Required reason textarea
   - Warning: "All active orders will continue. The seller cannot accept new orders."
4. Submit → `PATCH /admin/sellers/:id/suspend { reason }`
5. Status changes to suspended → seller cannot log in / access seller features

---

## 13. Order Monitoring Architecture

### Two Views

| View | Purpose |
|------|---------|
| `/orders` | Searchable, filterable table of all orders |
| `/orders/live` | Auto-refreshing feed of recent orders |

### Orders List Page

Standard DataTable pattern with:

**Filters:**
- Status (multi-select: pending, accepted, preparing, ready, delivered, cancelled)
- Date range picker (default: last 7 days)
- Seller (typeahead search)
- Customer (typeahead search)
- Auto-cancelled (boolean filter)
- Total amount range (Phase 2)

**Columns:**
- Order ID (shortened: `#i9j0k1l2`)
- Customer name
- Seller business name
- Status (color-coded badge)
- Total amount
- Placed (relative time)
- Actions menu

**Sorting:**
- Created at (default DESC)
- Total amount
- Status (alphabetical for filtering by stuck statuses)

### Live Orders Page

A specialized view for operational monitoring:

```
┌────────────────────────────────────────────────────────────────┐
│  Live Orders                          Last refreshed: 4s ago    │
│  Auto-refreshing every 10 seconds                              │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ⚠ 2 orders pending > 20 minutes                                │
│                                                                 │
│  • Order #abc123 — pending 23m — Dar Khadija → Customer Y      │
│  • Order #def456 — pending 28m — Lalla Touria → Customer Z     │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Last Hour (47 orders)                                          │
│                                                                 │
│  [Color-coded list — pending orange, accepted blue, etc.]      │
└─────────────────────────────────────────────────────────────────┘
```

### Pending-Order Alert

Orders with `status = 'pending'` and `created_at < 20 minutes ago` are highlighted in red at the top of the live view. The admin can click into them to:
- Contact the seller (phone number shown)
- Force-cancel with reason ("Seller unresponsive")

The 30-minute auto-cancel cron job (`backend/src/jobs/autoCancelOrders.js`) is the safety net. The live view is the proactive surface.

### Real-Time Updates (Optional)

Two approaches:

**Approach A (MVP — simple):** `useQuery` with `refetchInterval: 10_000`. Polls every 10 seconds. No socket connection. Sufficient for an admin viewing a few hundred orders.

**Approach B (Phase 2 — fancy):** socket.io subscription to a global `orders:all` room. The backend emits `order:created`, `order:status_changed` to this room. The admin's React Query cache is updated incrementally.

MVP starts with Approach A. The polling overhead is negligible — one query every 10 seconds.

### Order Detail Page

```
┌────────────────────────────────────────────────────────────────┐
│  ← Back to Orders                                                │
│  Order #i9j0k1l2                              [Status: Accepted] │
│  Placed 2 hours ago by Fatima El Amrani                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐ ┌─────────────────────────┐
│  Order Items                     │ │  Customer               │
│                                  │ │                         │
│  Tagine Poulet x2     130 MAD    │ │  Name: Fatima El Amrani │
│  Harira       x1       25 MAD    │ │  Phone: +212612345678   │
│                                  │ │  Email: fatima@...      │
│  Subtotal: 155 MAD               │ │                         │
│  Total:    155 MAD               │ ├─────────────────────────┤
└──────────────────────────────────┘ │  Seller                 │
                                     │                         │
                                     │  Dar Khadija Kitchen    │
                                     │  Phone: +212698765432   │
                                     │  City: Casablanca       │
                                     └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Delivery Address                                                │
│                                                                  │
│  12 Rue Hassan II, Apt 3                                         │
│  Maârif, Casablanca                                              │
│  Landmark: Facing Carrefour, blue door                           │
│  Notes: 2nd floor, ring bell twice                               │
│  Customer note: No spicy please                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Status Timeline                                                 │
│                                                                  │
│  ✓ Placed                    2 hours ago                         │
│  ✓ Accepted                  1h 45m ago — by seller              │
│  ◯ Preparing                                                     │
│  ◯ Ready                                                         │
│  ◯ Delivered                                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Admin Actions                                                   │
│                                                                  │
│  [⚠ Force Cancel]   (only available if not delivered/cancelled)  │
└─────────────────────────────────────────────────────────────────┘
```

### Force Cancel Flow

1. Admin clicks **Force Cancel**
2. Alert dialog (red, irreversible):
   - "Force cancel order #i9j0k1l2?"
   - "Both the customer and the seller will be notified. This cannot be undone."
   - Required reason textarea
3. Submit → `PATCH /admin/orders/:id/cancel { reason }`
4. Order status → cancelled
5. Both parties receive FCM notification with the admin's reason
6. Audit entry logged

---

## 14. Forms & Validation

### Stack: React Hook Form + Zod

```
const formSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
});
```

### Why Zod (not Joi)

- Zod is TypeScript-native — types are inferred from schema (`z.infer<typeof schema>`)
- The frontend doesn't need to share schemas with the backend (backend uses Joi)
- Smaller bundle than Joi
- Better DX in TypeScript projects

The backend stays on Joi. The mismatch is acceptable because each side validates its own concerns — the backend is authoritative.

### Form Components Pattern

shadcn/ui's `<Form>` primitive integrates with React Hook Form:

```
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="reason"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Reason</FormLabel>
          <FormControl><Textarea {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit" disabled={form.formState.isSubmitting}>Submit</Button>
  </form>
</Form>
```

### Server-Side Error Mapping

When the API returns `VALIDATION_ERROR` with `details`, map each field error back to the form:

```
catch (err) {
  const apiError = parseApiError(err);
  if (apiError.fieldErrors) {
    Object.entries(apiError.fieldErrors).forEach(([field, message]) => {
      form.setError(field, { message });
    });
  } else {
    toast.error(apiError.message);
  }
}
```

---

## 15. Error Handling

### Four Error Surfaces

| Type | Display | Used For |
|------|---------|----------|
| Inline field error | Below form input (`<FormMessage>`) | Validation errors |
| Toast | Top-right (sonner) | Mutation failures, network errors |
| Page-level error | Replaces page content | Failed data fetch, 404, 500 |
| Error boundary | Replaces entire shell | Unhandled exceptions |

### Page-Level Error

When a `useQuery` returns an error and there's no cached data:

```
if (isError) {
  return <ErrorPage error={error} onRetry={refetch} />;
}
```

`<ErrorPage>` shows:
- Error icon (lucide AlertCircle)
- Friendly message (parsed from error code)
- Retry button
- Back to dashboard link

### React Router Error Boundary

Each route can have an `errorElement`. The root route has a catch-all:

```
{
  path: '/',
  element: <AppLayout />,
  errorElement: <ErrorPage />,
  children: [...]
}
```

This catches errors that occur during route rendering — not data-fetching errors (those are handled by useQuery).

### Toast Notifications (sonner)

```
toast.success('Seller approved');
toast.error('Failed to load orders');
toast.info('5 new orders received');
toast.promise(approveMutation.mutateAsync(id), {
  loading: 'Approving seller...',
  success: 'Seller approved',
  error: (err) => parseApiError(err).message,
});
```

Toasts stack top-right, auto-dismiss after 4 seconds, can be dismissed manually.

---

## 16. Theme & Design System

### shadcn/ui + Tailwind

shadcn/ui ships with a CSS variable–based theming system:

```
/* index.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 14 92% 47%;          /* #E8520A — @ZAY orange */
  --primary-foreground: 0 0% 100%;
  --muted: 210 40% 96.1%;
  --border: 214.3 31.8% 91.4%;
  /* ... full token set ... */
}

.dark { /* Phase 2 */ }
```

Tailwind reads these via `tailwind.config.ts`:

```
colors: {
  primary: 'hsl(var(--primary))',
  background: 'hsl(var(--background))',
  /* ... */
}
```

### Brand Customization

The default shadcn palette is grayscale + a single accent. Customization is one variable change:

```
--primary: 14 92% 47%;   /* @ZAY orange */
```

Every primary button, link, and accent element updates automatically.

### Typography

```
font-sans: 'Inter', system-ui, sans-serif        /* All body, UI */
font-serif: 'Playfair Display', serif            /* Page headers, brand moments */
```

Inter loaded via `@fontsource/inter`. Playfair Display via `@fontsource/playfair-display`. No external CDN — bundled with the build.

### Status Color System

Encoded in `constants/orderStatus.ts`:

```
orderStatusConfig = {
  pending:   { label: 'Pending',   bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-200' },
  accepted:  { label: 'Accepted',  bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200'  },
  preparing: { label: 'Preparing', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200'},
  ready:     { label: 'Ready',     bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200'},
  delivered: { label: 'Delivered', bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-200'   },
};
```

`<OrderStatusBadge status={status} />` reads from this config. One source of truth for status colors across every page.

### Spacing & Density

Admin tools should be **dense** — admins don't need touch-target padding. shadcn defaults are slightly more spacious than typical admin UIs. Override:

```
/* Compact table cells */
.table-cell { @apply px-3 py-2; }   /* vs default px-4 py-3 */

/* Compact form rows */
.form-item { @apply space-y-1; }    /* vs default space-y-2 */
```

This gets more data per screen — critical for ops productivity.

---

## 17. Layout & Navigation UX

### Standard Admin Shell

```
┌──────┬──────────────────────────────────────────────────────────┐
│      │  Topbar (search, notifications, user menu)               │
│      ├──────────────────────────────────────────────────────────┤
│      │                                                           │
│      │                                                           │
│ Side │                                                           │
│ bar  │              Page Content (<Outlet />)                    │
│      │                                                           │
│      │                                                           │
│      │                                                           │
└──────┴───────────────────────────────────────────────────────────┘
```

### Sidebar

```
@ZAY Admin
─────────────
📊 Dashboard
👥 Sellers       (badge: pending count)
👤 Users
📦 Orders
   ├ All Orders
   └ Live View
🏷  Categories
📈 Analytics
─────────────
⚙  Settings
```

Width: 240px expanded, 56px collapsed (icons only).
Toggle button at the top of the sidebar — state persisted in `uiStore`.
Active route highlighted with primary color background.
The pending count badge on **Sellers** is refetched every 60s.

### Topbar

```
┌──────────────────────────────────────────────────────────────┐
│  [Search anything... ⌘K]              🔔(3)   [Avatar] ▼     │
└──────────────────────────────────────────────────────────────┘
```

- **Command palette trigger** (⌘K or Ctrl-K): opens `<CommandPalette>` (cmdk library, shadcn-styled)
- **Notifications bell**: shows admin alerts (Phase 2 — server-side admin notifications)
- **User menu dropdown**: profile name, "Settings", "Log Out"

### Command Palette (⌘K)

The killer feature of modern admin tools. Press `⌘K` from anywhere:

```
┌──────────────────────────────────────────┐
│  🔍 Type a command or search...           │
├──────────────────────────────────────────┤
│  Pages                                    │
│  📊 Go to Dashboard                       │
│  👥 Go to Sellers                         │
│  📦 Go to Orders                          │
│                                           │
│  Search                                   │
│  🔎 Find seller "khadija"                 │
│  🔎 Find order #i9j0k1l2                  │
│                                           │
│  Actions                                  │
│  ⚡ Toggle sidebar                         │
│  🌙 Toggle dark mode (Phase 2)            │
└──────────────────────────────────────────┘
```

Implementation: cmdk's `<Command>` component, populated dynamically based on user input.

### Breadcrumbs

Every page renders breadcrumbs in the header:

```
Dashboard / Sellers / Dar Khadija Kitchen
```

Generated from the route hierarchy. Last item is bold (current page).

### Page Header Pattern

```
<PageHeader
  title="Sellers"
  description="Manage seller applications and active sellers"
  actions={<Button>Export CSV</Button>}  // Phase 2
/>
```

Consistent across every page. Title is `font-serif text-2xl`. Description is `text-muted-foreground`.

---

## 18. Keyboard Shortcuts

Power users navigate admin tools with the keyboard. Shortcuts are listed in a "?" modal accessible via Shift+?.

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl-K` | Open command palette |
| `g` then `d` | Go to Dashboard |
| `g` then `s` | Go to Sellers |
| `g` then `u` | Go to Users |
| `g` then `o` | Go to Orders |
| `g` then `a` | Go to Analytics |
| `/` | Focus search input on the current page |
| `Esc` | Close any open modal/dialog |
| `Shift+?` | Show shortcuts help |
| `j` / `k` | Navigate table rows (down/up) — Phase 2 |
| `Enter` | Open selected table row — Phase 2 |

Implementation: `useKeyboardShortcuts` hook registers global listeners. Cleans up on unmount.

---

## 19. Responsive Strategy

### Desktop-First, Tablet-Acceptable

The admin dashboard is built for desktop browsers (1280px+). Tablets in landscape (1024px+) are acceptable. Mobile browsers are **explicitly not supported**.

This is the right call:
- Admins work at desks
- Dense tables don't fit on phone screens
- Building a mobile-responsive admin doubles the design+test surface area
- No real admin uses a phone for serious work

### Breakpoints (Tailwind defaults)

```
sm:  640px   — not used
md:  768px   — tablet portrait minimum
lg:  1024px  — tablet landscape / small laptop
xl:  1280px  — primary target
2xl: 1536px  — large monitors
```

### Mobile Fallback

For viewport widths < 768px, show a friendly message:

```
"@ZAY Admin Dashboard is designed for desktop browsers.
 Please open this on a tablet or computer."
```

### Sidebar Auto-Collapse

Below `lg`, the sidebar auto-collapses to icons. Users can re-expand manually. State persisted via `uiStore`.

### Tables Overflow

Tables that exceed viewport width get horizontal scroll within their container. Pinned columns (first column always visible) used for wide tables — TanStack Table supports this with `enablePinning`.

---

## 20. Complete Pages Inventory

### Total: 11 pages

| # | Page | Path | Description |
|---|------|------|-------------|
| 1 | LoginPage | `/login` | Email + password form |
| 2 | DashboardPage | `/dashboard` | KPI cards + recent orders + alerts |
| 3 | SellersListPage | `/sellers` | Tabbed table: Pending / Approved / Rejected / Suspended / All |
| 4 | SellerDetailPage | `/sellers/:id` | Full profile + approve/reject/suspend actions |
| 5 | UsersListPage | `/users` | All users with role + status filters |
| 6 | UserDetailPage | `/users/:id` | Profile + order history + suspend action |
| 7 | OrdersListPage | `/orders` | Full order search with all filters |
| 8 | LiveOrdersPage | `/orders/live` | Auto-refreshing operational view |
| 9 | OrderDetailPage | `/orders/:id` | Order details + status history + force cancel |
| 10 | CategoriesPage | `/categories` | CRUD table with inline editing |
| 11 | AnalyticsPage | `/analytics` | Charts + trends + top sellers |
| 12 | SettingsPage | `/settings` | Admin profile, password change (Phase 2) |
| 13 | NotFoundPage | `*` | 404 with link back to dashboard |

---

## 21. UI/UX Recommendations

### Density Over Comfort

Admin tools are not consumer apps. Default Tailwind/shadcn padding is too generous for ops work. Reduce padding in tables, forms, and cards by ~25%. More data per screen = faster decisions.

### Color-Coded Status Everywhere

Status is the single most important data point on every list. Status badges use color + label + icon (not color alone — accessibility):

```
🟡 Pending    🔵 Accepted    🟣 Preparing    🟢 Delivered    🔴 Cancelled
```

Never use color alone to convey meaning. Color-blind admins must be able to distinguish status.

### Confirmation Dialogs for Destructive Actions

Every action that has consequences for a real user requires a confirmation:

- Approve seller → simple confirmation
- **Reject seller → modal with required reason** (10+ chars)
- **Suspend seller → modal with required reason**
- **Suspend user → modal with required reason**
- **Force-cancel order → alert dialog with required reason**
- Delete category → simple confirmation (deactivate, not hard delete)

Use shadcn's `<AlertDialog>` (more emphatic than `<Dialog>`) for irreversible actions.

### Loading States

Use **skeletons** for tables and cards, not spinners. A skeleton communicates the shape of what's loading:

```
[████████████]  [██████]  [████████████████]
[████████]      [██████]  [████████████████]
[████████████]  [██████]  [████████████████]
```

Far better UX than a centered spinner.

### Empty States

Every list page has an empty state with a clear next action:

```
"No sellers yet"
"When sellers register, they'll appear here for approval."
[Refresh]
```

```
"No orders in the last 7 days"
"Adjust the date range or check live orders."
[Show All Orders]  [Live View]
```

### "Last Refreshed" Indicators

On any page with auto-refreshing data (live orders, dashboard KPIs):

```
Last refreshed: 4 seconds ago  [↻ Refresh now]
```

The refresh button triggers an immediate refetch. The timestamp updates every second via a tiny `setInterval`.

### Search Should Be Fast

The toolbar search input:
- Debounced 300ms (no thrashing)
- Loading indicator within the input while fetching
- Esc clears the input
- `/` focuses it from anywhere on the page

### Hover States Are Informative

Hovering a row shows:
- Background change (subtle gray)
- Cursor pointer
- The "Actions" 3-dot menu becomes visible (hidden by default to reduce visual noise)

### Tooltips for Icons

Every icon-only button has a tooltip. Hover delay 500ms. Use shadcn's `<Tooltip>`.

### Avatar Defaults

Users without avatars get initials in a colored circle. Color is derived deterministically from the user ID (so the same user always gets the same color). This is more polished than a generic "no photo" placeholder.

### Print-Friendly Detail Pages

Order detail and seller detail pages should print cleanly (admin may need physical receipts):

- Hide sidebar/topbar via `print:hidden` Tailwind utilities
- Single-column layout in print
- Status badges remain visible (use `print-color-adjust: exact`)

### Page Titles Update the Browser Tab

```
"Sellers · @ZAY Admin"
"Order #i9j0k1l2 · @ZAY Admin"
"Dashboard · @ZAY Admin"
```

Admins frequently work across multiple tabs. Descriptive titles save time.

### No Dark Mode in MVP

shadcn supports dark mode, but it adds testing surface area. Defer to Phase 2. The token system is already dark-mode-ready — only the values change.

### No Internationalization in MVP

Admin UI in French (matches Moroccan business language). Phase 2 may add Arabic for Moroccan admins who prefer it. Page text lives in component files for now; extract to `i18n` files when needed.
