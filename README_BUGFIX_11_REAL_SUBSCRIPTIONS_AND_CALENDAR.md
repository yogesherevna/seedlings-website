# BUGFIX 11 — Real Customer Subscriptions and Delivery Calendar

## Problem
The customer website still contained prototype/demo subscription and delivery-calendar data such as Broccoli, September dates, DELIVERED, UPCOMING and SKIPPED entries. This could appear even when the logged-in customer's Firestore account had no subscriptions or orders.

## Phase 1 behavior
- Subscription page queries `subscriptions` using the logged-in customer's stored mobile number.
- If no subscription belongs to that customer, the page shows **No subscriptions found for this customer** / **No active subscription**.
- Delivery Calendar queries the same customer-scoped subscriptions collection.
- If there is no active subscription, it shows **No active subscription** and no fake calendar events.
- If an active subscription exists, only its actual `nextDeliveryDate` is shown as upcoming.
- Demo delivered/skipped/rescheduled history is not generated.
- Static prototype subscription/calendar content was replaced with neutral loading placeholders so fake data cannot flash before hydration.

## Security / architecture
Customer reads use the website Firebase Web SDK and the stored customer mobile identity, consistent with the customer website architecture. The Admin Portal is not used for these reads.

No git commit is made by this bug fix.
