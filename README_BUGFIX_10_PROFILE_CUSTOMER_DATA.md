# BUGFIX 10 — Profile customer data + fixed Saturday

## Phase 1 behavior
- Mobile number is taken immediately from the logged-in website session (`seedlings_customer_mobile`).
- Profile data is cache-first, then refreshed directly from the website Firebase Firestore customer document.
- Existing customer `name` and `email` are displayed from the `customers/{mobile}` document.
- If name/email have no value, the inputs remain empty and show `Not provided` as the placeholder.
- Preferred delivery day is fixed to **Saturday** in Phase 1; customers cannot select another day.
- Saving a profile always stores `preferredDeliveryDay: "Saturday"`.
- After saving, the customer cache is refreshed from Firestore.

## Why
The previous implementation allowed a blank/stale profile state and exposed a selectable delivery-day list even though Phase 1 supports Saturday only.
