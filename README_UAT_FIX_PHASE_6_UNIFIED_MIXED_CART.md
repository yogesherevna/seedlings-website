# UAT_FIX_PHASE_6 — Unified Mixed Cart

Implemented from the supplied `UAT_FIX_PHASE_5_REMOVE_RAHUL_HARDCODE` website base.

## Included
- Unified cart storage with separate `oneTimeItems[]` and `subscriptionItems[]`.
- Subscription cart entries preserve product, plan, quantity, start date and price.
- One-time and subscription versions of the same product never merge.
- Product detail one-time Add now goes to the cart.
- Product detail Subscribe adds the selected subscription configuration to the cart instead of creating a Firebase subscription immediately.
- Cart is split into Subscriptions and One-time Purchases with independent quantity/remove controls.
- Subscription Edit returns to the product subscription popup with the existing plan/date/quantity preselected.
- Unified checkout handles both cart sections in one checkout action.
- Existing inline new-address flow and customer-name update remain intact.
- Mixed checkout validates availability and creates one-time order plus subscription records/initial orders in a single Firestore batch.
- Existing `subscriptions/{subscriptionId}` and subscription `orders/{orderId}` relationship is preserved.
- Existing subscription-checkout route remains available for compatibility but is no longer part of the normal product-to-cart journey.
- `.git` is preserved.
