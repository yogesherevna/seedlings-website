# BUGFIX 11 — Real Customer Subscription + Delivery Calendar

## Phase 1 rule
My Subscriptions and Delivery Calendar must show only subscription documents belonging to the currently logged-in customer mobile number.

- Subscription reads use Firestore `getDocsFromServer` to avoid stale offline/cache data.
- Returned subscription documents are filtered again by normalized `customerId`.
- If no subscription exists for the customer, the website shows **No active subscription** and never displays prototype/demo Broccoli data.
- Delivery Calendar is now hydrated from the same customer-scoped subscription query.
- No fake delivery history is generated.
- Phase 1 uses Saturday as the fixed delivery day.
- Account prototype subscription/next-delivery demo values were replaced with neutral loading values.

## Identity
The website's customer identity remains the mobile number stored in `seedlings_customer_mobile`, created by the existing OTP onboarding flow.

No Admin Portal API is required for customer reads.
