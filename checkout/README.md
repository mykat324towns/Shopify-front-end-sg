# Scent Gallery — Checkout (Shopify Plus)

Checkout Extensibility for the Scent Gallery Plus store. Two artifacts:

1. **Branding** — design tokens applied to the checkout via the Admin GraphQL API (`checkoutBrandingUpsert`). Matches the storefront token system 1:1.
2. **UI Extensions** — three blocks that render inside the checkout flow + thank-you page.

This folder is **not** part of the Shopify theme repo (`Shopify-front-end-sg`). Per the deploy rules in the parent `CLAUDE.md`, the theme repo accepts only the seven standard Shopify theme folders. Checkout extensibility code lives separately and deploys via `shopify app deploy`.

If we want this version-controlled on GitHub, create a sibling repo like `Shopify-checkout-sg` and push this folder there.

---

## Layout

```
checkout/
├── shopify.app.toml             # app metadata for the Shopify CLI
├── package.json                 # npm workspace root
├── branding/
│   ├── branding-spec.json       # CheckoutBrandingInput payload
│   ├── apply-branding.mjs       # one-shot script to upsert the branding
│   └── list-profiles.mjs        # helper to find the published checkout profile id
└── extensions/
    ├── sg-trust-block/          # free shipping progress + returns + authenticity
    ├── sg-collector-proof/      # rotating review quote near the email field
    └── sg-thank-you-collection/ # post-purchase upsell on the thank-you page
```

---

## Design decisions (and the principle behind each)

| Choice | Why |
|---|---|
| Trust block sits **above the payment section** (`payment-method-list.render-before`) | Baymard: 17% of cart abandonment is "didn't trust site with credit card." Trust signal lands at the moment of payment commitment, not buried below the fold. |
| Three trust items, no badge wall | `.impeccable.md` rule: earn trust through restraint. A badge wall reads as defensive. |
| Free shipping line uses **goal-gradient** ("$X away from free shipping") | Goal Gradient — Hull. People accelerate as they perceive proximity to a reward. Pulls cart subtotal up. |
| Collector proof = real review quote, not "X people bought this" | Cialdini Social Proof + objection-mining. *"At first I thought X, but Y"* in the buyer's voice pre-bunks the objection harder than a counter. Counters also feel TikTok-shop — banned in `.impeccable.md`. |
| Quote rotation is **gentle (7s default)**, fades only by content swap | Brand voice = Discerning · Assured · Intimate. Fast carousels feel cheap. |
| Thank-you upsell framing = "Build the collection" | Endowment Effect + Identity (Cialdini Unity). Frames the buyer as a collector, not a one-and-done. Highest-margin slot in the funnel — CAC is already paid. |
| Discount code on the upsell, not a price drop | Reciprocity ("collectors only" — felt as a gift, not a sale tag). Keeps the catalog price clean. |
| No countdown timers, no "selling fast" copy | `.impeccable.md` anti-reference: not a TikTok shop. The /cro skill's urgency-leaning is reserved for honest signals (real low stock, real drop windows) — not the checkout. |
| Express checkout (Shop Pay / Apple Pay / Google Pay) is enabled in admin, not duplicated as a custom block | The native express row already runs at the top of checkout — duplicating it would double-stack and look amateur. |

---

## Apply the branding

### Prereqs

1. A custom app installed on `scent-gallery-5.myshopify.com` with the **`write_checkout_branding_settings`** scope (and `read_checkout_branding_settings`).
2. The Admin API access token from that app.
3. Node 20+ installed locally.

### Run

```bash
cd checkout
export SHOPIFY_SHOP=scent-gallery-5.myshopify.com
export SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxxxxxxxxx

# (optional) inspect available checkout profiles first
node branding/list-profiles.mjs

# apply tokens to the published profile
node branding/apply-branding.mjs
```

The script auto-targets the published profile. To target a draft profile instead, pass `SHOPIFY_CHECKOUT_PROFILE_ID=gid://shopify/CheckoutProfile/...` as an env var.

### What this changes

- Color schemes (main canvas + order summary) → matches `tokens.css`
- Primary button → `#1C4032`, hover `#163529`, 7px radius
- Inputs → outlined, 7px radius, floating-inside labels
- Headings → Bodoni Moda
- Body / inputs → Figtree
- Heading sizes scale at ratio 1.2 from a 14pt base
- Express checkout button radius = 7px so it stops looking like an alien graft

---

## Deploy the UI extensions

### First-time setup

```bash
cd checkout
npm install
npx shopify app dev
```

The CLI will:
1. Prompt to create or link a Shopify Partners app.
2. Write the resulting `client_id` into `shopify.app.toml`.
3. Open a tunnel and a preview URL on `scent-gallery-dev-pcd2ksja` (or whichever dev store you pick).

Test all three extensions on the dev store before promoting.

### Deploy to production

```bash
cd checkout
npx shopify app deploy
```

After deploy, in the **production** Shopify admin:

1. **Settings → Checkout → Customize** (the published profile).
2. The two static-target extensions (`sg-trust-block`, `sg-collector-proof`) appear automatically — no placement step needed.
3. Drag `sg-thank-you-collection` into the thank-you page where you want it (top-of-page recommended).
4. Configure each extension's settings:
   - `sg-trust-block` → `free_shipping_threshold = 50`, `returns_window_days = 30`
   - `sg-collector-proof` → `rotation_seconds = 7`
   - `sg-thank-you-collection` → set `recommended_variant_id` to the 5ml variant of your current hero upsell SKU; `discount_code = COLLECTOR20`
5. **Create the discount** (`COLLECTOR20`, 20% off, single-use per customer, eligible only on the upsell SKU) under Discounts → Create discount.
6. Publish the checkout profile.

---

## Pre-launch checklist (admin-side, not code)

- [ ] Customer accounts: **optional at checkout**
- [ ] Order notes field: **off**
- [ ] Express checkout buttons: Shop Pay, Apple Pay, Google Pay all enabled
- [ ] BNPL: Shop Pay Installments + Klarna + Afterpay all enabled (ICP defaults to BNPL)
- [ ] Address autofill: enabled
- [ ] Phone number: optional, not required
- [ ] Shipping rates display on cart, not first-revealed at checkout (Baymard #3 abandonment cause)
- [ ] Logo uploaded in `Settings → Checkout → Branding` (the dark wordmark from `brand-assets/logos/`)

---

## Known limitation: true one-click upsell

`purchase.thank-you.block.render` recommendations send the customer to a new cart with the discount pre-applied. That's a one-tap flow — not a true zero-tap "charge the same card again" upsell.

For zero-tap on Plus, two options:
1. **AfterSell / ReConvert** — Plus-compatible apps that handle the post-purchase page natively. Cheapest path. Recommended.
2. **Custom `Checkout::PostPurchase::Render` extension** — legacy post-purchase API; build effort is non-trivial.

The block in this folder is the foundation either way — same copy, same offer logic, same tokens.

---

## Validation plan (when traffic lands)

| Hypothesis | Watch in Clarity / Shopify | Decision rule |
|---|---|---|
| Trust block above payment lifts checkout completion | `Checkout completion rate` segment vs. control week | Hold if +1.5pp or more sustained 7 days |
| Free-shipping progress raises AOV | `AOV` for orders below threshold pre/post | Hold if AOV +$2 sustained |
| Collector proof reduces email-field abandonment | Clarity rage clicks + dead clicks on contact step | Hold if rage clicks down ≥20% |
| Thank-you upsell adds incremental AOV | Post-purchase add-to-cart click rate, attached order rate | Hold if attach rate ≥6% |

Pre-launch, these ship without A/B because the surface is empty (no baseline to protect). After 7 days of live traffic, decide what to keep.

---

## Decision-log entry (proposed — copy into `decisions/log.md` when shipped)

```
[2026-04-27] DECISION: Built Plus checkout extensibility — branding tokens + 3 UI extensions (trust block above payment, rotating review quote near contact, post-purchase "Build the collection" upsell). | REASONING: Plus unlocks full checkout customization; storefront brand was being broken at the highest-friction step in the funnel (Baymard: trust + clarity at checkout = 30%+ of abandonment). Three placements were chosen for highest-leverage moments per Baymard + Cialdini (proof early, trust at point of payment, identity-frame upsell on thank-you). | CONTEXT: Code lives in `checkout/` (workspace, not theme repo). Branding applied via Admin API. Extensions deploy via `shopify app deploy`. Pre-launch ship — no A/B; review against Clarity at +7 days.
```
