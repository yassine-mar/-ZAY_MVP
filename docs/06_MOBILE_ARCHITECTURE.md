# @ZAY — Mobile App Architecture

> **Status:** Definitive Mobile Engineering Architecture — MVP  
> **Audience:** Mobile engineers, design-engineering collaborators  
> **Scope:** Architecture, navigation, state, theming, flows. Companion to [`06_MOBILE_UX.md`](06_MOBILE_UX.md) (which covers visual design, screen mockups, copy).  
> **Constraint:** Documentation only. No UI code generated in this document.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Architecture Pattern](#2-architecture-pattern)
3. [Complete Folder Structure](#3-complete-folder-structure)
4. [Navigation Architecture](#4-navigation-architecture)
5. [Authentication Flow](#5-authentication-flow)
6. [State Management Strategy](#6-state-management-strategy)
7. [API Layer Architecture](#7-api-layer-architecture)
8. [Real-Time Layer (Socket.io)](#8-real-time-layer-socketio)
9. [Push Notifications](#9-push-notifications)
10. [Reusable Components Strategy](#10-reusable-components-strategy)
11. [Complete Screen Inventory](#11-complete-screen-inventory)
12. [Form Validation Architecture](#12-form-validation-architecture)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [Theme & Design System](#14-theme--design-system)
15. [Responsive Strategy](#15-responsive-strategy)
16. [Image Handling](#16-image-handling)
17. [Offline & Network Resilience](#17-offline--network-resilience)
18. [Performance Optimization](#18-performance-optimization)
19. [User Flows](#19-user-flows)
20. [Navigation Diagram](#20-navigation-diagram)
21. [Senior Mobile Architect Critique](#21-senior-mobile-architect-critique)

---

## 1. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React Native + Expo (managed workflow) | OTA updates, no native code maintenance, faster MVP |
| Language | TypeScript | Type safety on a 21-screen app prevents real bugs |
| Navigation | React Navigation 6 | Industry standard, stack/tab/drawer composable |
| Server state | TanStack Query (React Query v5) | Caching, refetching, optimistic updates, dedupe |
| Client state | Zustand | Minimal, no boilerplate, no Provider hell |
| HTTP | axios | Interceptors are essential for auth + error normalization |
| Forms | React Hook Form | Uncontrolled inputs, lowest re-render cost |
| Validation | Joi (schemas shared with backend) | Same validation rules client and server |
| Storage (sensitive) | expo-secure-store | OS keychain — JWT, refresh tokens |
| Storage (other) | AsyncStorage | Cart, onboarding flag, UI preferences |
| Real-time | socket.io-client | Mirror of backend stack |
| Push | expo-notifications | Abstracts FCM (Android) + APNS (iOS) |
| Images | expo-image | Modern caching, fast, WebP support |
| Date | date-fns | Tree-shakeable, smaller than moment.js |
| Icons | @expo/vector-icons | Feather + Ionicons sets |
| Animations | react-native-reanimated 3 | UI thread animations, 60fps gestures |
| Gestures | react-native-gesture-handler | Required by Reanimated |
| Localization | i18next + react-i18next (Phase 2) | French MVP, Arabic/English later |

### What's NOT in the Stack

- **Redux/Redux Toolkit** — Zustand + React Query covers the full state problem at 10% of the complexity
- **Styled-components** — adds runtime overhead; we use StyleSheet + a typed theme object instead
- **Formik** — slower than React Hook Form, more re-renders
- **MobX** — extra learning curve, not needed for this scale
- **React Native CLI bare workflow** — Expo managed is sufficient for MVP. Eject only if needed.

---

## 2. Architecture Pattern

### Feature-Folder Hybrid

The mobile app uses a **hybrid architecture**: code is organized by **layer at the top level** (`screens/`, `components/`, `api/`, `store/`) and by **feature inside each layer** (`screens/customer/`, `screens/seller/`). This is the React Native community's de facto standard for apps of this size.

### Why Not Strict Atomic Design

Atomic Design (atoms → molecules → organisms → templates → pages) works well for design systems with 50+ components. @ZAY MVP has ~15 reusable UI components. The atomic taxonomy would create 5 folder layers for 3 components per folder — overhead with no payoff.

### Why Not Strict Feature-Based

Pure feature-based (`features/cart/`, `features/orders/` containing screens + components + state for each feature) shines at 100+ files per feature. @ZAY MVP has 4-8 files per feature. The duplication of layer boundaries inside every feature creates more cognitive load than it removes.

### The Rule

```
screens/         organized by USER ROLE (auth, customer, seller)
components/      organized by REUSABILITY TYPE (ui, forms, domain)
api/             organized by RESOURCE (auth, orders, browse)
store/           one file per Zustand store
hooks/           shared cross-feature hooks
services/        cross-cutting orchestration (auth, notifications, socket)
theme/           design tokens (colors, spacing, typography)
utils/           pure utility functions
constants/       static config
types/           TypeScript shared types
```

If a component is used by both customer and seller screens → `components/`.
If a screen is only used by one role → `screens/{role}/`.

---

## 3. Complete Folder Structure

```
mobile/
│
├── App.tsx                          # Root: providers, navigation entry
├── app.json                         # Expo config (name, bundle ID, plugins)
├── babel.config.js                  # Reanimated plugin required
├── metro.config.js                  # SVG transformer config
├── tsconfig.json                    # TypeScript strict mode
├── package.json
├── .env                             # API_BASE_URL, etc.
├── eas.json                         # EAS Build profiles
│
├── src/
│   │
│   ├── api/                         # HTTP layer
│   │   ├── client.ts                # axios instance + interceptors
│   │   ├── auth.api.ts              # register, login, logout
│   │   ├── users.api.ts             # getMe, updateMe, uploadAvatar, fcm-token
│   │   ├── browse.api.ts            # public: sellers, items, categories
│   │   ├── menus.api.ts             # seller menu CRUD
│   │   ├── items.api.ts             # seller item CRUD + image
│   │   ├── orders.api.ts            # customer-side orders
│   │   ├── seller.api.ts            # seller profile + incoming orders
│   │   ├── notifications.api.ts     # list, mark read, unread count
│   │   └── upload.api.ts            # multipart helpers
│   │
│   ├── components/
│   │   ├── ui/                      # Reusable primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Text.tsx             # Theme-aware Text wrapper
│   │   │   ├── Card.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Icon.tsx
│   │   │   ├── Image.tsx            # expo-image wrapper with placeholder
│   │   │   ├── Spinner.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Divider.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── SkeletonLoader.tsx
│   │   │   ├── KeyboardAvoidingScreen.tsx
│   │   │   └── SafeScreen.tsx       # SafeAreaView + status bar setup
│   │   │
│   │   ├── forms/                   # Form-specific (uses RHF Controller)
│   │   │   ├── FormInput.tsx
│   │   │   ├── FormButton.tsx
│   │   │   ├── FormSelect.tsx
│   │   │   ├── FormSwitch.tsx
│   │   │   ├── PhoneInput.tsx       # +212 prefix, format mask
│   │   │   ├── PasswordInput.tsx    # eye toggle, strength hint
│   │   │   ├── PriceInput.tsx       # MAD suffix, number-only
│   │   │   └── ImagePicker.tsx      # camera + library picker
│   │   │
│   │   ├── feedback/                # Errors, loading, empty states
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ErrorScreen.tsx      # Full-screen error with retry
│   │   │   ├── LoadingScreen.tsx
│   │   │   └── NoNetworkBanner.tsx
│   │   │
│   │   └── domain/                  # Business-aware components
│   │       ├── FoodCard.tsx
│   │       ├── SellerCard.tsx
│   │       ├── CategoryChip.tsx
│   │       ├── CategoryGrid.tsx
│   │       ├── OrderCard.tsx
│   │       ├── OrderStatusBadge.tsx
│   │       ├── OrderTimeline.tsx    # vertical status stepper
│   │       ├── CartItemRow.tsx
│   │       ├── CartSummary.tsx
│   │       ├── PriceTag.tsx
│   │       ├── SellerStatusBanner.tsx  # pending/rejected/suspended
│   │       └── NotificationRow.tsx
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── RegisterSellerScreen.tsx
│   │   │
│   │   ├── customer/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── SearchScreen.tsx
│   │   │   ├── CategoryScreen.tsx
│   │   │   ├── SellerProfileScreen.tsx
│   │   │   ├── ItemDetailScreen.tsx
│   │   │   ├── CartScreen.tsx
│   │   │   ├── CheckoutScreen.tsx
│   │   │   ├── OrdersListScreen.tsx
│   │   │   ├── OrderDetailScreen.tsx
│   │   │   ├── NotificationsScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── EditProfileScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   │
│   │   ├── seller/
│   │   │   ├── PendingApprovalScreen.tsx
│   │   │   ├── RejectedScreen.tsx
│   │   │   ├── SuspendedScreen.tsx
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── IncomingOrdersScreen.tsx
│   │   │   ├── SellerOrderDetailScreen.tsx
│   │   │   ├── MenuListScreen.tsx
│   │   │   ├── MenuDetailScreen.tsx
│   │   │   ├── AddItemScreen.tsx
│   │   │   ├── EditItemScreen.tsx
│   │   │   ├── SellerProfileScreen.tsx
│   │   │   ├── EditSellerProfileScreen.tsx
│   │   │   └── SellerAnalyticsScreen.tsx
│   │   │
│   │   └── shared/
│   │       └── LoadingScreen.tsx    # Initial app load while hydrating auth
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx        # Branches: Auth | Customer | Seller | Pending
│   │   ├── AuthStack.tsx
│   │   ├── CustomerTabs.tsx
│   │   ├── CustomerHomeStack.tsx
│   │   ├── CustomerOrdersStack.tsx
│   │   ├── CustomerProfileStack.tsx
│   │   ├── SellerTabs.tsx
│   │   ├── SellerOrdersStack.tsx
│   │   ├── SellerMenuStack.tsx
│   │   ├── SellerProfileStack.tsx
│   │   ├── PendingSellerStack.tsx
│   │   ├── linking.ts               # Deep link config
│   │   ├── navigationRef.ts         # Imperative navigation from outside React tree
│   │   └── types.ts                 # Typed routes & params
│   │
│   ├── store/
│   │   ├── auth.store.ts            # { user, token, login, logout, hydrate }
│   │   ├── cart.store.ts            # { items, sellerId, add, remove, clear }
│   │   ├── ui.store.ts              # { theme, language, hasOnboarded }
│   │   └── socket.store.ts          # { isConnected, subscribedOrders }
│   │
│   ├── hooks/
│   │   ├── useAuth.ts               # auth store selectors + helpers
│   │   ├── useCart.ts               # cart store selectors + helpers
│   │   ├── useDebounce.ts           # search input debounce
│   │   ├── useSocket.ts             # socket connect lifecycle
│   │   ├── useOrderUpdates.ts       # subscribe to order room
│   │   ├── usePushNotifications.ts  # permission + token registration
│   │   ├── useToast.ts              # imperative toast API
│   │   ├── useKeyboard.ts           # keyboard height + visibility
│   │   └── useAppState.ts           # foreground/background events
│   │
│   ├── services/
│   │   ├── auth.service.ts          # login → token storage → hydrate
│   │   ├── notifications.service.ts # request permission, register token, handle tap
│   │   ├── socket.service.ts        # socket.io client init + auth handshake
│   │   ├── storage.service.ts       # SecureStore + AsyncStorage wrapper
│   │   └── deeplink.service.ts      # handle notification taps + share URLs
│   │
│   ├── theme/
│   │   ├── colors.ts                # palette + semantic tokens
│   │   ├── typography.ts            # 11 text styles
│   │   ├── spacing.ts               # 8pt grid
│   │   ├── radii.ts                 # border radius scale
│   │   ├── shadows.ts               # iOS + Android shadow defs
│   │   └── index.ts                 # exports the merged theme object
│   │
│   ├── utils/
│   │   ├── format.ts                # formatPrice, formatDate, formatPhone
│   │   ├── validation.ts            # Joi schemas mirroring backend
│   │   ├── error.ts                 # parseApiError → user-facing message
│   │   ├── orderState.ts            # transition checks, status labels
│   │   └── cartMath.ts              # subtotals, totals
│   │
│   ├── constants/
│   │   ├── api.ts                   # BASE_URL, timeouts
│   │   ├── orderStatus.ts           # status enum + labels + colors
│   │   ├── cities.ts                # Moroccan cities list
│   │   ├── notificationTypes.ts
│   │   └── config.ts                # feature flags, deep link prefix
│   │
│   ├── types/
│   │   ├── api.types.ts             # ApiResponse<T>, PaginatedResponse<T>
│   │   ├── domain.types.ts          # User, Seller, Order, Item, Notification
│   │   └── navigation.types.ts      # RouteParamList types
│   │
│   └── localization/
│       ├── i18n.ts                  # i18next init
│       ├── fr.json                  # French (primary — MVP)
│       ├── ar.json                  # Arabic (Phase 2)
│       └── en.json                  # English (Phase 2)
│
└── assets/
    ├── images/                      # PNGs, splash, app icon
    ├── icons/                       # Custom SVG icons
    └── fonts/
        ├── Inter-Regular.ttf
        ├── Inter-Medium.ttf
        ├── Inter-SemiBold.ttf
        ├── Inter-Bold.ttf
        └── PlayfairDisplay-Bold.ttf
```

**Total:** ~120 files across 14 directories.

---

## 4. Navigation Architecture

### Navigation Library: React Navigation 6

The app uses three navigator types from React Navigation:

| Navigator | Purpose | Where |
|-----------|---------|-------|
| **Stack** | Push/pop screens with history | Auth flow, nested role tabs |
| **Bottom Tabs** | Top-level role-based navigation | Customer + Seller main views |
| **Modal Stack** | Cart, checkout, image viewers | Presented from anywhere |

### Navigation Tree

```
RootNavigator (Stack — switches based on auth state)
│
├── LoadingScreen                 (initial hydrate)
│
├── AuthStack                     (not authenticated)
│   ├── WelcomeScreen
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── RegisterSellerScreen
│
├── CustomerTabs                  (role: customer, authenticated)
│   ├── HomeStack
│   │   ├── HomeScreen
│   │   ├── SearchScreen
│   │   ├── CategoryScreen
│   │   ├── SellerProfileScreen
│   │   └── ItemDetailScreen
│   ├── OrdersStack
│   │   ├── OrdersListScreen
│   │   └── OrderDetailScreen
│   ├── NotificationsScreen
│   └── ProfileStack
│       ├── ProfileScreen
│       ├── EditProfileScreen
│       └── SettingsScreen
│
├── SellerTabs                    (role: seller, status: approved)
│   ├── DashboardScreen           (today's KPIs)
│   ├── OrdersStack
│   │   ├── IncomingOrdersScreen
│   │   └── SellerOrderDetailScreen
│   ├── MenuStack
│   │   ├── MenuListScreen
│   │   ├── MenuDetailScreen
│   │   ├── AddItemScreen
│   │   └── EditItemScreen
│   └── ProfileStack
│       ├── SellerProfileScreen
│       ├── EditSellerProfileScreen
│       ├── SellerAnalyticsScreen
│       └── SettingsScreen
│
├── PendingSellerStack            (role: seller, status: pending)
│   ├── PendingApprovalScreen
│   └── ProfileScreen             (limited — view/edit account only)
│
├── RejectedSellerScreen          (role: seller, status: rejected)
│
├── SuspendedScreen               (any role, status: suspended)
│
└── Modal screens (presented from any stack)
    ├── CartScreen
    └── CheckoutScreen
```

### Why Conditional Navigators (not protected routes)

React Navigation 6 supports two patterns for auth-gated screens:

1. **Conditional rendering at root** (chosen): branch the entire navigator tree based on auth state. Logged-out users literally cannot navigate to a customer screen because that screen doesn't exist in the navigator.

2. **Protected routes with HOCs** (rejected): every screen wrapped with a checker. More files, more cognitive overhead, easier to forget.

The conditional pattern provides better UX (smooth transitions on login/logout), better security (no accidental access), and simpler code.

### Branch Logic in RootNavigator

```
function RootNavigator() {
  const { isHydrated, user, isAuthenticated } = useAuth();

  if (!isHydrated)            return <LoadingScreen />;
  if (!isAuthenticated)       return <AuthStack />;
  if (user.status === 'suspended') return <SuspendedScreen />;
  if (user.role === 'customer')    return <CustomerTabs />;
  if (user.role === 'seller') {
    const status = user.sellerProfile?.status;
    if (status === 'approved')     return <SellerTabs />;
    if (status === 'rejected')     return <RejectedSellerScreen />;
    /* pending */                  return <PendingSellerStack />;
  }
  return <AuthStack />;
}
```

When the auth store updates (login, logout, profile refresh), React Navigation re-renders the appropriate branch automatically. No imperative `navigate()` needed.

### Deep Linking

Universal links + custom scheme:

```
zay://order/{orderId}          → navigate to OrderDetailScreen
zay://seller/{sellerId}        → navigate to SellerProfileScreen
https://zay.ma/order/{id}      → same routes (Universal Links iOS, App Links Android)
```

Configured in `navigation/linking.ts`. Used for:
- Push notification taps (FCM `data` payload contains the deep link)
- Sharing seller profiles ("Check out this kitchen on @ZAY")
- Email/SMS order confirmations (Phase 2)

### Imperative Navigation from Outside React

`navigation/navigationRef.ts` exports a ref attached to `NavigationContainer`. This lets services (push notification handler, socket event handler) navigate without being React components:

```
navigationRef.current?.navigate('OrderDetail', { orderId });
```

---

## 5. Authentication Flow

### Token Storage

| What | Where | Why |
|------|-------|-----|
| JWT | expo-secure-store | OS-level encrypted keystore (Keychain on iOS, Keystore on Android) |
| FCM token | AsyncStorage | Not secret, written to server on every login |
| Onboarding flag | AsyncStorage | Non-sensitive UI preference |

**Never use AsyncStorage for the JWT.** It's stored in plaintext app sandbox and accessible to anything with filesystem access on a rooted device.

### App Launch Flow

```
App.tsx mounts
   │
   ▼
LoadingScreen displayed
   │
   ├── auth.service.hydrate()
   │      ├── SecureStore.get('@zay/token')
   │      ├── if exists: GET /users/me with Bearer token
   │      ├──            on 401: clear token, set isAuthenticated = false
   │      ├──            on success: setUser(response.data.user)
   │      └── if not exists: setIsHydrated(true), isAuthenticated = false
   │
   ▼
RootNavigator re-renders to correct branch
```

This is the same pattern Instagram, Twitter, and most apps use. The user sees a brand-colored splash for ~300ms while the token is validated.

### Login Flow

```
LoginScreen
   │  user enters email + password, taps "Log In"
   │
   ▼
LoginScreen calls authService.login({ email, password })
   │
   ▼
authService:
   │  1. POST /auth/login → { user, token }
   │  2. SecureStore.set('@zay/token', token)
   │  3. authStore.setUser(user)
   │  4. authStore.setToken(token)
   │  5. Register FCM token in background: PATCH /users/me/fcm-token
   │  6. socketService.connect(token)
   │
   ▼
RootNavigator detects isAuthenticated change, switches to role-appropriate stack
```

### Register Flow

Same as login — registration response includes both `user` and `token`, so the user is auto-logged-in after registration. No "please log in" step.

### Logout Flow

```
ProfileScreen "Log Out" button → confirmation dialog → user confirms
   │
   ▼
authService.logout()
   │  1. POST /auth/logout (clears FCM token on server)
   │  2. socketService.disconnect()
   │  3. SecureStore.delete('@zay/token')
   │  4. AsyncStorage.delete('@zay/fcm-token')
   │  5. cartStore.clear()
   │  6. queryClient.clear()   ← important: drop all cached server data
   │  7. authStore.reset()
   │
   ▼
RootNavigator detects auth change, switches to AuthStack
```

### Token Expiry Handling

When the API returns 401 mid-session (token expired or revoked):

1. Axios response interceptor catches the 401
2. Calls `authService.logout()` silently (no API call — token already invalid)
3. Shows a non-blocking toast: "Your session has expired. Please log in again."
4. Navigation auto-switches to AuthStack via the auth store update

No refresh token in MVP. Phase 2: refresh token endpoint + sliding window.

### FCM Token Registration

After every successful login or app launch with a valid session:

```
notificationsService.registerForPushNotifications()
   │
   ├── Permission check (request if not asked)
   ├── If granted: getDevicePushTokenAsync()
   ├── Compare with stored token; if different:
   │     PATCH /users/me/fcm-token { fcm_token }
   │     AsyncStorage.set('@zay/fcm-token', token)
   ▼
Done
```

This runs in the background after login — doesn't block the UI.

---

## 6. State Management Strategy

### The Two-Library Approach

@ZAY mobile uses **Zustand + TanStack Query** with a strict rule:

> Server state lives in TanStack Query.  
> Client state lives in Zustand.  
> They never overlap.

### Zustand Owns

| Store | Contents | Persistence |
|-------|----------|-------------|
| `authStore` | `user, token, isAuthenticated, isHydrated` | Token → SecureStore; user re-fetched on launch |
| `cartStore` | `items[], sellerId, deliveryAddress` | AsyncStorage (rehydrate on launch) |
| `uiStore` | `theme, language, hasOnboarded` | AsyncStorage |
| `socketStore` | `isConnected, subscribedOrderIds[]` | In-memory only |

### TanStack Query Owns

| Query Key | Endpoint |
|-----------|----------|
| `['users', 'me']` | GET /users/me |
| `['categories']` | GET /browse/categories |
| `['browse', 'sellers', { city, page }]` | GET /browse/sellers |
| `['browse', 'items', { search, category, page }]` | GET /browse/items |
| `['browse', 'sellers', sellerId]` | GET /browse/sellers/:id |
| `['orders', 'customer', { page }]` | GET /orders |
| `['orders', 'seller', { status, date, page }]` | GET /seller/orders |
| `['order', orderId]` | GET /orders/:id |
| `['notifications', { page }]` | GET /notifications |
| `['notifications', 'unread-count']` | GET /notifications/unread-count |
| `['menus']` | GET /menus |
| `['items', menuId]` | GET /menus/:id/items |
| `['seller', 'analytics']` | GET /seller/analytics |

### Why Not "Put Everything in Zustand"

A common anti-pattern: storing orders, items, and seller data in Zustand. This destroys:

- **Caching** — Zustand doesn't dedupe simultaneous requests
- **Background refetching** — Zustand doesn't refresh stale data
- **Optimistic updates** — manual rollback code instead of `onMutate`
- **Loading/error states** — every screen reinvents them

React Query gives you all of this for free. Zustand is reserved for things that genuinely don't live on the server.

### Why Not "Put Everything in React Query"

The cart is not on the server (by architectural decision — see `02_ARCHITECTURE.md`). The JWT is not on the server. UI preferences are not on the server. Trying to model these in React Query requires fake "queries" that store local data, which is exactly what Zustand is built for.

### Cart Store Design

```
type CartItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};

type CartStore = {
  items: CartItem[];
  sellerId: string | null;
  sellerName: string | null;

  addItem: (item, sellerId, sellerName) => void;
  removeItem: (menuItemId) => void;
  updateQuantity: (menuItemId, qty) => void;
  clear: () => void;

  // Computed
  subtotal: () => number;
  itemCount: () => number;
};
```

**Single-seller cart rule:** adding an item from a different seller prompts: "Your cart has items from {OtherSeller}. Adding this will clear your cart. Continue?" — confirmed in `addItem()`.

### Cart Persistence

Zustand `persist` middleware writes the cart to AsyncStorage on every change. On app launch, the cart is rehydrated before the first render. The user opens the app the next morning and their cart is still there.

This is contrary to typical e-commerce (Amazon empties cart on logout), but it's the right call for @ZAY: customers browse, sleep on it, return to order. Don't lose their work.

### Mutation Patterns

Mutations follow React Query's `useMutation` pattern:

```
const placeOrderMutation = useMutation({
  mutationFn: (data) => ordersApi.placeOrder(data),
  onSuccess: (order) => {
    queryClient.invalidateQueries(['orders', 'customer']);
    cartStore.clear();
    navigation.replace('OrderDetail', { orderId: order.id });
  },
  onError: (err) => toast.error(parseApiError(err)),
});
```

The store updates, server cache invalidates, navigation happens — all in one place.

---

## 7. API Layer Architecture

### The Axios Client

```
api/client.ts:
  - axios.create({ baseURL: API_BASE_URL, timeout: 15000 })
  - Request interceptor: attach Bearer token from authStore.getState().token
  - Response interceptor:
      - 2xx → return response.data (unwrap the envelope)
      - 4xx/5xx → normalize to AppError shape, reject
      - 401 → call authService.logout() + toast "Session expired"
      - 429 → toast "Too many requests. Please wait." + retry-after parsed
      - Network error → toast "No connection" + queue for retry (Phase 2)
```

### One File Per Resource

```
api/auth.api.ts
  register(payload)
  registerSeller(payload)
  login({ email, password })
  logout()

api/orders.api.ts
  placeOrder(payload)
  getOrders(query)
  getOrder(orderId)
  cancelOrder(orderId)

api/seller.api.ts
  getProfile()
  updateProfile(payload)
  toggleAvailability(isOpen)
  getOrders(query)
  updateOrderStatus(orderId, payload)
  cancelOrder(orderId, reason)
  getAnalytics()
```

Each function returns a Promise<UnwrappedResponse>. The screens never see the success/error envelope — that's stripped in the interceptor.

### TypeScript End-to-End

```
type Order = {
  id: string;
  status: OrderStatus;
  total_amount: number;
  items: OrderItem[];
  seller: { id, business_name, avatar_url };
  ...
};

ordersApi.getOrder(id): Promise<Order>
```

Type definitions in `types/domain.types.ts` mirror the backend response shapes. When the backend adds a field, types are updated in one place.

### Error Normalization

```
parseApiError(error) → {
  code: 'CONFLICT' | 'UNAUTHORIZED' | ...,
  message: 'An account with this email already exists',
  fieldErrors: { email: 'Already taken' } | null
}
```

Screens consume this shape, not raw axios errors. Toast handlers, form error displays, and error screens all read the same fields.

### Idempotency Keys (Architecture Critique Issue #1)

POST /orders adds an `Idempotency-Key: <uuid>` header generated per-tap on the checkout button. If the request fails or times out, retries reuse the same key — preventing duplicate orders. The backend stores keys for 24 hours.

---

## 8. Real-Time Layer (Socket.io)

### Connection Lifecycle

```
On login:
  socketService.connect(token)
    → io(API_URL, { auth: { token: `Bearer ${token}` } })
    → socket.on('connect') → socketStore.setIsConnected(true)
    → socket.on('disconnect') → socketStore.setIsConnected(false)
    → socket.on('reconnect') → resubscribe to all rooms in socketStore.subscribedOrders

On logout:
  socketService.disconnect()
    → socket.disconnect()
    → socketStore.reset()
```

### Per-Screen Subscriptions

`OrderDetailScreen` subscribes to its order's room on mount and unsubscribes on unmount:

```
useOrderUpdates(orderId)
  useEffect(() => {
    socket.emit('join_order', { orderId });
    socket.on('order:status_changed', handler);
    return () => {
      socket.emit('leave_order', { orderId });
      socket.off('order:status_changed', handler);
    };
  }, [orderId]);

  handler = (payload) => {
    queryClient.setQueryData(['order', orderId], (old) => ({
      ...old,
      status: payload.status,
      estimated_ready_at: payload.estimatedReadyAt,
    }));
  };
```

The hook updates React Query's cache directly — no manual state syncing.

### Background Reconnection

When the app goes to background, the socket disconnects. When it returns to foreground, it reconnects and resubscribes to the active order room (if any). Handled by `useAppState` hook.

### Network Resilience

socket.io's built-in reconnection logic (exponential backoff up to 5s) handles brief disconnects automatically. The app shows a small banner "Reconnecting…" if disconnected > 10s.

---

## 9. Push Notifications

### Stack: expo-notifications

Abstracts FCM (Android) and APNS (iOS) into one API. Configured in `app.json` plugins section.

### Permission Flow

```
After login (first time):
  1. notificationsService.requestPermission()
  2. If granted: register FCM token, PATCH /users/me/fcm-token
  3. If denied: store flag, show in-app banner explaining what they miss
     (no order updates, no seller notifications)

Re-prompt strategy:
  - Don't ask immediately on app launch (rejected most of the time)
  - Ask after first meaningful action (placing order, registering seller)
  - Re-ask after 7 days if denied (with context: "Get notified when sellers accept your orders")
```

### Notification Display

```
Foreground (app open):
  Custom toast at the top of the screen + native banner suppressed
  Tap → navigate to deep link in payload

Background (app minimized):
  Native system notification
  Tap → opens app and navigates to deep link

Killed (app closed):
  Native system notification
  Tap → opens app cold; initial route handled by linking config
```

### Notification Type → Action Map

| Type | Title | Deep Link |
|------|-------|-----------|
| `order_placed` (seller) | "New Order!" | `zay://order/{orderId}` |
| `order_accepted` (customer) | "Order Accepted" | `zay://order/{orderId}` |
| `order_ready` (customer) | "Order Ready" | `zay://order/{orderId}` |
| `order_delivered` (customer) | "Order Delivered" | `zay://order/{orderId}` |
| `order_auto_cancelled` (customer) | "Order Cancelled" | `zay://order/{orderId}` |
| `seller_approved` (seller) | "Account Approved!" | `zay://seller/dashboard` |
| `seller_rejected` (seller) | "Application Update" | `zay://seller/profile` |

---

## 10. Reusable Components Strategy

### Three Component Tiers

```
ui/        Theme-aware primitives. Zero business knowledge.
           Re-usable in any future app.
           Example: Button, Input, Card

forms/     Form-specific wrappers integrating React Hook Form.
           Know about controllers and validation states.
           Example: FormInput, PhoneInput, ImagePicker

domain/    Business-aware composites.
           Know about Order, Seller, OrderStatus types.
           Example: OrderCard, SellerCard, OrderTimeline
```

### Component Composition Pattern

Domain components are composed from UI primitives:

```
OrderCard
  ├── Card (ui)
  │   ├── Image (ui)
  │   ├── Text (ui)
  │   │   "Order #ABC123"
  │   ├── OrderStatusBadge (domain)
  │   │   └── Badge (ui)
  │   └── PriceTag (domain)
  │       └── Text (ui)
```

This keeps UI primitives free of business logic and domain components free of styling concerns.

### Theme-Aware Primitives

All UI primitives accept theme tokens, not raw values:

```
✅ <Button variant="primary" size="md">
❌ <Button backgroundColor="#E8520A" padding={12}>

✅ <Text variant="body">
❌ <Text fontSize={16} fontWeight="400">
```

Tokens are defined once in `theme/`. Changing the brand color from orange to red is a one-line change.

### Component Props Pattern

Every component:
- Has a TypeScript Props interface explicitly defined
- Uses sensible defaults (`size = 'md'`, `variant = 'primary'`)
- Forwards refs where applicable (Input, Button)
- Has `testID` prop for E2E testing

---

## 11. Complete Screen Inventory

### Total: 30 screens

| # | Screen | Stack | Role | Description |
|---|--------|-------|------|-------------|
| 1 | LoadingScreen | Root | All | Splash + auth hydrate |
| 2 | WelcomeScreen | Auth | Guest | "Get started" landing |
| 3 | LoginScreen | Auth | Guest | Email + password |
| 4 | RegisterScreen | Auth | Guest | Customer registration |
| 5 | RegisterSellerScreen | Auth | Guest | Seller registration |
| 6 | HomeScreen | CustomerHome | Customer | Featured items + categories |
| 7 | SearchScreen | CustomerHome | Customer | Search bar + filtered results |
| 8 | CategoryScreen | CustomerHome | Customer | All items in a category |
| 9 | SellerProfileScreen | CustomerHome | Customer | Seller info + menus + items |
| 10 | ItemDetailScreen | CustomerHome | Customer | Item detail + add to cart |
| 11 | CartScreen | Modal | Customer | Review cart, edit quantities |
| 12 | CheckoutScreen | Modal | Customer | Delivery address + place order |
| 13 | OrdersListScreen | CustomerOrders | Customer | Order history |
| 14 | OrderDetailScreen | CustomerOrders | Customer | Order detail + real-time status |
| 15 | NotificationsScreen | Customer | Customer | Notifications feed |
| 16 | ProfileScreen | CustomerProfile | Customer | Account hub |
| 17 | EditProfileScreen | CustomerProfile | Customer | Edit name, phone, avatar |
| 18 | SettingsScreen | CustomerProfile | Customer | Notifications, language, logout |
| 19 | PendingApprovalScreen | PendingSeller | Pending Seller | "Awaiting approval" with pull-to-refresh |
| 20 | RejectedScreen | Root | Rejected Seller | Reason + contact support |
| 21 | SuspendedScreen | Root | Suspended User | Suspension notice |
| 22 | DashboardScreen | SellerTabs | Approved Seller | Today's KPIs + open toggle |
| 23 | IncomingOrdersScreen | SellerOrders | Approved Seller | New orders feed with filters |
| 24 | SellerOrderDetailScreen | SellerOrders | Approved Seller | Order detail + status actions |
| 25 | MenuListScreen | SellerMenu | Approved Seller | All menus + items |
| 26 | MenuDetailScreen | SellerMenu | Approved Seller | One menu + its items |
| 27 | AddItemScreen | SellerMenu | Approved Seller | Add item form |
| 28 | EditItemScreen | SellerMenu | Approved Seller | Edit item form |
| 29 | SellerProfileScreen | SellerProfile | Approved Seller | View own profile |
| 30 | EditSellerProfileScreen | SellerProfile | Approved Seller | Edit business info |
| 31 | SellerAnalyticsScreen | SellerProfile | Approved Seller | Orders + revenue trends |

(Settings is shared across Customer + Seller.)

---

## 12. Form Validation Architecture

### Stack: React Hook Form + Joi

```
RegisterScreen
  ├── useForm({ resolver: joiResolver(registerSchema) })
  ├── <FormInput control={control} name="email" />
  ├── <PhoneInput control={control} name="phone" />
  ├── <PasswordInput control={control} name="password" />
  └── <FormButton onPress={handleSubmit(onSubmit)} />
```

### Why React Hook Form

- Uncontrolled inputs → fewer re-renders → smoother typing on low-end Androids
- Built-in validation modes (`onChange`, `onBlur`, `onSubmit`)
- Direct integration with field-level errors from the API

### Schema Sharing

The same Joi schemas defined in `backend/src/validators/` are mirrored in `mobile/src/utils/validation.ts`. Source of truth could be either — for MVP, mobile maintains its own copy. Phase 2: extract to a shared `@zay/schemas` npm package.

### Two-Layer Validation

```
1. Client-side (Joi via React Hook Form):
   - Immediate feedback on blur
   - Prevents obvious mistakes (wrong email format, password too short)
   - Disables submit button until form is valid

2. Server-side (Joi backend validators):
   - Authoritative source of truth
   - Catches anything the client missed
   - Returns details[] array
```

When the server returns a `VALIDATION_ERROR` with `details`, the screen maps `details[*].field` → React Hook Form `setError(field, { message })` so errors display inline next to the right input.

### Phone Input

Custom `PhoneInput` component:
- Always prefixes `+212`
- Accepts only 9 digits after prefix
- Formats display as `+212 6 12 34 56 78`
- Stores raw `+212612345678` in form state

### Image Picker

Custom `ImagePicker` component:
- Single tap → action sheet: Camera | Photo Library | Cancel
- Uses `expo-image-picker`
- Returns `{ uri, type, base64?: string }`
- Client-side compression to ≤1MB before upload via `expo-image-manipulator`

---

## 13. Error Handling Strategy

### Four Error Surface Types

| Type | Display | Example |
|------|---------|---------|
| **Inline field error** | Red text below input | Email already exists |
| **Toast** | Top-screen non-blocking | Failed to load orders. Pull to refresh. |
| **Full-screen error** | Replaces content | No internet, seller not found |
| **Error boundary** | App-wide fallback | Unhandled exception → "Something went wrong" with reset |

### When to Use Which

```
Form submission error → Field error (if backend says which field), otherwise toast
List fetch failed → Inline empty state with "Try again" button OR ErrorScreen
Detail screen 404 → Full-screen "Not found" with back button
Network error → Toast + automatic React Query retry (3x with backoff)
Crash → ErrorBoundary → "Restart app" button
```

### Error Boundary Strategy

```
<ErrorBoundary>
  <NavigationContainer>
    <RootNavigator />
  </NavigationContainer>
</ErrorBoundary>
```

Catches all render-time exceptions. Logs to console (Sentry in Phase 2). Shows a friendly "Oops" screen with a "Try again" button that resets the boundary.

### Toast Implementation

Single global toast queue managed by `useToast()` hook:

```
const toast = useToast();
toast.success('Profile updated');
toast.error('Failed to load. Pull to refresh.');
toast.info('You have 3 unread notifications');
```

Animated with Reanimated, top-screen position, auto-dismiss after 3 seconds, swipe-up to dismiss.

### Network-Error UX

When `axios` throws a network error (no response received):

1. Response interceptor catches it
2. Shows a persistent banner: "No internet connection"
3. Queries are paused via `onlineManager.setOnline(false)`
4. When network returns (NetInfo subscription), banner disappears and queries auto-refetch

---

## 14. Theme & Design System

The visual design (colors, typography, spacing, screen mockups) is documented in [`06_MOBILE_UX.md`](06_MOBILE_UX.md). This section covers the **architecture** of the design system.

### Theme as Code

```
theme/index.ts exports a const object:
{
  colors: { primary, secondary, text: { primary, secondary, ... }, status: { ... } },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  typography: { h1, h2, body, caption, ... },
  radii: { sm: 4, md: 8, lg: 16, full: 9999 },
  shadows: { sm, md, lg },
}
```

The theme is **not** stored in Context. It's a static import. This means:
- Zero re-renders when the theme is used
- IDE autocomplete works on every property
- Tree-shaking removes unused tokens

### Why Not a ThemeProvider?

If the app supported user-selected light/dark mode, a Provider would be necessary. For MVP, @ZAY is light-mode-only. A Provider would add re-render overhead with zero benefit.

Phase 2 (dark mode): introduce `useTheme()` that reads `uiStore.theme`. The token interface stays identical; only the values change.

### Semantic Tokens

```
colors.primary        = '#E8520A'  // warm orange (brand)
colors.text.primary   = '#1A1A1A'  // body text
colors.text.secondary = '#6B7280'  // muted/captions
colors.status.pending     = '#F59E0B'
colors.status.accepted    = '#10B981'
colors.status.preparing   = '#3B82F6'
colors.status.ready       = '#8B5CF6'
colors.status.delivered   = '#059669'
colors.status.cancelled   = '#EF4444'
```

Components reference semantic tokens, not raw hex codes. Changing `colors.status.pending` updates every pending badge across the app.

### Typography Scale

```
typography.h1          { fontFamily: 'PlayfairDisplay-Bold', fontSize: 32, lineHeight: 40 }
typography.h2          { fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, lineHeight: 32 }
typography.bodyBold    { fontFamily: 'Inter-SemiBold', fontSize: 16, lineHeight: 24 }
typography.body        { fontFamily: 'Inter-Regular', fontSize: 16, lineHeight: 24 }
typography.bodySmall   { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 20 }
typography.caption     { fontFamily: 'Inter-Medium', fontSize: 12, lineHeight: 16 }
typography.button      { fontFamily: 'Inter-SemiBold', fontSize: 16, lineHeight: 24 }
typography.price       { fontFamily: 'Inter-Bold', fontSize: 18, lineHeight: 24 }
```

### Spacing on the 8pt Grid

```
spacing.xs   = 4
spacing.sm   = 8
spacing.md   = 16
spacing.lg   = 24
spacing.xl   = 32
spacing.xxl  = 48
```

Every margin, padding, and gap value uses these tokens. No arbitrary `padding: 13`.

---

## 15. Responsive Strategy

### Device Targets

| Device Class | Width | Strategy |
|--------------|-------|----------|
| Small phones (iPhone SE) | 320–375 | All UI must fit, vertical scroll |
| Standard phones (iPhone 14, Pixel) | 375–414 | Primary target |
| Large phones (Pro Max) | 414+ | Extra padding, no UI changes |
| Tablets (iPad) | 768+ | Out of scope for MVP — let iPad scale the iPhone layout |

### Adaptive Layouts (Not Breakpoints)

React Native does not use CSS breakpoints. Instead:

- **Flex layout** scales naturally to width
- **`Dimensions.get('window')`** read once on mount, cached
- **`useWindowDimensions()`** subscribes to size changes (rotation, foldables) — used only when needed
- **`SafeAreaView` everywhere** — handles notches, dynamic island, home indicator

### Typography Scaling

```
PixelRatio.getFontScale() returns user's OS font size setting.
Body text scales with it (accessibility).
Headings clamp at 1.3x max to prevent layout breaks.
```

### Image Sizing

Cloudinary delivers responsive images via URL transforms:

```
https://res.cloudinary.com/zay/.../w_800,h_600,c_fill,q_auto,f_auto/items/abc.jpg

For a 2x retina display showing a 200×150 card → request w_400,h_300.
For full-screen viewer → request w_800,h_600.
```

The `Image` component picks the right size based on render dimensions and device pixel ratio.

### Landscape

@ZAY does not support landscape orientation. `app.json` locks orientation to portrait. This is the right call:
- Food platform UX is vertical (cards stack)
- Eliminates a class of layout bugs
- Saves engineering time

Phase 2 reconsider for tablets only.

---

## 16. Image Handling

### Library: expo-image

Replaces older `Image` and `FastImage` libraries. Built on top of native libraries (SDWebImage iOS, Glide Android). Features:
- Disk cache (LRU eviction at 100MB)
- Memory cache (LRU eviction)
- WebP support (Cloudinary serves WebP via `f_auto`)
- Blurhash placeholders during load
- Smooth fade-in transition

### Pattern

```
<Image
  source={{ uri: item.image_url }}
  placeholder={item.blurhash}        // optional, server-generated
  contentFit="cover"
  transition={200}
  style={styles.image}
/>
```

### Upload Pipeline

```
User taps "Upload" in ImagePicker
   ↓
expo-image-picker returns { uri, type }
   ↓
expo-image-manipulator compresses to ≤1MB, max width 1200px
   ↓
FormData with multipart/form-data
   ↓
axios POST /items/:id/image (Bearer token)
   ↓
Server uploads to Cloudinary, returns { image_url, image_public_id }
   ↓
React Query invalidates ['items', menuId] → list refetches
```

### Pre-Upload Compression Matters

A 12MP photo on a Samsung is ~5MB. Uploading 5MB over Moroccan 3G can take 30+ seconds. Compressing to 1MB cuts that to 6 seconds — the difference between "fast" and "broken".

---

## 17. Offline & Network Resilience

### React Query as the Offline Backbone

React Query caches every server response with configurable TTL. When the user reopens the app offline:

```
Stale-while-revalidate:
  1. Cached data renders immediately (looks fast)
  2. Background refetch attempted when online
  3. If refetch fails: stale data stays, banner shows "Offline"
```

### Network State Awareness

```
NetInfo (expo-network) → subscription
   ↓
onlineManager.setOnline(state.isConnected)
   ↓
React Query pauses mutations + retries on reconnect
   ↓
UI banner shows "No connection" / "Reconnected"
```

### Mutation Queue (NOT in MVP)

A "place order while offline → queue → submit when online" pattern is tempting but dangerous:
- Order placement is a critical financial action
- Queued orders may be invalid when finally submitted (item became unavailable, seller closed)
- Customers expect immediate confirmation

MVP rule: orders, status updates, and other mutations require live network. The "Place Order" button is disabled when offline with a clear "Connect to internet" message.

Phase 2: explore optimistic queue for cart edits, profile updates only.

### Image Cache Survives Offline

expo-image's disk cache means previously-viewed item images render offline. Browse history works in degraded mode.

---

## 18. Performance Optimization

### FlatList for All Lists

Every list (orders, items, sellers, notifications) uses `FlatList` — not `ScrollView.map()`. FlatList virtualizes rows: only renders what's visible + buffer. Critical at 50+ items.

Key props:
```
keyExtractor      → unique key per item (item.id)
getItemLayout     → known item height enables fast scroll-to-index
initialNumToRender → 10 items (1 viewport)
maxToRenderPerBatch → 5 items per frame on scroll
removeClippedSubviews → true on Android (memory optimization)
```

### Image Optimization (Recap from Section 16)

- Cloudinary `f_auto` (WebP where supported)
- Request size-appropriate URLs (`w_400` for cards, not `w_1200`)
- `expo-image` disk cache

### Memoization Strategy

```
const ItemCard = React.memo(({ item, onPress }) => { ... });
```

Apply `React.memo` to list row components. Without it, scrolling a 100-item list re-renders all 100 rows on every parent state change.

For inline arrow function props (`onPress={() => navigate(...)}`) — wrap in `useCallback` only when the child is memoized. Otherwise it's noise.

### Reanimated for Animations

Native-thread animations (60fps even when JS thread is busy). Used for:
- Bottom sheet drag
- Toast slide-in
- Card press shrink
- Skeleton loader shimmer

Avoid `Animated` (the legacy API) — runs on the JS thread.

### Bundle Size

```
Production bundle target: < 50MB iOS, < 30MB Android (Expo APK)

Cuts:
  - Tree-shake icon sets (only import used icons)
  - Avoid full lodash → import individual functions
  - date-fns instead of moment.js
  - No bundled product images (everything is Cloudinary-hosted)
```

### Hermes Engine

Enabled by default in Expo SDK 50+. Faster startup, lower memory footprint. No code changes required.

---

## 19. User Flows

### Customer Order Placement (the most important flow)

```
1. WelcomeScreen → tap "Get Started"
2. RegisterScreen → fill form → submit
3. Auto-login → CustomerTabs / HomeScreen
4. HomeScreen → tap category "Tagine"
5. CategoryScreen → tap item card
6. ItemDetailScreen → tap "Add to Cart" (qty selector)
7. Cart badge shows "1" on bottom tab
8. Continue browsing → add 1 more item
9. Tap cart icon → CartScreen
10. Review items → tap "Checkout"
11. CheckoutScreen → confirm delivery address (street, district, city, landmark)
12. Optional: add notes ("no spicy")
13. Tap "Place Order"
14. Loading state → POST /orders with Idempotency-Key
15. On success: navigation.replace → OrderDetailScreen (no back to checkout)
16. OrderDetailScreen shows "Pending" status
17. Socket subscribes to order:{id} room
18. After ~2 min: seller accepts → real-time status update → "Accepted, ready in 90 min"
19. Push notification fires in background
20. Seller marks ready → status updates again
21. Phone number appears on screen (Amendment 3: seller phone visible when accepted)
22. Customer coordinates pickup/delivery with seller via phone
23. Seller marks delivered → final status
24. Order moves to "Completed" in OrdersListScreen
```

### Seller Order Handling

```
1. PUSH NOTIFICATION received (app in background): "New Order!"
2. Seller taps notification → app opens → SellerOrderDetailScreen
3. Sees order: customer name, items, total, delivery address
4. Taps "Accept" → modal: time picker for estimated_ready_at
5. Confirms → PATCH /seller/orders/:id/status { status: 'accepted', estimated_ready_at: ... }
6. Customer is notified (FCM + socket)
7. Seller cooks the food
8. Taps "Mark as preparing" → status updates
9. When done: taps "Mark as ready"
10. Customer arrives / seller delivers
11. Taps "Mark as delivered" → order complete
```

### Seller Registration & Approval

```
1. WelcomeScreen → tap "Become a Seller"
2. RegisterSellerScreen → fill extended form (business name, address, city, delivery radius)
3. Submit → server creates user + seller_profile (status: pending) + returns token
4. App stores token, fetches profile → seller_status: 'pending'
5. RootNavigator routes to PendingSellerStack
6. PendingApprovalScreen displays:
   "Your account is being reviewed. You'll receive a notification once approved."
7. Pull-to-refresh polls GET /users/me to check status
8. (Meanwhile) Admin reviews on web dashboard, taps "Approve"
9. FCM notification fires to seller: "Account Approved!"
10. Seller taps notification → app opens → re-fetches user → seller_status: 'approved'
11. RootNavigator now routes to SellerTabs → DashboardScreen
12. Empty state: "Create your first menu to start receiving orders"
```

### Login Returning User

```
1. App icon tapped
2. LoadingScreen briefly (300ms)
3. authService.hydrate() → token found in SecureStore
4. GET /users/me with token → user object returned
5. RootNavigator branches based on user.role + seller status
6. Customer → HomeScreen, Seller → DashboardScreen
7. Socket reconnects in background
```

### Forgot Password (Phase 2 — not in MVP)

Pure password reset is out of MVP scope. For MVP, lost-password users contact support email shown on LoginScreen.

---

## 20. Navigation Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                      App Launch                                │
│                  LoadingScreen (hydrate)                       │
└─────────────┬──────────────────────────────┬──────────────────┘
              │                              │
        Has valid token?                Has valid token?
              │                              │
              ▼ No                           ▼ Yes
┌──────────────────────────┐        ┌────────────────────────────┐
│       AuthStack          │        │   Check user.role          │
│                          │        └───────┬────────────────────┘
│  Welcome ─► Login        │                │
│         ◄──┘             │     ┌──────────┼───────────────────┐
│  Welcome ─► Register     │     │          │                   │
│  Welcome ─► RegSeller    │   customer  seller             suspended
│                          │     │          │                   │
└──────────┬───────────────┘     │          │                   │
           │                     │   Check seller_profile     ┌─▼──────────┐
           │  After login        │   .status                  │ Suspended  │
           │                     │     │                      │ Screen     │
           │                     │  ┌──┴──┬───────────────┐   └────────────┘
           │                     │  │     │               │
           │                  pending  approved      rejected
           ▼                     │     │                │
                                 │     │                │
                                 ▼     ▼                ▼
        ┌────────────┐  ┌──────────────────┐  ┌──────────────┐  ┌─────────┐
        │ Customer   │  │ PendingSeller    │  │ SellerTabs   │  │Rejected │
        │   Tabs     │  │ Stack            │  │              │  │Screen   │
        ├────────────┤  ├──────────────────┤  ├──────────────┤  └─────────┘
        │ Home       │  │ PendingApproval  │  │ Dashboard    │
        │ Orders     │  │ ProfileScreen    │  │ Orders       │
        │ Notifs     │  └──────────────────┘  │ Menu         │
        │ Profile    │                        │ Profile      │
        └────────────┘                        └──────────────┘
```

---

## 21. Senior Mobile Architect Critique

### What's Solid

Before listing weaknesses: the architecture is genuinely correct for the scope. State management boundaries are clean, navigation is conditional rather than guarded, error handling has clear surfaces, and the design system is token-based. These are not table stakes — many React Native apps get them wrong.

Now the weak spots, in priority order.

---

### Issue 1: PendingApprovalScreen Needs an Active Status Check, Not Just Pull-to-Refresh — HIGH

**Problem:** The flow assumes the seller will receive an FCM push when approved. But:
- FCM is unreliable on Android OEMs (Architecture Critique #5)
- The seller might have notifications disabled
- Pull-to-refresh requires the user to actively check

A seller could sit on PendingApprovalScreen for an hour after approval, not knowing.

**Solution:** Add a lightweight polling layer on PendingApprovalScreen:
- Poll GET /users/me every 60 seconds while the screen is focused
- Stop polling when screen unfocuses (don't drain battery)
- Use React Query's `refetchInterval` — it pauses when stale and resumes when fresh

```
useQuery(['users', 'me'], usersApi.getMe, {
  refetchInterval: isFocused ? 60_000 : false,
  refetchIntervalInBackground: false,
});
```

When status changes to approved, the auth store updates and RootNavigator switches to SellerTabs automatically.

---

### Issue 2: Single-Threaded Token Refresh Will Cause Race Conditions — MEDIUM

**Problem:** When 401 hits, the interceptor calls `logout()`. But what if 5 in-flight requests all return 401 at the same time (e.g., screen with 5 parallel queries)? Each will trigger logout, queue 5 toasts, and dispatch 5 navigation events.

**Solution:** Add a single-flight lock in the interceptor:

```
let logoutInProgress = false;
if (status === 401 && !logoutInProgress) {
  logoutInProgress = true;
  authService.logout();
  setTimeout(() => { logoutInProgress = false; }, 1000);
}
```

Trivial change, prevents cascading logout chaos.

---

### Issue 3: Cart Has No Reconciliation on Item Unavailability — HIGH

**Problem:** Customer adds 3 items to cart, leaves the app for 2 hours. Comes back. One item has been deleted by the seller (or became unavailable). User taps "Checkout" → server returns 422 `UNPROCESSABLE` with details. The current spec says the screen handles this — but how?

**Solution:** Before showing CheckoutScreen, run a "cart validation" check:
1. POST /cart/validate { items: [...] } — new lightweight endpoint
2. Server returns: which items are still available, which aren't, current prices
3. If any are unavailable: show a modal listing them, ask user to remove or replace
4. Don't let the user reach CheckoutScreen with a broken cart

This requires a new backend endpoint. Alternative: handle the 422 response on CheckoutScreen, but the UX is worse — the customer typed an address before discovering items are gone.

**Priority:** High. Without it, the order placement flow has a 422 cliff.

---

### Issue 4: No App Version Force-Update Mechanism — MEDIUM

**Problem:** When the backend ships v2 of the API (Phase 2), older mobile clients on v1 will break. Apple/Google reviews can take days, so the rollout is uneven.

**Solution:** Add a `min_app_version` check:
- Every API response includes a header `X-Min-App-Version: 1.2.0`
- Client compares against its own version
- If below: show a blocking "Please update the app" screen with App Store / Play Store links
- Bypass: no, this is intentional

Implementation is small. Critical to prevent silent breakage during API evolution.

---

### Issue 5: No Image Upload Progress UI — MEDIUM

**Problem:** Item image uploads can take 6+ seconds on 3G. Currently the screen shows a generic spinner. Users on slow connections will think the app is frozen.

**Solution:** axios supports `onUploadProgress` callbacks. Pass through to the screen:
- Show a progress bar 0–100%
- Show estimated time remaining
- Allow cancel

This is a small change but high impact on Moroccan 3G connections.

---

### Issue 6: Socket.io Reconnection Has No Visible State — LOW

**Problem:** If the socket disconnects mid-order, the user sees no indication that real-time updates have stopped. They might think the order is stuck in "pending" when actually it's already accepted.

**Solution:** When `socketStore.isConnected === false` and the user is on OrderDetailScreen:
- Show a small badge near the status: "Reconnecting…"
- Force a manual refetch of the order query every 10 seconds during disconnect

The latter is a safety net — by the time the socket reconnects, the order data is correct.

---

### Issue 7: Phone Number is Hardcoded to Morocco — MEDIUM

**Problem:** `+212` prefix is enforced everywhere. But:
- Some sellers are dual-citizens with foreign numbers
- Tourists in Morocco may want to order
- Phase 2 expansion to Algeria (+213), Tunisia (+216), etc.

**Solution:** Replace the Moroccan phone constraint with a country picker (`react-native-country-picker-modal` or similar). Default to Morocco. Validate based on country.

This requires a backend change too (the Joi schema currently rejects non-Moroccan numbers). For MVP, the current constraint is acceptable — Morocco-only launch — but it's a known limitation to flag.

---

### Issue 8: No Accessibility Audit — MEDIUM

**Problem:** No mention of accessibility throughout. React Native supports VoiceOver/TalkBack via `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` — but these don't appear in any component spec.

**Solution:** Add to the component checklist:
- Every interactive element gets `accessibilityLabel`
- Every Button gets `accessibilityRole="button"`
- Every input gets a clear label association
- Test with TalkBack (Android) and VoiceOver (iOS) before launch

This is not optional — accessibility is a legal requirement in many jurisdictions and an ethical baseline.

---

### Issue 9: No Analytics or Crash Reporting Plan — MEDIUM

**Problem:** "We launched! Now what?" Without analytics, you don't know:
- How many users complete the order flow
- Where users drop off
- Which sellers are popular
- Which crashes affect real users

**Solution:** Add to the stack:
- **Sentry** for crash reporting (free tier sufficient for MVP)
- **Mixpanel** or **PostHog** for funnel analytics (also free tiers)
- Wire up `analytics.ts` util with key events: `register`, `login`, `add_to_cart`, `place_order`, `order_completed`

Add the SDK in MVP, even if analysis comes later. Retrofitting after launch loses the first weeks of data — which are the most valuable.

---

### Issue 10: Deep Linking Has Cold-Start Race Conditions — LOW

**Problem:** When the app is killed and a push notification taps a deep link:
1. App cold-starts
2. Auth hydration takes 300ms
3. Deep link handler tries to navigate to OrderDetailScreen
4. But RootNavigator is still on LoadingScreen
5. Navigation silently fails or goes to wrong screen

**Solution:** Queue the deep link until hydration completes:
```
const [pendingLink, setPendingLink] = useState(null);
useEffect(() => {
  if (isHydrated && pendingLink) {
    navigationRef.navigate(...pendingLink);
    setPendingLink(null);
  }
}, [isHydrated, pendingLink]);
```

Small change, fixes a class of "I tapped the notification but it went to home" bugs.

---

### Issue 11: Settings Screen is Shared but Has Role-Specific Content — LOW

The flow inventory shows Settings under both CustomerProfile and SellerProfile stacks. The screen needs role-conditional sections (e.g., "Seller-specific notifications" only for sellers). This is mentioned nowhere in the architecture. Add a clarifying note: SettingsScreen uses `useAuth().user.role` to render conditional sections.

---

### Issue 12: No Strategy for Large Order Counts on SellerOrders — LOW

After 6 months, a seller may have 2000+ orders. The current spec uses pagination (good), but the SellerOrdersScreen design (per `06_MOBILE_UX.md`) suggests a list view. With even 50 orders, finding "yesterday's order #234" via scroll is painful.

**Solution:** Add a search-by-order-ID input at the top of IncomingOrdersScreen. Plus the date filter that's already in the API spec. Keep the date range default to "Last 7 days" to keep the initial query fast.

---

### Priority Matrix

| Issue | Priority | Effort | Impact |
|-------|----------|--------|--------|
| 1 — Pending approval polling | High | Low | Critical UX for seller activation |
| 3 — Cart reconciliation | High | Medium | Prevents 422 cliff on checkout |
| 4 — App version force-update | Medium | Low | Prevents future broken clients |
| 5 — Upload progress UI | Medium | Low | Reduces "app frozen" complaints |
| 7 — Phone hardcoded to MA | Medium | Medium | Limits user base |
| 8 — Accessibility | Medium | Medium | Legal + ethical baseline |
| 9 — Analytics/Sentry | Medium | Low | Loses launch data otherwise |
| 2 — 401 race condition | Medium | Low | Trivial fix, prevents chaos |
| 6 — Socket disconnect UI | Low | Low | Quality polish |
| 10 — Deep link race | Low | Low | Subtle bug, easy fix |
| 11 — Settings clarity | Low | Trivial | Doc clarity |
| 12 — Order search | Low | Medium | Grows in importance over time |

**Bottom line:** Issues 1 and 3 are pre-launch blockers. Issue 4 should be in place before any v2 backend ships. Issues 8 and 9 should be done in MVP — retrofitting accessibility and analytics is significantly harder than building them in. Everything else is polish that can wait until v1.1.
