# Phase 12 — Unified Orders + Subscription Reference

Phase 1 customer transaction model:

- `orders` is the unified transaction/history collection.
- One-time orders use `orderType: "one_time"` and `subscriptionId: null`.
- Subscription orders use `orderType: "subscription"` and `subscriptionId` pointing to the parent `subscriptions/{id}` document.
- Creating a subscription now atomically creates the subscription record and its initial order.
- `subscriptionPlans` remains master/configuration data and is not used as customer order history.
- My Orders reads only `orders` for the logged-in customer's mobile.
- My Subscriptions reads `subscriptions` for subscription controls; the related orders can be found through `subscriptionId`.
- Recurring future deliveries can create additional orders with the same `subscriptionId`.
