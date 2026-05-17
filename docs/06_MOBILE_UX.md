# @ZAY — Mobile App Screens, UX & Design System

---

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Screen Inventory](#screen-inventory)
- [Navigation Architecture](#navigation-architecture)
- [Design System](#design-system)
- [Color Palette](#color-palette)
- [Typography](#typography)
- [Spacing & Layout](#spacing--layout)
- [Component Library](#component-library)
- [UX Flows](#ux-flows)
- [Admin Dashboard Structure](#admin-dashboard-structure)

---

## Design Philosophy

@ZAY's design language is built around three values:

1. **Warmth** — The platform should feel like a conversation with a neighbor, not an app store. Colors, images, and copy should evoke home cooking, family, and authenticity.

2. **Simplicity** — Many sellers and customers in the target market are not heavy smartphone users. Every screen must be immediately understandable without instructions.

3. **Trust** — Users are buying food from people they don't know. The design must communicate verification, quality, and reliability at every step.

---

## Screen Inventory

### Authentication Screens (Shared)

| Screen | Route Name | Description |
|--------|------------|-------------|
| Welcome | `WelcomeScreen` | App intro with "Login" and "Register" CTAs, brand illustration |
| Login | `LoginScreen` | Email + password form |
| Register (Customer) | `RegisterScreen` | Name, email, phone, password |
| Register (Seller) | `RegisterSellerScreen` | Extended form with business name, bio, city |

### Customer Screens

| Screen | Route Name | Description |
|--------|------------|-------------|
| Home | `HomeScreen` | Hero banner, categories, featured items, seller cards |
| Search | `SearchScreen` | Search bar, filters (category, price), results grid |
| Food Detail | `FoodDetailScreen` | Item image, name, description, price, prep time, add to cart CTA |
| Cart | `CartScreen` | Cart items list, quantities, subtotal, checkout CTA |
| Checkout | `CheckoutScreen` | Delivery address form, notes, payment summary |
| Order Confirmation | `OrderConfirmationScreen` | Success animation, order ID, estimated time, CTA to track |
| Order History | `OrderHistoryScreen` | List of past orders with status badges |
| Order Detail | `OrderDetailScreen` | Full order breakdown, status timeline |
| Notifications | `NotificationsScreen` | List of notifications with read/unread state |
| Profile | `ProfileScreen` | User info, edit profile, logout |

### Seller Screens

| Screen | Route Name | Description |
|--------|------------|-------------|
| Pending Approval | `PendingApprovalScreen` | Shown before admin approval |
| Seller Dashboard | `SellerDashboardScreen` | Summary: today's orders, earnings, open/closed toggle |
| Seller Orders | `SellerOrdersScreen` | Incoming orders queue, tabs: New / Active / History |
| Seller Order Detail | `SellerOrderDetailScreen` | Order items, customer address, action buttons |
| Menu Management | `MenuManagementScreen` | List of menus and items, add/edit/delete |
| Add Menu Item | `AddMenuItemScreen` | Form: name, description, price, category, prep time, image upload |
| Edit Menu Item | `EditMenuItemScreen` | Pre-filled edit form |
| Seller Profile | `SellerProfileScreen` | Business name, bio, address, avatar, cover image |

**Total screens: 21**

---

## Navigation Architecture

### React Navigation Stack

```
RootNavigator (NavigationContainer)
│
├── SplashScreen (while loading auth state)
│
├── AuthNavigator (Stack) — shown when no token
│   ├── WelcomeScreen
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── RegisterSellerScreen
│
├── PendingSellerNavigator — shown when seller.status = 'pending'/'rejected'/'suspended'
│   └── PendingApprovalScreen (full-screen, no tabs)
│
├── CustomerNavigator (Bottom Tab)
│   Tabs:
│   ├── HomeTab → HomeScreen
│   ├── SearchTab → SearchScreen
│   ├── CartTab → CartScreen (with badge showing item count)
│   ├── OrdersTab → OrderHistoryScreen
│   └── ProfileTab → ProfileScreen
│
│   Stack overlays (presented as modals or pushed screens):
│   ├── FoodDetailScreen
│   ├── CheckoutScreen
│   ├── OrderConfirmationScreen
│   ├── OrderDetailScreen
│   └── NotificationsScreen
│
└── SellerNavigator (Bottom Tab)
    Tabs:
    ├── DashboardTab → SellerDashboardScreen
    ├── OrdersTab → SellerOrdersScreen
    ├── MenuTab → MenuManagementScreen
    └── ProfileTab → SellerProfileScreen

    Stack overlays:
    ├── SellerOrderDetailScreen
    ├── AddMenuItemScreen
    └── EditMenuItemScreen
```

### Navigation on Notification Tap

When a user taps a push notification:
- Order status update → navigate to `OrderDetailScreen` with `orderId`
- Seller approval → if seller, navigate to `SellerDashboardScreen`

This is handled in the Firebase notification handler registered at app root level.

---

## Design System

### Design Tokens

Design tokens are defined in `src/constants/` and imported across all components. This ensures any theme change propagates everywhere without hunting through components.

---

## Color Palette

```
Primary Brand Colors:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@ZAY Orange (Primary)         #E8520A
@ZAY Orange Light             #F47B3F
@ZAY Orange Dark              #C43D00
@ZAY Orange Tint (bg)         #FFF3EE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Neutrals:
White                          #FFFFFF
Gray 50 (backgrounds)          #F9F9F9
Gray 100 (input bg)            #F2F2F2
Gray 200 (borders)             #E0E0E0
Gray 400 (placeholders)        #9E9E9E
Gray 600 (secondary text)      #616161
Gray 900 (primary text)        #1A1A1A

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Semantic Colors:
Success (delivered, approved)  #2E7D32   Green
Warning (preparing, pending)   #E65100   Amber
Error (cancelled, rejected)    #C62828   Red
Info (accepted, system)        #0277BD   Blue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Status Colors:
pending      #9E9E9E  (Gray)
accepted     #0277BD  (Blue)
preparing    #E65100  (Amber)
ready        #558B2F  (Light Green)
delivered    #2E7D32  (Green)
cancelled    #C62828  (Red)
```

**Rationale for Orange Primary:**
- Orange evokes warmth, home kitchens, spices, and food
- Distinctive in the Moroccan market (not used by major food apps)
- High contrast against white backgrounds (accessibility)
- Works well with earthy accent tones reminiscent of Moroccan terracotta

### Color Constants File

```js
// src/constants/colors.js
export const Colors = {
  primary: '#E8520A',
  primaryLight: '#F47B3F',
  primaryDark: '#C43D00',
  primaryTint: '#FFF3EE',

  white: '#FFFFFF',
  gray50: '#F9F9F9',
  gray100: '#F2F2F2',
  gray200: '#E0E0E0',
  gray400: '#9E9E9E',
  gray600: '#616161',
  gray900: '#1A1A1A',

  success: '#2E7D32',
  warning: '#E65100',
  error: '#C62828',
  info: '#0277BD',

  orderStatus: {
    pending: '#9E9E9E',
    accepted: '#0277BD',
    preparing: '#E65100',
    ready: '#558B2F',
    delivered: '#2E7D32',
    cancelled: '#C62828',
  },
};
```

---

## Typography

### Font Stack

**Primary Font: Inter** (available via Expo Google Fonts)
- Clean, modern, highly readable on mobile screens
- Excellent Arabic character support (important for future localization)
- System-level fallback: `-apple-system` / `Roboto`

**Display Font (headers, branding): Playfair Display**
- Adds elegance and warmth to brand headers
- Used sparingly (app name, welcome screen, section headers)

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `displayLarge` | 32px | 700 (Bold) | 40px | Welcome screen headline |
| `displayMedium` | 26px | 700 | 34px | Section headers |
| `headingLarge` | 22px | 600 (SemiBold) | 30px | Screen titles |
| `headingMedium` | 18px | 600 | 26px | Card titles |
| `headingSmall` | 16px | 600 | 22px | Item names, subsections |
| `bodyLarge` | 16px | 400 (Regular) | 24px | Primary body text |
| `bodyMedium` | 14px | 400 | 21px | Secondary text, descriptions |
| `bodySmall` | 12px | 400 | 18px | Captions, timestamps, tags |
| `label` | 12px | 600 | 16px | Labels, badges, buttons |
| `price` | 20px | 700 | 26px | Price display |
| `priceSmall` | 14px | 600 | 20px | Subtotals, comparisons |

### Font Constants File

```js
// src/constants/fonts.js
export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'PlayfairDisplay_700Bold',
};

export const TextStyles = {
  displayLarge: { fontFamily: Fonts.bold, fontSize: 32, lineHeight: 40 },
  headingLarge: { fontFamily: Fonts.semiBold, fontSize: 22, lineHeight: 30 },
  headingMedium: { fontFamily: Fonts.semiBold, fontSize: 18, lineHeight: 26 },
  bodyLarge: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: Fonts.semiBold, fontSize: 12, lineHeight: 16 },
  price: { fontFamily: Fonts.bold, fontSize: 20, lineHeight: 26, color: Colors.primary },
};
```

---

## Spacing & Layout

### 8pt Grid System

All spacing uses multiples of 8 (with 4 as the minimum granularity):

```js
// src/constants/spacing.js
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};
```

### Border Radius

```js
export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,  // Pill shape for tags, badges
};
```

### Shadow System

```js
export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,  // Android
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
};
```

---

## Component Library

### Core Components

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | `variant`, `size`, `label`, `onPress`, `loading`, `disabled` | Primary, secondary, ghost variants |
| `Input` | `label`, `placeholder`, `error`, `secureText`, `keyboardType` | Form input with label and error state |
| `FoodCard` | `item`, `onPress`, `onAddToCart` | Item card for browse/search grid |
| `CartItem` | `item`, `onIncrement`, `onDecrement`, `onRemove` | Cart line item |
| `OrderCard` | `order`, `onPress` | Order history list item |
| `OrderStatusBadge` | `status` | Colored badge for order status |
| `CategoryPill` | `category`, `selected`, `onPress` | Horizontal scroll category filter |
| `Badge` | `count`, `color` | Notification/cart count badge |
| `LoadingSpinner` | `size`, `color` | Loading indicator |
| `ErrorMessage` | `message`, `onRetry` | Error state with retry option |
| `EmptyState` | `title`, `subtitle`, `icon` | Empty list illustration |
| `Avatar` | `uri`, `name`, `size` | User/seller avatar with fallback initials |

### FoodCard Design Spec

```
┌─────────────────────────┐
│                         │
│   [Food Image 16:9]     │
│                         │
├─────────────────────────┤
│ Category Tag            │
│ Tagine Poulet aux...    │
│ ⏱ 45 min               │
│                  65 MAD │
│                [+ Add]  │
└─────────────────────────┘
```

### OrderStatusBadge Variants

```
●  Pending    (Gray pill)
●  Accepted   (Blue pill)
●  Preparing  (Amber pill)
●  Ready      (Light Green pill)
●  Delivered  (Green pill)
●  Cancelled  (Red pill)
```

---

## UX Flows

### Customer Order Flow

```
HomeScreen
    ↓ (tap food card)
FoodDetailScreen
    [Add to Cart button]
    ↓ (cart updated, badge shows count)
CartScreen
    [Review items → tap Checkout]
    ↓
CheckoutScreen
    [Fill delivery address → Confirm Order]
    ↓ (API call: POST /orders)
OrderConfirmationScreen
    [Success animation + order ID]
    ↓ (auto or manual)
OrderDetailScreen
    [Live status updates when seller changes status]
```

### Seller Order Management Flow

```
SellerDashboardScreen
    (notification arrives: "New order!")
    ↓
SellerOrdersScreen (tab: New)
    [Tap incoming order]
    ↓
SellerOrderDetailScreen
    [Review items, address, notes]
    ↓
    [Accept] or [Reject]
    ↓ (if accepted)
    Status: accepted → customer notified
    ↓
    [Mark as Preparing]
    Status: preparing → customer notified
    ↓
    [Mark as Ready]
    Status: ready → customer notified
    ↓
    [Mark as Delivered]
    Status: delivered → order complete
```

### Seller Registration & Approval Flow

```
RegisterSellerScreen
    ↓ (submit)
PendingApprovalScreen
    "Your account is being reviewed. We'll notify you within 24 hours."
    ↓ (admin approves → FCM notification)
Notification arrives
    ↓
SellerNavigator loads
    ↓
SellerDashboardScreen
    "Welcome! Start adding your menu items."
```

---

## Admin Dashboard Structure

The admin dashboard is a React.js SPA designed for desktop browsers (1024px+ viewport). It uses a classic sidebar navigation layout.

### Layout Structure

```
┌────────────────────────────────────────────────────────┐
│  TOPBAR: @ZAY Admin  │  Search  │  Admin Name  │ Logout│
├──────────┬─────────────────────────────────────────────┤
│          │                                             │
│ SIDEBAR  │   MAIN CONTENT AREA                        │
│          │                                             │
│ Dashboard│                                             │
│ Sellers  │                                             │
│  └Pending│                                             │
│ Users    │                                             │
│ Orders   │                                             │
│ Moderation│                                            │
│ Categories│                                            │
│          │                                             │
└──────────┴─────────────────────────────────────────────┘
```

### Page Designs

**Dashboard Page:**
```
Row 1: Stat cards
  [Total Users]  [Total Sellers]  [Pending Approvals]  [Total Orders Today]

Row 2: Charts
  [Orders This Week - Bar Chart]  [Revenue This Month - Line Chart]

Row 3: Recent activity
  [Latest Orders Table]  [Pending Seller Queue]
```

**Sellers Page:**
```
Filter bar: [All | Pending | Approved | Rejected | Suspended] [Search...]

Table:
  Business Name | Seller Name | City | Status | Date Registered | Actions
  ──────────────────────────────────────────────────────────────────────
  Dar Khadija   | Khadija B.  | Casa | Pending | Jan 15, 2024   | [Review]
  ...

Clicking "Review" opens a detail panel or navigates to SellerDetailPage
```

**SellerDetailPage:**
```
Left panel:
  - Seller photo
  - Business name, bio
  - Address, city
  - Registration date
  - Current status

Right panel:
  - Menu items (with images for moderation)
  - Action buttons: [Approve] [Reject] [Suspend]
  - If rejecting: text input for reason
```

**Orders Page:**
```
Filter bar: [Status dropdown] [Date range picker] [Search by order ID]

Table:
  Order ID | Customer | Seller | Items | Total | Status | Date | Action
  ──────────────────────────────────────────────────────────────────────
  #ORD-001 | Fatima A | Khadija | 3    | 195   | Delivered | Jan 15 | [View]
```

### Admin Color Theme

The admin dashboard uses a more professional/neutral palette:
- Background: `#F5F6FA` (light gray)
- Sidebar: `#1E1E2D` (dark navy)
- Sidebar active: `#E8520A` (brand orange)
- White cards on gray background
- Same semantic colors as mobile app (success, warning, error)
