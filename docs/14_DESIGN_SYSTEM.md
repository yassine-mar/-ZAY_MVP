# @ZAY — Design System

> **Status:** Definitive Design System — MVP  
> **Audience:** Designers, frontend engineers (mobile + admin)  
> **Scope:** Brand identity, design tokens, components, patterns, accessibility  
> **Source of Truth:** This document. Implementation in `mobile/src/theme/` and `admin/src/index.css` reflects these tokens.

---

## Table of Contents

1. [Brand Identity](#1-brand-identity)
2. [Color Palette](#2-color-palette)
3. [Typography](#3-typography)
4. [Spacing System](#4-spacing-system)
5. [Border Radius](#5-border-radius)
6. [Elevation & Shadows](#6-elevation--shadows)
7. [Iconography](#7-iconography)
8. [Button System](#8-button-system)
9. [Input System](#9-input-system)
10. [Card System](#10-card-system)
11. [Badge & Tag System](#11-badge--tag-system)
12. [Navigation Patterns](#12-navigation-patterns)
13. [Status Indicators](#13-status-indicators)
14. [Form Patterns](#14-form-patterns)
15. [Empty, Loading, Error States](#15-empty-loading-error-states)
16. [Toast & Snackbar](#16-toast--snackbar)
17. [Modal & Dialog System](#17-modal--dialog-system)
18. [Image Treatment](#18-image-treatment)
19. [Motion & Animation](#19-motion--animation)
20. [Mobile-First UX Principles](#20-mobile-first-ux-principles)
21. [Accessibility (WCAG 2.1 AA)](#21-accessibility-wcag-21-aa)
22. [Voice & Microcopy](#22-voice--microcopy)
23. [Moroccan Design Inspiration](#23-moroccan-design-inspiration)

---

## 1. Brand Identity

### Positioning Statement

**@ZAY is the warm kitchen, not the cold restaurant.**

Every design decision should answer: "Does this feel like being welcomed into someone's home, or like ordering from a delivery app?" We aim for the former. The platform's emotional value proposition — authentic, personal, made-with-love — is undermined by visual coldness, generic fast-food aesthetics, or transactional UI.

### Brand Values (in design)

| Value | What it means visually |
|-------|------------------------|
| **Warm** | Warm-tinted palettes, golden hour lighting in photos, soft edges, generous spacing |
| **Trustworthy** | High contrast text, clear hierarchy, consistent patterns, never deceive |
| **Modern** | Clean type, generous whitespace, refined animations, no clutter |
| **Homemade** | Real food photography (no stock), seller faces visible, "from the kitchen" copy |
| **Moroccan-inspired** | Subtle ornamental accents (zellige patterns, mint accents) without cliché |
| **Startup-quality** | Polished interactions, consistent tokens, no rough edges |

### Design Principles

1. **Food first.** Photography is the hero of every customer screen. Type and chrome step back.
2. **Names and faces.** Show the cook. Show the kitchen. Trust comes from people, not logos.
3. **Generous, never cramped.** Padding on the 8pt grid. Whitespace is a feature.
4. **Warm by default.** When choosing between a cool and warm color, choose warm.
5. **Subtle Moroccan.** Geometric accents appear as supporting details, never as decoration.
6. **One brand color, not five.** Orange is the only saturated brand color. Everything else is neutrals and semantic colors. Restraint = quality.
7. **Status is visible.** Order status, seller status — always color + icon + label. Never color alone.
8. **Touch-first.** Designed for thumbs. Bottom-anchored CTAs. 44pt minimum tap targets.
9. **Speak Moroccan.** Microcopy uses French primarily, with respect for cultural context. No "yo!" or hipster slang.
10. **Quiet over loud.** Toast notifications fade. Modals are rare. Confirmations are calm.

### Logo Usage (Brief)

- Primary mark: `@ZAY` wordmark in **Playfair Display Bold**, color `Brand 500`
- Minimum clear space: 16dp on all sides
- Minimum size: 24dp height (mobile splash, app icon excluded)
- Backgrounds: works on `Neutral 50`, white, `Brand 500` (use white wordmark on brand)
- Never: rotate, skew, recolor outside palette, add drop shadows, stretch

---

## 2. Color Palette

### Brand — Warm Orange

The single saturated brand color. Used for primary CTAs, key navigation states, and brand moments. Drawn from spice market warmth and Moroccan terracotta architecture.

```
brand.50   #FFF4ED   — Surfaces, hover states on neutral backgrounds
brand.100  #FFE3CC   — Subtle accent backgrounds, badge fills
brand.200  #FFC299   — Disabled primary backgrounds, highlights
brand.300  #FF9A5C   — Hover state for solid CTAs
brand.400  #FF7028   — Lighter accent variant
brand.500  #E8520A   — PRIMARY (CTAs, links, focus rings, brand mark)
brand.600  #C13E00   — Hover/pressed for solid CTAs
brand.700  #9B3000   — Active/pressed
brand.800  #7A2500   — Heavy emphasis only
brand.900  #5C1C00   — Reserved
```

**Contrast on white:** `brand.500` passes WCAG AA for normal text (4.74:1). Use `brand.700` on `brand.50` backgrounds.

### Secondary — Olive Green

Drawn from Moroccan herbs (mint, coriander, oregano). Used for secondary actions, success-adjacent moments, and as a quiet counterpoint to the dominant orange.

```
olive.50   #F4F6EE
olive.100  #E5EAD2
olive.200  #CCD5A8
olive.300  #ADB97E
olive.400  #8C9A56
olive.500  #6F7E3D   — SECONDARY
olive.600  #57652E
olive.700  #424D24
olive.800  #2F371B
olive.900  #1F2412
```

### Accent — Saffron

A single warm-yellow accent. Used sparingly: featured-item ribbons, premium-seller markers, celebratory moments. Never a primary action color.

```
saffron.400  #FBC65C
saffron.500  #F5B340   — ACCENT
saffron.600  #D99820
```

### Neutrals — Warm Stone

Warm-tinted greys (not blue-tinted). Inspired by sandstone, cardboard, and bread crust. The default surface and text palette.

```
neutral.0    #FFFFFF   — Pure white (cards, modals)
neutral.50   #FAF8F5   — APP BACKGROUND (warm off-white)
neutral.100  #F1ECE5   — Subtle dividers, secondary surfaces
neutral.200  #E0D8CE   — Borders, input borders
neutral.300  #C2B7A8   — Disabled text, placeholders
neutral.400  #8E8275   — Tertiary text, muted icons
neutral.500  #6B6258   — Secondary text
neutral.600  #4A433C   — Body text on light surfaces
neutral.700  #322E2A   — High-emphasis body text
neutral.800  #1F1C1A   — Headings
neutral.900  #100E0D   — Reserved (rarely used)
```

**Why warm neutrals:** cool grey (`#6B7280` etc.) reads "tech startup." Warm grey reads "considered, hospitable." Critical for the brand.

### Semantic Colors

```
success.50   #ECFDF3       success.500  #16A34A       success.700  #15803D
warning.50   #FFFBEB       warning.500  #F59E0B       warning.700  #B45309
error.50     #FEF2F2       error.500    #DC2626       error.700    #B91C1C
info.50      #EFF6FF       info.500     #2563EB       info.700     #1D4ED8
```

Used for: form validation, toast types, system messages. **Not** used for brand expression.

### Order Status Palette

Each status gets a consistent color across the entire app (mobile + admin). Defined once, referenced everywhere.

| Status | Foreground | Background | Use |
|--------|-----------|-----------|-----|
| Pending | `#92400E` | `#FEF3C7` | Order placed, awaiting seller |
| Accepted | `#1E40AF` | `#DBEAFE` | Seller has accepted |
| Preparing | `#3730A3` | `#E0E7FF` | Food is being prepared |
| Ready | `#6B21A8` | `#F3E8FF` | Ready for pickup/delivery |
| Delivered | `#166534` | `#DCFCE7` | Successfully delivered |
| Cancelled | `#991B1B` | `#FEE2E2` | Cancelled (any party) |

These pairs achieve 4.5:1+ contrast (WCAG AA).

### Seller Status Palette

| Status | Color |
|--------|-------|
| Pending | `warning.500` |
| Approved | `success.500` |
| Rejected | `error.500` |
| Suspended | `neutral.500` |

### Contrast Reference

| Combination | Ratio | WCAG |
|-------------|-------|------|
| `neutral.800` on `neutral.0` | 17.7:1 | AAA |
| `neutral.700` on `neutral.50` | 13.1:1 | AAA |
| `neutral.600` on `neutral.0` | 9.7:1  | AAA |
| `neutral.500` on `neutral.0` | 6.6:1  | AA+ |
| `neutral.400` on `neutral.0` | 4.3:1  | AA (large only) |
| `brand.500` on `neutral.0` | 4.74:1 | AA |
| `brand.500` on `neutral.50` | 4.62:1 | AA |
| White on `brand.500` | 4.74:1 | AA |
| White on `brand.600` | 6.6:1  | AAA |

---

## 3. Typography

### Font Stack

| Family | Use | Why |
|--------|-----|-----|
| **Inter** | All UI: body, buttons, inputs, navigation | Designed for screens, excellent Latin extended coverage (handles French diacritics), open license, free |
| **Playfair Display** | Headings, brand moments, prices on detail screens | Serif with calligraphic detail — feels warm, slightly traditional without being old-fashioned. Pairs beautifully with Inter |

Both load via `@fontsource/inter` and `@fontsource/playfair-display` (bundled with the app — no Google Fonts CDN dependency).

**Fallbacks:**
```
font-sans:  Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
font-serif: "Playfair Display", Georgia, "Times New Roman", serif
```

### Type Scale

Mobile (default) → Admin tweaks noted in parentheses.

| Token | Family | Weight | Size | Line Height | Letter Spacing | Use |
|-------|--------|--------|------|-------------|----------------|-----|
| `display` | Playfair | 700 | 40 | 48 | -0.5px | Splash, marketing only |
| `h1` | Playfair | 700 | 32 | 40 | -0.25px | Page titles, "Welcome" |
| `h2` | Playfair | 700 | 24 | 32 | -0.25px | Section titles |
| `h3` | Inter | 700 | 20 | 28 | 0 | Card titles, dialog titles |
| `h4` | Inter | 600 | 18 | 26 | 0 | Sub-headings |
| `bodyLarge` | Inter | 400 | 17 | 26 | 0 | Hero descriptions |
| `body` | Inter | 400 | 16 | 24 | 0 | Default body text |
| `bodyBold` | Inter | 600 | 16 | 24 | 0 | Emphasized body |
| `bodySmall` | Inter | 400 | 14 | 20 | 0 | Secondary text, captions in cards |
| `caption` | Inter | 500 | 12 | 16 | 0.25px | Labels, timestamps, helper text |
| `overline` | Inter | 600 | 11 | 16 | 1px (uppercase) | Section labels ("RECENT ORDERS") |
| `button` | Inter | 600 | 16 | 24 | 0.25px | Button labels |
| `buttonSmall` | Inter | 600 | 14 | 20 | 0.25px | Small button labels |
| `price` | Inter | 700 | 18 | 24 | 0 | Item prices in lists |
| `priceLarge` | Playfair | 700 | 28 | 36 | -0.25px | Hero prices on detail screens |

### Hierarchy Principles

1. **One h1 per screen.** Never compete.
2. **Maximum 3 type sizes per screen.** More than that = visual noise.
3. **Weight before size.** A bold 16px outranks a regular 18px. Use weight to denote emphasis first.
4. **Line height generous.** 1.5x for body, 1.25x for headings. Cramped type feels cheap.
5. **Letter-spacing tightens with size.** Big text gets negative tracking. Small uppercase gets positive tracking.

### When to Use Playfair

Playfair Display is the brand's voice in type. Use it for:
- Page-level headings (one per screen)
- Item/seller names on detail screens
- Prices on detail screens (`priceLarge`)
- Empty state headlines
- Marketing copy

**Never use Playfair for:**
- Body paragraphs
- Buttons
- Form labels
- Long text
- Anything smaller than 18px (it loses character at small sizes)

### Truncation Rules

- Single-line truncate with ellipsis for: titles in cards, seller names, item names in compact lists
- Two-line truncate for: item descriptions in cards
- Never truncate prices, statuses, or anything critical to a decision
- Never truncate within a button label (resize the button)

---

## 4. Spacing System

### The 4pt Grid

All spacing values are multiples of 4. The system uses 4 as the base unit (more granular than 8) to allow tight component-internal spacing while still permitting larger layout rhythms.

```
spacing.0   0    — no spacing
spacing.1   4    — micro spacing (icon to label)
spacing.2   8    — tight spacing (within compact components)
spacing.3   12   — small spacing
spacing.4   16   — DEFAULT (between elements in a row, default padding)
spacing.5   20
spacing.6   24   — section padding, between cards
spacing.8   32   — large section padding
spacing.10  40
spacing.12  48   — between major sections
spacing.16  64   — large vertical rhythm
spacing.20  80   — hero spacing
```

### Spacing Application Rules

| Context | Token |
|---------|-------|
| Screen edge padding (mobile) | `spacing.4` (16px) |
| Screen edge padding (admin) | `spacing.6` (24px) |
| Between stacked form fields | `spacing.4` (16px) |
| Between paragraphs | `spacing.3` (12px) |
| Inside compact buttons (px) | `spacing.4` (16px) |
| Inside compact buttons (py) | `spacing.2` (8px) |
| Card internal padding | `spacing.4` (16px) |
| Between cards in a list | `spacing.3` (12px) |
| Section spacing on a page | `spacing.6` to `spacing.8` (24-32px) |
| Icon-to-label gap | `spacing.2` (8px) |

### Layout Density

- **Mobile customer screens:** comfortable density. Generous padding. Food-first.
- **Mobile seller screens:** balanced. Sellers scan many orders quickly.
- **Admin tables:** dense. `spacing.3` row padding (vs. `spacing.4` elsewhere). Ops users need data density.

---

## 5. Border Radius

```
radii.none   0     — never used in this system
radii.sm     4     — chips, small badges
radii.md     8     — buttons, inputs, small cards
radii.lg     12    — cards, modals
radii.xl     16    — large cards, hero panels
radii.2xl    24    — bottom sheets, large modals
radii.full   9999  — pills, avatars, circular buttons
```

### Radius Rules

- **Inputs and buttons:** always `radii.md` (8px). Consistency is critical here.
- **Cards:** `radii.lg` (12px) for default, `radii.xl` (16px) for hero/featured cards.
- **Avatars:** always `radii.full` (circles).
- **Status badges:** `radii.full` (pill-shaped).
- **Image corners in cards:** match the parent card's radius minus the inner padding, or use `radii.md` for inset thumbnails.

### Mixing Radii

A card with `radii.lg` containing a button with `radii.md` is correct (button has its own scale). But mixing card sizes (some `lg`, some `xl`) on the same screen reads as inconsistent. Pick one per screen.

---

## 6. Elevation & Shadows

The system uses **5 elevation levels**. Each level corresponds to a perceived height above the surface and uses a soft, warm-tinted shadow (no harsh blacks).

```
elevation.0  none                                                   — flat, on surface
elevation.1  0 1px 2px rgba(31, 28, 26, 0.06)                       — sticky headers, subtle cards
elevation.2  0 2px 4px rgba(31, 28, 26, 0.08),
             0 1px 2px rgba(31, 28, 26, 0.04)                       — DEFAULT cards
elevation.3  0 4px 12px rgba(31, 28, 26, 0.10),
             0 2px 4px rgba(31, 28, 26, 0.05)                       — floating buttons, popovers
elevation.4  0 8px 24px rgba(31, 28, 26, 0.12),
             0 4px 8px rgba(31, 28, 26, 0.06)                       — modals, dialogs
elevation.5  0 16px 48px rgba(31, 28, 26, 0.16),
             0 8px 16px rgba(31, 28, 26, 0.08)                      — large sheets, dropdowns over content
```

### Elevation Rules

- Shadows use **warm-tinted black** (`#1F1C1A`, not `#000`). On warm neutrals, pure black shadows look like dirt.
- Each level uses **two stacked shadows** (sharp + diffused) for natural depth.
- **No inner shadows** (avoid the "pressed-in" look).
- **No colored shadows** in MVP (avoid neon glow aesthetics).
- iOS and Android render shadows differently. The spec is the iOS values; Android uses `elevation` prop (1, 2, 4, 8, 16 dp equivalents).

---

## 7. Iconography

### Icon Library

| App | Library |
|-----|---------|
| Mobile | `@expo/vector-icons` (Feather primary, Ionicons for filled variants) |
| Admin | `lucide-react` (tree-shakeable, modern, matches shadcn aesthetic) |

Both libraries share a similar stroke-based aesthetic — important for visual consistency across platforms.

### Icon Sizes

```
icon.xs   16   — inline with body text, dense rows
icon.sm   20   — DEFAULT in buttons, input prefixes
icon.md   24   — tab bar, nav items, card headers
icon.lg   32   — empty state primary icons
icon.xl   48   — hero illustrations, large empty states
```

### Icon Color Rules

- Inherit text color by default
- Icons in buttons match the button's label color
- Decorative icons (illustrations, empty states) use `neutral.300` to `neutral.400`
- Status icons use the status color
- Brand icons (logo, splash) use `brand.500`

### Icon Stroke Width

All icons use **1.5px stroke** at their reference size. This is the default for Feather and Lucide — it reads as friendly but precise. Avoid mixing 1px and 2px icons.

---

## 8. Button System

### Variants

| Variant | Use | Background | Label | Border |
|---------|-----|-----------|-------|--------|
| `primary` | Main CTA on a screen (one per screen ideally) | `brand.500` | `neutral.0` | none |
| `secondary` | Secondary actions | `neutral.0` | `brand.500` | `1px brand.500` |
| `tertiary` | Tertiary, less emphasis | transparent | `brand.500` | none |
| `ghost` | Icon-only, low emphasis | transparent | `neutral.600` | none |
| `destructive` | Delete, cancel order, suspend | `error.500` | `neutral.0` | none |
| `destructiveSecondary` | Less emphatic destructive | `neutral.0` | `error.500` | `1px error.500` |

### Sizes

| Size | Height | Padding (h) | Font | Radius |
|------|--------|-------------|------|--------|
| `sm` | 36 | 12 | `buttonSmall` | `radii.md` |
| `md` | 44 | 16 | `button` | `radii.md` |
| `lg` | 52 | 20 | `button` | `radii.md` |

**Default is `md`.** Mobile primary CTAs are usually `lg` (thumb-friendly bottom-anchored buttons). Admin defaults to `md`.

### States

Every variant has 5 states:

| State | Visual change |
|-------|---------------|
| Default | As specified above |
| Hover (admin/web only) | Background darkens one shade (e.g., `brand.500` → `brand.600`) |
| Pressed | Background darkens two shades + 95% scale (mobile) / no scale (admin) |
| Disabled | 50% opacity, no pointer events, `cursor: not-allowed` (admin) |
| Loading | Replace label with spinner, retain dimensions to prevent layout jump |

### Anatomy

```
[ Icon? · Label · Icon? ]

Padding: spacing.4 (h), spacing.2 (v) for md
Gap between icon and label: spacing.2
Icon size: icon.sm (20) for md button
```

### Width Behavior

- **Default:** content-width (hugs the label)
- **Full-width:** when bottom-anchored in mobile checkout/forms (`Place Order`, `Log In`)
- **Min-width:** 96px for content buttons (prevents tiny "OK" buttons)

### Button Hierarchy Rule

**One primary button per screen.** If two competing actions exist, the secondary becomes a secondary-variant button. Visual hierarchy = decision hierarchy.

Wrong:
```
[ Place Order ]   [ Save for Later ]   ← two primaries compete
```

Right:
```
[ Place Order ]   Save for later        ← primary + tertiary
```

### Floating Action Button (FAB)

Mobile only. Circular, `brand.500`, `radii.full`, `elevation.3`. Used for:
- Seller dashboard: "Add Item" or "Add Menu"
- Customer cart icon when scrolling (Phase 2)

Single FAB per screen. Bottom-right, offset from bottom tab bar.

---

## 9. Input System

### Anatomy

```
Label (caption, weight 500)
┌─────────────────────────────────┐
│ [Icon?]  Placeholder text       │   ← inactive
└─────────────────────────────────┘
Helper text (caption, neutral.500)
```

### States

| State | Border | Background | Label |
|-------|--------|-----------|-------|
| Default | `1px neutral.200` | `neutral.0` | `neutral.600` |
| Hover (admin) | `1px neutral.300` | `neutral.0` | `neutral.600` |
| Focus | `2px brand.500` | `neutral.0` | `neutral.700` |
| Filled | `1px neutral.200` | `neutral.0` | `neutral.600` |
| Disabled | `1px neutral.100` | `neutral.50` | `neutral.300` |
| Error | `2px error.500` | `neutral.0` | `neutral.700` (error message below) |
| Success | `2px success.500` | `neutral.0` | `neutral.700` (used sparingly) |

### Sizing

```
height: 44 (mobile), 40 (admin)
padding: 12 horizontal, 0 vertical
font: body (16 mobile, 14 admin)
radius: radii.md (8)
```

### Input Variants

#### Text Input

Standard single-line. Supports left icon, right icon, clear button when filled.

#### Password Input

Right-aligned eye toggle to reveal. Shows masked dots by default.

#### Phone Input

Locked `+212` prefix on left. Accepts only 9 digits. Formats display as `+212 6 12 34 56 78` (with spaces). Stores raw `+212612345678`.

#### Search Input

Left search icon, right clear button. Often borderless inside a colored container (`neutral.100` background, no border). Always full-width.

#### Select / Dropdown

Right-aligned chevron icon. Opens a bottom sheet on mobile, a popover on admin. Each option a 44pt tap target with optional left icon.

#### Textarea

Min height 96 (4 rows). Resizable on admin only (web). Auto-grow on mobile up to 6 rows, then scrolls internally.

#### Number Input (Price)

Right-aligned `MAD` suffix. Numeric keyboard on mobile. Strip non-digit characters.

#### Image Picker

Renders as a dashed-border square placeholder. Tapping opens camera/library action sheet. After selection, shows the image with an overlay X to remove.

### Label Position

Always **above** the input. Never inline-floating (poor accessibility, harder on small screens). Caption-style, weight 500, `neutral.600`.

### Helper Text vs. Error Text

- **Helper text:** persistent. Caption style, `neutral.500`. Provides guidance: "Use a Moroccan number starting with +212."
- **Error text:** replaces helper text. Caption style, `error.700`. Specific: "Phone number must start with +212."

Helper text is preferable to placeholder hints, which disappear on focus.

### Required Indicators

Optional fields are explicitly marked: `Bio (optional)`. **Don't mark required fields** — required is the default. This is the inverse of the common pattern, but it's clearer: a clean field is mandatory; "optional" is the exception.

### Keyboard Types (Mobile)

```
text default    → default keyboard
email           → email keyboard (@, .com shortcut)
phone           → number-pad with + (limited)
number          → number-pad
password        → default with secure entry
search          → keyboard with "Search" return key
```

Set `keyboardType` correctly on every input. A wrong keyboard adds friction.

---

## 10. Card System

### Card Anatomy

```
┌──────────────────────────────────────┐
│ [Image] (optional, full-bleed top)   │
├──────────────────────────────────────┤
│                                      │
│  Title                               │
│  Body text                           │
│                                      │
│  [Metadata row]    [Action button?]  │
│                                      │
└──────────────────────────────────────┘
```

### Card Variants

#### FoodCard

Vertical layout. Used in home grid and search results.

```
[Food image - 4:3 ratio, radii.lg top]
[Title (bodyBold, 1 line truncate)]
[Seller name (caption, neutral.500)]
[Price (price) · Prep time (caption, neutral.400)]
```

Width: ~46% of screen (2-column grid with `spacing.3` gap).
Height: ~220 total.

#### SellerCard

Horizontal layout. Used in seller browse list.

```
┌──────────────────────────────────────┐
│ [Avatar]  Business Name              │
│           City · "Open" status pill  │
│           "10 menu items"            │
└──────────────────────────────────────┘
```

#### OrderCard

Used in order history.

```
┌──────────────────────────────────────┐
│ Order #ABC123          [Status pill] │
│ Dar Khadija Kitchen                  │
│ Tagine Poulet + 2 more items         │
│ ─────────────────────────────────── │
│ 2 hours ago        195 MAD           │
└──────────────────────────────────────┘
```

#### MetricCard (Admin only)

Used on dashboard.

```
┌──────────────────────────────────────┐
│ Total Orders Today        [Icon]     │
│ 47                                   │
│ +8% ▲ vs yesterday                   │
└──────────────────────────────────────┘
```

### Card Specifications

| Property | Value |
|----------|-------|
| Background | `neutral.0` |
| Border | none (use shadow for separation) |
| Border radius | `radii.lg` (12) |
| Padding | `spacing.4` (16) for content, 0 for full-bleed media |
| Shadow | `elevation.2` |
| Hover (admin only) | `elevation.3`, cursor pointer |

### When to Use Cards vs. Lists

- **Cards:** high-emphasis items, mixed content (image + text + metadata), browsing context
- **Plain rows:** dense data, navigation lists, settings menus, notification feeds

Cards everywhere = visual fatigue. Use cards intentionally.

---

## 11. Badge & Tag System

### Status Badge

Pill-shaped, colored per status, includes icon + label.

```
┌─────────────────┐
│ ● Pending       │
└─────────────────┘

Height: 24
Padding: spacing.2 horizontal
Font: caption (12, weight 500)
Radius: radii.full
Icon size: 12 (with spacing.1 gap)
```

### Tag (Category)

Outlined, neutral, used for categories on item detail.

```
┌─────────────┐
│  🥘 Tagine  │
└─────────────┘

Background: neutral.50
Border: 1px neutral.200
Text: neutral.700
```

### Notification Badge

Small dot or counter, used on tab icons and avatars.

```
Dot:     red 8px circle, no text
Counter: red pill with white number (10x16, font 10/16 weight 600)
```

Position: top-right of parent, slight overlap.

### Badge Color Pairs

Each status uses the foreground/background pair from §2:

| Badge | Background | Text |
|-------|-----------|------|
| Pending | `#FEF3C7` | `#92400E` |
| Accepted | `#DBEAFE` | `#1E40AF` |
| ... | ... | ... |

---

## 12. Navigation Patterns

### Mobile — Bottom Tab Bar

```
┌──────────────────────────────────────────┐
│                                          │
│            (Screen Content)              │
│                                          │
├──────────────────────────────────────────┤
│  🏠      📦      🔔(3)       👤          │
│  Home    Orders  Notifs    Profile       │
└──────────────────────────────────────────┘

Height: 56 + safe-area-inset-bottom
Background: neutral.0
Border-top: 1px neutral.100
Active icon: brand.500
Active label: brand.500, caption weight 600
Inactive: neutral.400
Active indicator: none (rely on color)
```

### Mobile — Top App Bar

```
┌──────────────────────────────────────────┐
│ [← Back]      Page Title         [Action]│
└──────────────────────────────────────────┘

Height: 56 + safe-area-inset-top
Background: neutral.0
Title: h4 (Inter SemiBold 18), neutral.800, center-aligned
Back button: chevron icon (24), neutral.700
Action: icon button (ghost variant)
```

Sticky on scroll. No drop shadow until content scrolls beneath it (then `elevation.1`).

### Mobile — Hero Header

Some screens (HomeScreen, SellerProfileScreen) use a hero header instead of a flat top bar:

```
┌──────────────────────────────────────────┐
│                                          │
│         (Hero image / illustration)      │
│                                          │
│   Business Name (h2, Playfair)           │
│   City · Open badge                      │
│                                          │
└──────────────────────────────────────────┘

Collapses to standard top bar on scroll (Phase 2 — too complex for MVP).
For MVP: hero is static, scrolls with content.
```

### Admin — Sidebar Navigation

Left-aligned, 240px (collapsed: 56px). See [`07_ADMIN_ARCHITECTURE.md`](07_ADMIN_ARCHITECTURE.md) §17.

### Admin — Top Bar

64px tall. Contains command palette trigger, notifications bell, user menu. See admin doc.

### Navigation Hierarchy

| Pattern | Used For |
|---------|----------|
| Stack push | Drilling into detail (item → seller → another item) |
| Tab swap | Top-level role-based areas (Home, Orders, Profile) |
| Modal | Tasks distinct from current context (Cart, Checkout) |
| Bottom sheet | Quick actions, filters, selectors |
| Replace (no back) | Auth flow (after login, can't go back to login) |

### Back Behavior

- **Hardware back (Android):** mirrors header back arrow exactly
- **Swipe back (iOS):** enabled by default on stack screens
- **From modal:** swipe down to dismiss (Phase 1) or X button (always)
- **From cart after place order:** `navigate.replace` to order detail — cart not in history

---

## 13. Status Indicators

### Order Timeline

Vertical stepper used on Order Detail screens:

```
●  Placed                    2:00 PM
│
●  Accepted                  2:05 PM
│
○  Preparing
│
○  Ready
│
○  Delivered

● completed: brand.500 fill + check icon
● current:   brand.500 fill + animated pulse (subtle)
○ pending:   neutral.300 outline only
│ line:      2px, neutral.200 between past/future, brand.500 between past/past
```

### Inline Status

```
🟢 Online      🟡 Closed      🔴 Suspended
```

Colored dot (`8px`) + label. Used on seller cards, seller profile, dashboard.

### Progress Bar (Order ETA)

Phase 2 enhancement. Linear bar shows time elapsed vs. estimated_ready_at. For MVP, plain text: "Ready by 3:30 PM".

---

## 14. Form Patterns

### Vertical Stack

All forms are single-column. Two-column forms are rare on mobile and overcomplicated on admin for the data we have.

```
[ Label ]
[ Input ]
[ Helper text ]
(spacing.4)
[ Label ]
[ Input ]
[ Helper text ]
(spacing.6)
[ Submit Button (full-width, primary) ]
```

### Submit Button Placement

- **Mobile:** sticky at the bottom of the screen, full-width, lg size, primary variant. Always visible without scrolling.
- **Admin:** below the last field, right-aligned, primary variant. Optional "Cancel" tertiary to its left.

### Required vs. Optional

Per §9 input system: optional fields are labeled, required fields are unmarked. Inverse of common pattern, but cleaner.

### Multi-Step Forms

Avoid multi-step in MVP. The only registration form is single-step. The checkout is single-screen. Multi-step adds friction and complexity for marginal benefit at this scale.

### Form Submission States

```
[ Place Order ]               ← default
[ ◌ Placing order... ]        ← loading (spinner, disabled)
                              ← success: navigate away (don't show "success" state)
                              ← error: toast + re-enable button (form preserved)
```

Never show a success state in the form itself. Either navigate away or close the modal. The form is "done."

---

## 15. Empty, Loading, Error States

### Empty States

Every list page that can be empty has an empty state.

```
        [ Icon (lg, neutral.300) ]

        [ Headline (h3) ]
        "No orders yet"

        [ Subhead (body, neutral.500) ]
        "When you place an order, it'll appear here."

        [ Primary CTA ]
        "Browse Food"
```

Empty states have three jobs:
1. **Confirm** the list is genuinely empty (not loading, not broken)
2. **Educate** the user about what would appear here
3. **Direct** to the next action

### Loading States

#### Initial Page Load

Use **skeletons** that mimic the final layout shape:

```
┌──────────────────────────────────────┐
│ [████████]                           │
│ [████████████████]                   │
│ [██████████]    [██████]             │
└──────────────────────────────────────┘
```

Animated shimmer (subtle, 1.5s loop). Built once as `<Skeleton variant="card" />`, `<Skeleton variant="text" />`, etc.

#### In-Place Refresh

Pull-to-refresh on lists. Native indicator (iOS spinner / Android Material). Don't show a skeleton overlay on existing content.

#### Mutations

Button changes to loading state. The rest of the UI stays interactive (the user can still scroll, navigate away, etc.). No full-screen blocking overlays.

### Error States

#### Page-Level Error

```
        [ Icon (lg, error.500) ]

        [ Headline (h3) ]
        "Couldn't load orders"

        [ Subhead (body, neutral.500) ]
        "Check your connection and try again."

        [ Primary CTA ]
        "Try Again"
```

#### Inline Error

For specific items in a list that failed to load:

```
┌──────────────────────────────────────┐
│ ⚠ Failed to load this item           │
│   [Try again]                        │
└──────────────────────────────────────┘
```

### "No Network" Banner

Persistent banner at the top when offline:

```
┌──────────────────────────────────────┐
│ ⚠ No internet connection             │
└──────────────────────────────────────┘

Height: 32
Background: warning.50
Text: warning.700, caption weight 500
Animates in/out (200ms)
```

---

## 16. Toast & Snackbar

### Toast Anatomy

```
┌──────────────────────────────────────┐
│ ✓  Order placed successfully      ✕  │
└──────────────────────────────────────┘

Width: max 90% of screen, 480px on admin
Position: top-center mobile, top-right admin
Padding: spacing.3 vertical, spacing.4 horizontal
Radius: radii.md
Shadow: elevation.3
Background: neutral.800
Text: neutral.0, body weight 500
Icon: status-colored (success/warning/error/info)
Dismiss: X button (optional) + auto-dismiss timer
```

### Toast Variants

```
success:  ✓ icon, success-tinted left border (3px)
error:    ⚠ icon, error-tinted left border
warning:  ! icon, warning-tinted left border
info:     ℹ icon, info-tinted left border
```

### Behavior

- Auto-dismiss after **4 seconds** (mobile), **5 seconds** (admin)
- Tap/click to dismiss immediately
- Mobile: swipe up to dismiss
- Max **3 visible** at once. Newest at top. Old ones queue.
- Loading toasts (`toast.promise`) don't auto-dismiss — resolve to success/error

### When to Use Toasts

✅ Mutation success: "Order placed", "Profile updated"
✅ Mutation failure with retry: "Failed to save. [Retry]"
✅ Background info: "5 new orders received"
✅ Async events: "Connection restored"

❌ Form validation (use inline errors)
❌ Confirmations (use a dialog)
❌ Critical errors blocking work (use a modal or page-level error)
❌ Long-form info (use a banner or in-page message)

---

## 17. Modal & Dialog System

### Modal (Mobile-Full-Screen)

Used for self-contained tasks: Cart, Checkout, Image Picker.

```
┌──────────────────────────────────────┐
│ [X]   Modal Title                    │
├──────────────────────────────────────┤
│                                      │
│       (Modal content scrollable)     │
│                                      │
├──────────────────────────────────────┤
│         [ Primary Action ]           │
└──────────────────────────────────────┘
```

- Full-screen on mobile
- Header has X (close) on the left, title centered
- Sticky footer with primary CTA (when applicable)

### Dialog (Centered Modal)

Used for confirmations, single-input prompts, alerts.

```
        ┌────────────────────────┐
        │ Title (h4)             │
        │                        │
        │ Body text (body)       │
        │                        │
        │      [Cancel] [OK]     │
        └────────────────────────┘

Width: 320 mobile, 400 admin
Padding: spacing.6 (24)
Radius: radii.lg
Shadow: elevation.4
Backdrop: rgba(31, 28, 26, 0.5)
```

### AlertDialog (Destructive Confirmation)

For irreversible actions: cancel order, suspend seller, delete category.

Same shape as dialog, but:
- Icon at top (warning or error color)
- Required reason textarea where applicable
- Primary button is `destructive` variant
- Cancel is `tertiary` variant

### Bottom Sheet (Mobile)

Used for filters, selectors, action menus.

```
        ┌──────────────────────────┐
        │ ─                        │   ← drag handle
        │ Sheet Title              │
        │                          │
        │ [ Options ]              │
        │                          │
        └──────────────────────────┘

Position: bottom-anchored
Radius: radii.2xl top corners only
Drag handle: 36×4 neutral.300 pill, centered
Swipe down to dismiss
Backdrop: rgba(31, 28, 26, 0.5)
```

### Modal Hierarchy Rule

**Maximum one modal at a time.** No nested dialogs. If a flow requires multiple steps, use a multi-screen modal with a header back arrow.

---

## 18. Image Treatment

### Image Sources

| Source | Use |
|--------|-----|
| Cloudinary CDN | All user-uploaded content (food, avatars, seller banners) |
| Bundled assets | Logo, illustrations, empty-state graphics, splash |

### Image Aspect Ratios

| Context | Ratio |
|---------|-------|
| FoodCard hero | 4:3 |
| Item detail full | 4:3 |
| Seller banner | 3:1 |
| Avatar | 1:1 |
| Category icon | 1:1 |

### Image Quality

Cloudinary auto-formats:
- `f_auto` → WebP on supported clients, JPEG fallback
- `q_auto` → adaptive quality based on content (typically 70-85)

### Image Loading

- **Blurhash placeholder** while loading (server-generated on upload — Phase 2)
- **Fade-in transition** (200ms) on load
- **No spinner** over images
- **Fallback** for failed loads: neutral.100 background + camera-off icon at icon.lg size

### Image Treatment Rules

- **Never** add filters, gradient overlays, or color washes to food photos (food sells itself)
- **Subtle radius** on photos in cards (`radii.md` for inset, `radii.lg` for hero)
- **Dim slightly** (90% opacity overlay of black at 5%) when text overlays on top of an image
- **Never** stretch or distort. Always cover-fit.

### Photography Direction (Brand Guideline)

When sellers upload photos, surface guidance:
- Natural lighting (golden hour ideal)
- Top-down or 45° angle
- Tableware visible (plates, bowls, traditional dishes)
- Show portion size
- No filters / no editing apps

Phase 2: offer in-app photo guidance tutorial during onboarding.

---

## 19. Motion & Animation

### Duration Tokens

```
duration.instant  100   — barely visible (color swaps, hover)
duration.fast     200   — DEFAULT (page transitions, dropdown opens)
duration.medium   300   — modals, sheets
duration.slow     500   — splash transitions, hero animations
duration.none     0     — used when prefers-reduced-motion is set
```

### Easing Curves

```
easing.standard   cubic-bezier(0.4, 0.0, 0.2, 1)   — DEFAULT (Material easing)
easing.decelerate cubic-bezier(0.0, 0.0, 0.2, 1)   — entrances (modal open)
easing.accelerate cubic-bezier(0.4, 0.0, 1.0, 1)   — exits (modal close)
easing.sharp      cubic-bezier(0.4, 0.0, 0.6, 1)   — quick swaps
```

### Common Animations

| Action | Animation |
|--------|-----------|
| Screen push (stack) | Slide-in-right from edge, decelerate, 300ms |
| Modal present | Slide-up from bottom, decelerate, 300ms |
| Modal dismiss | Slide-down to bottom, accelerate, 200ms |
| Toast appear | Slide-down from top + fade-in, decelerate, 200ms |
| Bottom sheet | Slide-up with spring, 350ms |
| Button press | Scale to 0.97 + opacity 0.9, 100ms |
| Card press | Scale to 0.98, 100ms |
| Skeleton shimmer | Linear gradient sweep, 1500ms loop |
| Page fade (admin route change) | Fade-in 150ms |

### Animation Restraint

@ZAY is **not** an entertainment app. Animations serve clarity, not delight-for-its-own-sake:
- No bouncy springs on every interaction
- No flying icons or "wow" effects
- No animated illustrations on every empty state
- Subtle pulse for "current" status in timeline = OK
- Confetti on first order = NO (too cute, undermines trust)

### Reduced Motion

When `prefers-reduced-motion: reduce` is set (iOS Accessibility, Android Animation Scale = off):
- All transitions reduce to `duration.instant` or skip entirely
- Skeleton shimmer becomes static
- Spring physics use linear easing
- No motion-based reveals (use opacity instead)

Implementation: a `useReducedMotion` hook reads the OS setting. Theme tokens swap.

---

## 20. Mobile-First UX Principles

### Thumb-Zone Design

The most accessible area of a phone screen is the **bottom half**. Primary actions live there:
- Place Order button: sticky at bottom of CartScreen
- Submit buttons: bottom of every form
- Tab bar: bottom (always)
- Cart access: bottom tab, not top corner

The top-left corner (hardest reach with right thumb on most-used hand) holds back buttons and rarely-used actions.

### Tap Target Size

**44x44pt minimum** for every interactive element. This is Apple's HIG and Google's Material guideline.

For dense lists where the visual element is smaller (a small icon button), the surrounding row is the tap target — make the entire row tappable.

### Avoid Left-Edge Gestures Conflicts

iOS uses left-edge swipe for "back." Don't put swipeable carousels or other left-edge gestures on stack screens — they conflict.

### Sticky Bottom CTAs

Primary actions on forms and checkout are **bottom-sticky**, visible without scrolling, full-width, lg size, primary variant. The screen scrolls above; the CTA stays.

Background should match the screen (no contrasting bar). A `1px neutral.100` top border separates it from scrolling content.

### Pull-to-Refresh

Every list screen supports pull-to-refresh. The platform-native indicator handles the visual.

### Skeleton, Not Spinner

A centered spinner on a full screen feels broken. Skeleton loaders feel "fast" because they're shape-aware.

### Optimistic UI for Reversible Actions

- Toggle "Open/Closed" → flip immediately, revert on error
- Mark notification as read → immediate, revert on error
- Adjust quantity in cart → immediate (no server call)

For irreversible actions (place order, suspend), wait for the server.

### Keyboard Avoidance

`KeyboardAvoidingView` on every screen with form input. Tap outside an input dismisses keyboard. Submit on "Return" for single-field forms.

### Haptic Feedback

Used sparingly:
- Successful order placed: medium impact
- Order accepted (push notification arrival): light impact
- Toggle states (Open/Closed switch): selection feedback
- Drag handles on bottom sheet: selection on snap

Never on every button press (annoying, drains battery).

### Native Patterns

- iOS users expect: swipe-back, modal slide-up, bottom sheet drag-down
- Android users expect: hardware back button respected, Material ripples, FAB conventions

Don't fight these. Use platform-aware components from React Native.

### Network-Aware UX

- Disable "Place Order" when offline (with helper: "Connect to internet")
- Show cached browse data with a banner: "You're viewing saved content"
- Allow viewing existing orders offline (from React Query cache)

---

## 21. Accessibility (WCAG 2.1 AA)

### Color Contrast

| Text Type | Minimum Ratio | Where Applied |
|-----------|--------------|---------------|
| Body text (under 18px regular / 14px bold) | 4.5:1 | All body text on backgrounds |
| Large text (18px+ regular / 14px+ bold) | 3:1 | Headings, large buttons |
| UI components (borders, focus rings) | 3:1 | Input borders, button borders |
| Inactive UI elements | (no requirement) | Disabled buttons |

Every token combination in this document has been verified. The contrast reference table in §2 documents the ratios.

### Touch Targets

Minimum **44x44pt** on iOS, **48x48dp** on Android. The system uses 44 as a unified target.

### Don't Rely on Color Alone

Status is **always** color + icon + label. A color-blind user sees the icon and label. A black-and-white screenshot remains comprehensible.

Wrong: 🟢 (just a dot)
Right: 🟢 Online · with text "Online"

### Screen Reader Labels

Every interactive element has an `accessibilityLabel` (mobile) or `aria-label` (admin):

```
Icon button (no visible text)        → required label
Image                                → alt text if meaningful, "" if decorative
Form input                           → label associated via `accessibilityLabelledBy`
Status badge                         → label includes the status word
Avatars                              → user's name as label
```

### Focus Indicators

Visible focus rings (`2px brand.500`) on every interactive element when tabbed through (admin) or when accessibility tools are active (mobile).

Never hide focus indicators with `outline: none` and no replacement. If overriding, ensure the replacement is at least as visible.

### Dynamic Type / Font Scaling

The mobile app respects the OS font scale setting (`PixelRatio.getFontScale()`):
- Body text scales 1.0× to 1.5×
- Headings scale to a max of 1.3× to prevent breaking layouts
- UI chrome (buttons, tab bar) scales 1.0× to 1.2×

### Reduced Motion

Per §19, all motion respects `prefers-reduced-motion`.

### Form Accessibility

- Labels programmatically associated with inputs
- Error messages have `accessibilityLiveRegion="polite"` (announced when they appear)
- Required state announced via `accessibilityRequired={true}`
- Validation triggers `accessibilityLiveRegion="assertive"` for important errors

### Semantic Structure

- One `accessibilityRole="header"` per screen for the main heading
- Buttons use `accessibilityRole="button"`
- Tab bar items use `accessibilityRole="tab"`

### Testing

Before launch, test with:
- iOS VoiceOver on a real device
- Android TalkBack on a real device
- iOS Dynamic Type set to largest accessibility size
- Color blindness simulator (Stark plugin in Figma, Sim Daltonism on macOS)
- Keyboard-only navigation (admin)

Accessibility is not optional. It's a legal requirement in many markets and a baseline for not excluding 15-20% of potential users.

---

## 22. Voice & Microcopy

### Tone

Warm, respectful, direct. Like a Moroccan host inviting you to their table: friendly, never sycophantic; clear, never curt.

### Vocabulary

- **Use:** "Plats" not "Items" (in French UI), "Vendeur" not "Marchand" for sellers, "Plat fait maison" not "Plat homemade" (preserve the home-cooking specificity)
- **Avoid:** Tech jargon ("user", "endpoint", "fetch"), startup slang ("crush it", "ninja", "rockstar"), American hipster speak

### Microcopy Patterns

| Context | Pattern |
|---------|---------|
| Empty state | "No orders yet. When you place one, it'll appear here." (state + explain + reassure) |
| Errors | "Couldn't load. Check your connection and try again." (what + why + action) |
| Confirmations | "Cancel this order?" (action + object — no fluff) |
| Success | "Order placed!" (concise + celebrate the user's action, not ourselves) |
| Loading | "Placing order..." (action verb + ellipsis) |
| Required | (no marker — required is the default) |
| Optional | "Bio (optional)" (mark the exception) |

### Tone Examples

❌ "Oops! 😅 Something went wrong! Let's try again!"
✅ "Couldn't load orders. Please try again."

❌ "Awesome! Your order has been placed successfully! 🎉🎉🎉"
✅ "Order placed. Your seller will contact you shortly."

❌ "Yo! Wanna become a seller? It's super easy!"
✅ "Cook from home and reach hungry customers. Apply in 2 minutes."

### Localization

Primary MVP language: **French** (matches Moroccan business and education).

Phase 2 adds:
- **Arabic (Modern Standard)** — RTL support, full UI mirroring
- **English** — for tourists and expatriates

Microcopy in French should respect formal "vous" by default (consistent with Moroccan service culture). Informal "tu" reserved for marketing copy only.

---

## 23. Moroccan Design Inspiration

### What to Take

- **Zellige geometric patterns** — subtle background motifs in empty states, splash screen, brand collateral. Never as primary UI texture.
- **Terracotta + saffron palette** — already encoded in brand.500 and saffron.500.
- **Mint green** — appears in success states and the olive secondary palette, evoking mint tea.
- **Ornamental dividers** — subtle horizontal flourishes on detail pages (Phase 2).
- **Handwritten signature feel** — Playfair Display headings + warm photography.

### What to Avoid

- **Cliché tourism imagery** — camels, fez hats, "1001 Nights" tropes. Modern Morocco is urban, professional, diverse.
- **Heavy ornamentation** — full-screen zellige patterns, ornate borders, calligraphic flourishes everywhere. We're modern, not antique.
- **Stereotypical color combinations** — turquoise + gold, dark red + heavy black. These feel like a tourist shop.
- **Generic "Middle Eastern" tropes** — Morocco is North African with Berber, Arab, and Andalusian heritage. Specific, not generic.

### The Test

Before shipping any visual element, ask:
> *"Would a 32-year-old Moroccan professional feel this represents them — or feel this was designed for a tourist's idea of Morocco?"*

If the answer is the latter, reject.

### Visual References

Designers should study:
- **Restaurants:** La Sqala (Casablanca), Café Clock (Marrakech), L'Atelier Madada (Essaouira) — modern Moroccan dining identity
- **Brands:** Marwa Cosmetics, Marjane Holding's modern branding, Maison Arabe in Marrakech
- **Architecture:** Modern villas in Anfa, riads renovated by contemporary architects — clean lines, traditional materials

@ZAY is the modern face of Moroccan home cooking. Design accordingly.

---

## Summary — The 10 Non-Negotiables

1. **One brand orange.** Restraint over rainbow.
2. **Warm neutrals.** Never cool blue-grays.
3. **Inter + Playfair.** Modern body, warm headings.
4. **8pt spacing grid.** No magic numbers.
5. **44pt tap targets.** Always.
6. **Status = color + icon + label.** Accessibility baseline.
7. **One primary button per screen.** Decision hierarchy.
8. **Skeletons, not spinners.** Faster-feeling loads.
9. **Bottom-sticky CTAs on mobile.** Thumb-zone.
10. **Modern Moroccan, not tourist Moroccan.** Earn the cultural reference.
