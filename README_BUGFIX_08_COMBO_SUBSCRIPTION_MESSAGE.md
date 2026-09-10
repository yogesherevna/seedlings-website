# BUGFIX 08 — Prevent unsupported combo subscription flow

## Problem
The customer website displayed the Subscribe option for every salable product with `subscriptionPurchase === true`, including `multiple`/combo salable products. The subscription creation API then rejected combo products because the current subscription data model stores one production product and one selling option.

## Fix
- Added a single `isSubscriptionEligible()` rule for the customer website.
- Subscription is offered only for active, subscription-enabled, single salable products with exactly one valid production-product component.
- Catalogue no longer shows the Subscribe option or subscription purchase text for unsupported combo products.
- Cart no longer shows the Subscribe mode for unsupported combo products.
- If an old/stale sessionStorage subscription selection points to an unsupported product, the website clears it instead of rendering a Start subscription form.
- The backend retains the combo guard as defense-in-depth but now returns a generic customer-safe message instead of exposing an internal data-model explanation.

## Result
A combo such as `SK_Fav Combo` will remain available for normal one-time purchase, but it will not enter the unsupported subscription flow. Customers should no longer see the previous technical error message during normal website use.
