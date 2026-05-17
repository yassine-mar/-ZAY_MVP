# @ZAY — Business Strategy, Roadmap & Scaling

---

## Table of Contents

- [Business Model Canvas](#business-model-canvas)
- [Future Roadmap](#future-roadmap)
- [Monetization Strategy](#monetization-strategy)
- [Moroccan Market Deep Dive](#moroccan-market-deep-dive)
- [Startup Scaling Framework](#startup-scaling-framework)
- [Investor-Facing Metrics to Track](#investor-facing-metrics-to-track)

---

## Business Model Canvas

| Block | Content |
|-------|---------|
| **Value Proposition** | Authentic homemade Moroccan meals for customers; digital income platform for home cooks |
| **Customer Segments** | Urban professionals (25–45), students, health-conscious families; Moroccan home cooks (sellers) |
| **Channels** | Mobile app (iOS/Android), social media (Instagram/TikTok), word of mouth, influencer partnerships |
| **Customer Relationships** | Community-driven, trust-based, personalized (know your cook) |
| **Revenue Streams** | MVP: Zero. Phase 2: 15–20% commission. Phase 3: Subscriptions, promoted listings |
| **Key Resources** | Platform (mobile + web), verified seller network, brand trust, team |
| **Key Activities** | Seller onboarding and verification, marketplace operations, content moderation |
| **Key Partners** | Home cooks (supply), delivery partners (Phase 2), NGOs (women empowerment), payment gateways |
| **Cost Structure** | Development, hosting (~$5–30/month MVP), marketing, customer support |

---

## Future Roadmap

### Phase 1 — MVP (Now → Month 3)

**Theme:** Prove the model works.

**Goals:**
- Launch in 1 city (Casablanca pilot)
- Onboard 20–50 verified sellers
- Achieve 200+ registered customers
- Process 100+ successful orders
- Zero critical bugs in production

**Success Metrics:**
- Order completion rate > 85%
- Customer return rate > 40% within 30 days
- Seller satisfaction (informal survey) > 4/5
- Average order value: 80–150 MAD

---

### Phase 2 — Growth Features (Month 3–9)

**Theme:** Remove friction. Enable scale.

**Technical:**
- Online payment (CMI gateway — Moroccan bank card payment)
- Real-time order status (WebSocket — no more polling)
- Customer ratings and reviews system
- Seller analytics dashboard (orders, revenue, top items)
- Coupon and discount code system
- Third-party delivery partner integration (Glovo Express API or local courier)
- Multi-language support (French + Arabic + Darija)
- Customer loyalty points

**Business:**
- Launch commission model (15–20% per order)
- Expand to 3–5 Casablanca neighborhoods
- Launch Rabat pilot
- Hire 1 community manager (seller relations)
- Launch referral program for both sellers and customers

---

### Phase 3 — Platform Maturity (Month 9–18)

**Theme:** Become the platform. Not just the app.

**Technical:**
- AI-powered meal recommendations (collaborative filtering)
- Live GPS delivery tracking (Mapbox/Google Maps integration)
- Subscription meal plans (weekly/monthly meal prep delivery)
- Workshop and cooking class booking system
- Dedicated seller mobile app (standalone, not role-based)
- Advanced analytics (cohort analysis, retention curves, LTV)
- B2B corporate meal delivery vertical (office lunch subscriptions)

**Business:**
- Expand to Marrakech, Agadir, Fes
- 500+ active sellers, 10,000+ registered customers
- Achieve profitability at city level
- Pitch to seed-stage investors
- Launch @ZAY Seller Certification Program (quality standard)

---

### Phase 4 — International Expansion (Month 18–36)

**Theme:** MENA region expansion.

**Technical:**
- Multi-currency support (MAD, DZD, TND, SAR, EGP)
- Local payment gateway per country
- Arabic RTL UI support
- Country-specific food safety compliance module
- Multi-tenant architecture (separate seller pools per country)

**Business:**
- Enter Algeria, Tunisia, Egypt, Gulf (UAE/Saudi Arabia)
- Partner with local women's NGOs in each country for seller recruitment
- Evaluate white-label / franchise model for markets with local operators
- Series A fundraising

---

## Monetization Strategy

### Phase 2: Commission Model (Recommended Start)

**Structure:** @ZAY takes 15–20% of each order total.

**Why commission-first:**
- Aligns incentives — @ZAY only earns when sellers earn
- Easy for sellers to understand
- Zero upfront cost for sellers (critical for adoption)
- Industry standard for marketplace platforms

**Implementation:**
- Requires online payment integration
- Platform receives full payment, remits seller share minus commission
- Weekly or bi-weekly seller payouts via bank transfer

**Projected revenue at scale:**
- Average order: 120 MAD
- 18% commission: 21.6 MAD per order
- 1,000 orders/month: 21,600 MAD/month (~$2,160/month)
- 10,000 orders/month: 216,000 MAD/month (~$21,600/month)

---

### Phase 3: Additional Revenue Streams

**Seller Subscription Tiers:**

| Tier | Price | Features |
|------|-------|----------|
| Free | 0 MAD/month | Basic listing, standard placement |
| Pro | 99 MAD/month | Analytics dashboard, priority placement, custom URL |
| Premium | 249 MAD/month | Featured homepage placement, marketing support, reduced commission |

**Promoted Listings:**
- Sellers pay for featured placement on home screen
- CPM or flat fee model
- Estimated: 50–200 MAD per week per seller

**Corporate Meal Plans:**
- Companies subscribe for daily office lunch delivery
- Fixed weekly orders = predictable revenue for sellers and platform
- B2B sales motion: target Casablanca tech companies and startups

---

## Moroccan Market Deep Dive

### Market Size (TAM/SAM/SOM)

**TAM (Total Addressable Market):**
- Morocco food delivery market: ~1.5B MAD annually (growing 20%+ YoY)
- Potentially 8–10M urbanized smartphone users in target demo

**SAM (Serviceable Addressable Market):**
- Homemade food segment: ~15–20% of food delivery market
- Target cities (Casablanca, Rabat, Marrakech): ~4M population
- SAM: ~200–300M MAD annually

**SOM (Serviceable Obtainable Market in 3 years):**
- Realistic market capture: 3–5% of SAM
- SOM: ~10–15M MAD annually (~1–1.5M USD)

### Moroccan Consumer Behavior

- **Mobile-first:** 90%+ of internet usage via smartphone
- **Android dominant:** ~75% Android vs. 25% iOS in Morocco
- **COD preference:** 70%+ of e-commerce transactions are cash on delivery
- **Price sensitive:** Average household monthly income 4,000–6,000 MAD; food budget ~20–25%
- **Social media:** TikTok and Instagram are dominant discovery platforms
- **Trust factors:** Word of mouth and family recommendations are primary purchase drivers

### Seller Supply Chain

- Target seller profile: Women aged 30–55, cooking at home
- Morocco has ~2M potential home cooks in major cities
- Currently 0 digital platforms serving this supply segment
- Informal food businesses (selling to neighbors via WhatsApp) exist everywhere — digitizing this is the opportunity

### Regulatory Landscape

- Morocco does not currently have specific regulations for home-based food businesses
- Traditional restaurant licensing (autorisation d'exercer) not required for home cooks at MVP scale
- @ZAY should add clear Terms of Service disclaimers: sellers are independent contractors, not employees
- Phase 2: Engage with Ministère de l'Agriculture et de la Pêche Maritime about home kitchen certification standards
- Food safety: Include basic guidelines for sellers (hygiene checklist) as part of onboarding

### Payment Landscape

- **CMI (Centre Monétique Interbancaire):** Moroccan card payment gateway, supports all local bank cards
- **CIH Pay, CashPlus, TargaPay:** Mobile payment options for unbanked population
- **M-Wallet (Orange Money, Inwi Money):** Mobile wallet options
- Cash on delivery remains dominant and must be supported long-term, not just as MVP

---

## Startup Scaling Framework

### The 3 Scaling Challenges

**1. Supply Scaling (Sellers)**
The hardest constraint. More customers with no sellers = broken marketplace.

Strategy:
- Invest 60% of early growth resources in seller acquisition
- Target women's cooperatives (تعاونيات) — recruit 10 sellers at once, not 1 by 1
- Seller success = platform success: invest in seller training, support, and visibility
- "Star Seller" program: surface best sellers → creates aspirational motivation for others

**2. Demand Scaling (Customers)**
Easier than supply. Food content is inherently viral.

Strategy:
- Instagram/TikTok content: show the sellers' faces, kitchens, stories
- Referral program: give discounts for bringing friends (Phase 2)
- Office meal delivery pilots: convert 1 company = 50+ regular customers

**3. Operations Scaling (Delivery)**
The delivery problem — @ZAY doesn't own delivery in MVP.

Strategy:
- MVP: Customer pickup or seller-arranged delivery (within neighborhood)
- Phase 2: Partner with a local courier service or Glovo Express
- Phase 3: Build own fleet of gig delivery riders in high-density areas

### Geographic Expansion Model

**Crawl:** 2–3 neighborhoods in Casablanca
→ **Walk:** All of Casablanca
→ **Run:** Casablanca + Rabat simultaneously
→ **Expand:** Add one city every 3 months
→ **Scale:** MENA market entry

The key discipline: **Do not expand geographically until the current market is profitable.** Unprofitable expansion kills startups.

---

## Investor-Facing Metrics to Track

Once the MVP is live, track and report these metrics to potential investors:

### North Star Metric

**Weekly Active Orders (WAO)** — the single number that captures marketplace health.

### Supporting Metrics

| Metric | Description | Target (Month 6) |
|--------|-------------|-----------------|
| GMV (Gross Merchandise Volume) | Total order value processed | 100,000 MAD/month |
| Order completion rate | Orders delivered / orders placed | > 90% |
| Customer retention (30-day) | Customers who order again within 30 days | > 45% |
| Seller retention (monthly) | Active sellers / total approved sellers | > 75% |
| Average order value (AOV) | Total GMV / total orders | 100–150 MAD |
| Seller time-to-first-order | Days from approval to first order | < 7 days |
| Customer acquisition cost (CAC) | Marketing spend / new customers | < 50 MAD |
| Net Promoter Score (NPS) | Customer satisfaction survey | > 50 |

### The Metrics That Win Investors

1. **GMV growth rate** — Month-over-month growth shows momentum
2. **Seller earnings** — Shows real impact: "Our sellers earn X MAD/month on average"
3. **Retention** — Repeat purchases prove product-market fit
4. **Unit economics** — AOV vs. cost to serve each order (path to profitability)
5. **Supply growth** — Growing seller count = growing inventory = defensibility
