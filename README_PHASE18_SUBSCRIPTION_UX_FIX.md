# Phase 18 — Subscription Creation + Harvest Shortage UX Fix

## Fixes

1. Subscription creation no longer requires a legacy `products/{id}.sellingOptions` entry to match the Salable Product component.
2. The Salable Product component's `quantityGrams` is the canonical customer-facing pack size for subscription fulfilment.
3. Subscription price uses the selected subscription plan price per pack/delivery.
4. Harvest shortage confirmation now uses SweetAlert2 instead of the browser `window.confirm()` dialog for both one-time and subscription flows.
5. Subscription shortage wording explains that the remaining quantity will be covered by the upcoming delivery.
6. One-time shortage wording explains the available quantity and asks whether the customer wants to continue.
7. Selecting `No, contact me` continues to create the order/subscription with `requiresCustomerContact: true`, as defined in the Phase 17 business rule.
8. Successful subscription creation uses a SweetAlert2 success dialog.

## Dependency

Added `sweetalert2` to `package.json`. Run `npm install` after extracting the ZIP so npm resolves the new dependency and updates the lockfile if required.

## Scope

- Existing Firebase-only customer architecture is preserved.
- No Admin API/customer Admin dependency is introduced.
- `.git` is preserved.
- No commit is created.
