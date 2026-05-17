# @ZAY — Product Vision & MVP Scope

---

## Table of Contents

- [Mission Statement](#mission-statement)
- [Product Vision](#product-vision)
- [Target Audience](#target-audience)
- [Value Proposition](#value-proposition)
- [MVP Scope](#mvp-scope)
- [Out of MVP Scope](#out-of-mvp-scope)
- [SWOT Analysis](#swot-analysis)
- [Competitive Analysis](#competitive-analysis)
- [Moroccan Market Strategy](#moroccan-market-strategy)
- [Monetization Ideas](#monetization-ideas)
- [Startup Scaling Recommendations](#startup-scaling-recommendations)
- [Future Roadmap](#future-roadmap)

---

## Mission Statement

> **Empowering Moroccan women to turn their kitchen into a business, while giving every customer access to healthy, authentic homemade meals.**

@ZAY exists at the intersection of social impact and technology. We believe food is culture, and culture should be shared — fairly, digitally, and with dignity.

---

## Product Vision

@ZAY is a two-sided marketplace connecting:

- **Home Cooks (Sellers):** Predominantly Moroccan women who cook traditional and healthy meals at home and want to monetize their skills without formal business overhead.
- **Customers (Buyers):** Urban professionals, students, families, and health-conscious individuals who want authentic home-cooked food delivered to their door.

The platform acts as the trusted intermediary: it onboards and verifies sellers, provides the ordering and delivery coordination infrastructure, and ensures quality through content moderation and admin oversight.

In Phase 1 (MVP), the platform operates in a single city (e.g., Casablanca or Rabat) with cash-on-delivery only. The architecture is designed to scale to multiple cities and payment methods without structural change.

---

## Target Audience

### Primary Customer Personas

**Persona 1 — The Busy Professional**
- Age: 25–40
- Location: Urban Morocco (Casablanca, Rabat, Marrakech)
- Pain: Long work hours, no time to cook, tired of fast food
- Need: Nutritious, ready meals that feel like home
- Device: Smartphone (Android dominant in Morocco)

**Persona 2 — The Health-Conscious Student**
- Age: 18–26
- Location: University districts
- Pain: Cafeteria food is poor quality, home is far
- Need: Affordable healthy meals
- Device: Smartphone

**Persona 3 — The Nostalgic Expat / Remote Worker**
- Age: 28–45
- Pain: Misses authentic Moroccan home cooking
- Need: Real tagine, couscous, harira — not restaurant versions

### Primary Seller Personas

**Persona A — The Skilled Home Cook**
- Profile: Moroccan woman, 30–55, stays at home or part-time work
- Has: Cooking talent, time, kitchen
- Needs: Simple app, income, dignity
- Barrier: Low digital literacy → app must be extremely simple

**Persona B — The Micro-Entrepreneur**
- Profile: Woman with existing informal food business (selling to neighbors)
- Has: Small customer base, ambition to grow
- Needs: Platform legitimacy, wider reach, order management

---

## Value Proposition

### For Customers

| Feature | @ZAY | Glovo / Uber Eats |
|---------|------|------------------|
| Homemade food | ✅ Core offering | ❌ Restaurant only |
| Authentic Moroccan meals | ✅ | ❌ (standardized) |
| Healthy, no additives | ✅ | ❌ |
| Personal cook relationship | ✅ | ❌ |
| Community trust | ✅ Verified sellers | ❌ |
| Affordable pricing | ✅ Home cook margins | ❌ Restaurant premium |

### For Sellers

| Feature | @ZAY | No Platform |
|---------|------|----|
| Digital storefront | ✅ | ❌ WhatsApp only |
| Order management | ✅ | ❌ Manual |
| Customer reach | ✅ City-wide | ❌ Neighborhood only |
| Income tracking | ✅ | ❌ |
| Zero technical overhead | ✅ Simple app | ❌ |

---

## MVP Scope

The MVP is scoped to deliver the minimum feature set that:
1. Proves the market hypothesis (people will order homemade food)
2. Enables real seller onboarding
3. Supports end-to-end order flow without online payment complexity
4. Allows admin oversight and quality control

### In Scope — MVP

#### Client App
- [x] User registration and login (JWT)
- [x] Browse menu by category
- [x] Food detail page (image, description, price, prep time)
- [x] Search food items
- [x] Cart management
- [x] Place order with delivery address
- [x] Cash-on-delivery only
- [x] Order history
- [x] Order status tracking (6 statuses)
- [x] Push notifications (FCM)
- [x] Profile management

#### Seller App (same React Native app, seller role)
- [x] Seller registration (pending approval flow)
- [x] Login / Logout
- [x] Add / edit / delete food menu items
- [x] Upload food images
- [x] Toggle item availability
- [x] View incoming orders
- [x] Accept / Reject orders
- [x] Update order status
- [x] Kitchen profile

#### Admin Dashboard (React.js web)
- [x] Admin login (secure)
- [x] Approve / reject / suspend sellers
- [x] View all users
- [x] View all orders
- [x] Content moderation (verify menus and images)
- [x] Basic analytics (total users, orders, revenue estimate)

---

## Out of MVP Scope

These features are architecturally planned but **not built in MVP**. They are documented here to ensure the MVP design does not block future implementation.

| Feature | Phase |
|---------|-------|
| Online payment (CMI, Stripe, PayPal) | Phase 2 |
| AI meal recommendations | Phase 3 |
| Real-time GPS delivery tracking | Phase 2 |
| Customer loyalty points system | Phase 2 |
| Coupon / promo code system | Phase 2 |
| In-app customer–seller messaging | Phase 2 |
| Customer ratings and reviews | Phase 2 |
| Workshop booking (cooking classes) | Phase 3 |
| Multi-language support (Arabic, French, English) | Phase 2 |
| Advanced analytics dashboard | Phase 2 |
| Live delivery map | Phase 2 |
| Subscription meal plans | Phase 3 |
| Third-party delivery integration | Phase 2 |

---

## SWOT Analysis

### Strengths

| Strength | Detail |
|----------|--------|
| Strong social mission | Women empowerment is a powerful narrative for press, investors, and NGO partnerships |
| Unique market position | No direct competitor in the homemade food niche in Morocco |
| Low barrier to seller onboarding | Women don't need a restaurant license to start |
| High food quality differentiation | Homemade > fast food for health-conscious customers |
| Cultural product-market fit | Moroccan home cooking is deeply valued culturally |
| Low initial CAC | Word of mouth among family networks of home cooks |

### Weaknesses

| Weakness | Detail |
|----------|--------|
| Delivery not owned | MVP relies on sellers arranging their own delivery or cash pickup |
| Trust & safety | Customers need to trust an unknown home cook |
| Digital literacy gap | Many target sellers have low smartphone literacy |
| No payment infrastructure | Cash-only in MVP limits scaling |
| Inconsistent food quality | No standardized production environment |
| Limited initial supply | Need critical mass of sellers before launch |

### Opportunities

| Opportunity | Detail |
|-------------|--------|
| Massive underserved market | Millions of Moroccan women cook professionally at home informally |
| Health food trend | Growing demand for healthy eating in Moroccan urban centers |
| NGO / Government partnerships | Social impact makes @ZAY eligible for grants and subsidies |
| MENA expansion | Same model works in Algeria, Tunisia, Egypt, Gulf |
| Influencer marketing | Food content on Instagram/TikTok is massive in Morocco |
| B2B office meal delivery | Corporate lunch market is large in Casablanca |

### Threats

| Threat | Detail |
|--------|--------|
| Glovo market entry | If Glovo launches homemade-food verticals |
| Regulatory risk | Food safety laws could require seller certification |
| Copycat risk | Easy to copy concept once validated |
| Delivery logistics | Not owning delivery makes reliability hard |
| Trust incidents | One food safety incident could damage brand severely |
| Low tech adoption | If target sellers resist smartphone apps |

---

## Competitive Analysis

### Glovo Morocco

| Dimension | Glovo | @ZAY |
|-----------|-------|------|
| Food type | Restaurant / fast food | Homemade meals |
| Seller type | Registered restaurants | Home cooks |
| Pricing | Premium (delivery fees) | Affordable |
| Health | Low (fast food) | High |
| Cultural authenticity | Low | High |
| Social impact | None | Core mission |
| Delivery | Owned gig fleet | Seller-managed (MVP) |
| Tech maturity | Mature | MVP |
| Competitive position | Different segment | Non-overlapping |

**Verdict:** Glovo is not a direct competitor in MVP. They could become one if they launch a home cook vertical. @ZAY should move fast to build seller loyalty before that risk materializes.

### Uber Eats Morocco

| Dimension | Uber Eats | @ZAY |
|-----------|-----------|------|
| Presence | Major Moroccan cities | Initially single city |
| Food type | Restaurants only | Homemade only |
| Market segment | Higher income | Mass market |
| Social positioning | None | Women empowerment |
| Competitive overlap | Minimal | — |

**Verdict:** Uber Eats targets restaurant food for smartphone users. @ZAY targets a completely different supply side. Threat is low for MVP.

### Kooul (Morocco)

| Dimension | Kooul | @ZAY |
|-----------|-------|------|
| Model | Local restaurant delivery | Homemade food marketplace |
| Scale | Limited | Starting |
| Differentiation | Geographic | Product type |
| Seller base | Restaurants | Home cooks |
| Social impact | None | Core |

**Verdict:** Kooul is the closest local competitor. However, their seller base is restaurants, not home cooks. @ZAY's supply side is entirely different. Risk is low but worth watching.

### Summary Positioning Map

```
           HIGH QUALITY / HOMEMADE
                    ↑
                  @ZAY
                    |
LOW TECH ←——————————|————————————→ HIGH TECH
                    |
         Kooul ————————— Glovo / Uber Eats
                    ↓
          RESTAURANT / FAST FOOD
```

---

## Moroccan Market Strategy

### Phase 1 Launch City: Casablanca

**Why Casablanca:**
- Largest city (4M+ population)
- High concentration of working professionals
- Strongest smartphone penetration
- Large pool of potential home cook sellers
- Media and investor presence

**Go-to-Market Strategy:**

1. **Seller-first launch:** Recruit 20–50 verified home cook sellers before launch. Quality over quantity. Use neighborhood women's associations (جمعيات نسائية) as recruitment channels.

2. **Hyperlocal marketing:** Start with 2–3 neighborhoods. Prove the model before expanding city-wide. Casablanca neighborhoods like Maârif, Hay Riad, Ain Diab are high-potential.

3. **Social media:** Instagram and TikTok content showing the sellers' stories (authentic, emotional, human-interest content drives massive organic reach in Morocco).

4. **Influencer partnerships:** Partner with Moroccan food influencers and lifestyle creators for product launches.

5. **B2C word of mouth:** Give sellers a referral incentive. A home cook will tell her family, neighbors, colleagues — micro-network effects.

6. **Press angle:** Pitch to Moroccan press on the women empowerment story (TelQuel, L'Economiste, Médias24).

### Language Strategy

- App UI: French + Arabic (Darija informally in marketing)
- Marketing content: Darija for maximum authenticity
- Technical documentation: English (developer standard)

### Payment Constraints

- Morocco has low credit card penetration
- Cash on delivery (COD) is the dominant e-commerce payment method
- Phase 2 will integrate CMI (Centre Monétique Interbancaire — Moroccan card payment gateway) and mobile payment options

---

## Monetization Ideas

### Phase 1 (MVP) — No direct monetization

Goal is traction, not revenue. Focus on proving the model.

### Phase 2 — Commission Model

- Take a **15–20% commission** on each order processed through the platform
- Standard marketplace model, easy to understand for sellers
- Implementation requires online payment integration

### Phase 3 — Multiple Revenue Streams

| Stream | Description | Timeline |
|--------|-------------|----------|
| Order commission | 15–20% per order | Phase 2 |
| Seller subscription | Monthly fee for premium features (analytics, priority placement) | Phase 3 |
| Promoted listings | Sellers pay for featured placement | Phase 3 |
| Corporate meal plans | B2B subscription for office deliveries | Phase 3 |
| Cooking class bookings | Home cooks teach classes, @ZAY takes cut | Phase 3 |
| White-label licensing | License platform to MENA operators | Phase 4 |

---

## Startup Scaling Recommendations

### Technical Scaling Path

```
MVP (Monolith)
    ↓ (when traffic > 10k req/day)
Modular Monolith (extracted services in same repo)
    ↓ (when team > 5 engineers)
Microservices (order service, notification service, etc.)
    ↓ (when geographic expansion begins)
Multi-region deployment
```

The current monolithic backend is intentionally designed with clean service separation, making this migration non-destructive.

### Operational Scaling Path

1. **City-by-city rollout:** Prove Casablanca, expand to Rabat, Marrakech, Agadir
2. **Delivery ownership:** Integrate third-party delivery (Glovo Express API?) or build gig delivery fleet
3. **Seller certification:** Create @ZAY kitchen certification standard for trust
4. **Category expansion:** Breakfast boxes, weekly meal prep, catering

### Funding Path

1. **Pre-seed:** Friends, family, Moroccan angel investors. Target: 200k–500k MAD
2. **Seed:** Impact-focused VCs, social enterprise funds. Target: $200k–$500k
3. **Series A:** MENA tech VCs post-product-market-fit proof

---

## Future Roadmap

### Phase 2 — Growth Features (3–6 months post-MVP)

- Online payment (CMI gateway integration)
- Customer ratings and reviews system
- Seller analytics dashboard
- Coupon and discount system
- Third-party delivery integration
- Real-time order status (WebSocket)
- Multi-language support (Arabic, French, English)
- Customer loyalty points
- Seller performance metrics

### Phase 3 — Platform Maturity (6–12 months post-MVP)

- AI-powered meal recommendations
- Live GPS delivery tracking
- Subscription meal plans
- Workshop / cooking class booking
- Advanced admin analytics (revenue, retention, cohorts)
- Mobile app for delivery riders
- B2B corporate meal delivery vertical
- Seller mobile dashboard (standalone)

### Phase 4 — International Expansion (12–24 months)

- MENA market entry (Algeria, Tunisia, Egypt)
- Multi-currency support
- Local payment gateway integrations per country
- Arabic RTL UI support
- Country-specific compliance and food safety adapters
- Franchise / white-label model
