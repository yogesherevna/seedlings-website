# Phase 14 — Product Detail Subscribe Flow Fix

## Changes

1. Removed the decorative green `detail-art:after` product graphic. The real product image remains the only product artwork.
2. Fixed the product-detail action row so the Add to cart / Buy now / Subscribe buttons do not stretch vertically when the subscription selector is displayed.
3. Product detail now loads subscription plans through the website's customer API instead of directly reading the admin-only `subscriptionPlans` Firestore collection from the browser.
4. The customer API accepts `productId`, validates that the salable product is active, subscription-enabled, and not a combo, then returns the active Monthly/Quarterly subscription plans.
5. The Subscribe purchase mode loads the real plan list only when selected.
6. Subscribe remains disabled until a real plan is selected.
7. Existing functional behavior is preserved: quantity, Add to cart, Buy now, sessionStorage hand-off to `/subscriptions`, and the existing subscription creation API remain in place.

## Important data-model note

The current Subscription Plan Master schema is global: a subscription plan contains name, frequency, deliveries-per-term, price, active, and description, but does not contain a product ID. Therefore the product-specific relationship is currently the product's `subscriptionPurchase` eligibility plus the global active customer plans. No fake product-plan relationship was invented.

## Verification

- `git diff --check` passes.
- `.git` directory is preserved.
- No commit was created.
- Full Next.js typecheck/build was not run because this source package does not contain the project's installed `node_modules` dependencies.
