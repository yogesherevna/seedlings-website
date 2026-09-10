# Phase 15 — Automated Customer Order Journey

This phase adds one Playwright end-to-end journey covering the connected customer purchase lifecycle:

- customer login using the existing demo OTP flow
- customer address availability
- Microgreens → product details
- one-time purchase visibility
- subscription visibility only for subscription-eligible products with active Monthly/Quarterly plans
- product quantity `+` / `-`
- product quantity binding to an existing cart quantity
- Buy Now → Cart
- Checkout → Place Order
- My Orders one-time order
- Subscribe → real `subscriptionPlans` loaded directly by the customer web app
- subscription plan selection
- subscription creation
- initial subscription order
- My Subscriptions
- Delivery Calendar
- unified My Orders subscription entry

## Safety

The journey creates persistent order/subscription records. It is intentionally disabled unless:

```bash
E2E_ALLOW_MUTATIONS=1
```

Use a **dedicated Firebase test project and dedicated test customer**. Never run the mutating journey against production customer data.

## Run against the already-running website

```bash
cp .env.e2e.example .env.e2e.local
# edit E2E_BASE_URL and E2E_TEST_MOBILE
E2E_BASE_URL=http://localhost:3000 E2E_TEST_MOBILE=9999999999 E2E_ALLOW_MUTATIONS=1 npm run test:e2e
```

The project does not restart an already-running server by default. This follows the existing development workflow: start the website once, then run the tests against it.

To let Playwright start Next.js explicitly:

```bash
E2E_START_SERVER=1 E2E_ALLOW_MUTATIONS=1 E2E_TEST_MOBILE=9999999999 npm run test:e2e
```

## Install Playwright

The package manifest now includes `@playwright/test`. After pulling this change, run:

```bash
npm install
npx playwright install chromium
```

## Failure artifacts

On failure Playwright retains:

- screenshot
- video
- trace
- HTML report

Open the report with:

```bash
npm run test:e2e:report
```

## Important implementation note

The test intentionally verifies user-visible behavior and the existing application boundaries. It does not replace Firebase server validation. For full database assertions (for example exact `subscriptionId` linkage between the created subscription and initial order), the next extension should add a test-only Firestore verification step using a dedicated Firebase service account or Firebase Emulator Suite.
