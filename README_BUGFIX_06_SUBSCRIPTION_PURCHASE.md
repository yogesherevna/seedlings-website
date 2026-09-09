# BUG-06 — Subscription Purchase

Implemented on top of BUG-04 and BUG-05.

## Fixed
- Product-page **Subscribe** now carries the selected product name, product ID, and quantity into the subscription flow.
- Cart now shows a purchase-mode selector for salable products that support subscriptions.
- Cart supports switching an eligible item between **One-time purchase** and **Subscribe**.
- Cart subscription mode exposes the active Monthly/Quarterly plans when available.
- Cart **Continue with subscription** carries the selected item and plan into My Subscriptions.
- If a plan is not selected/available in Cart, the customer can choose it on the My Subscriptions page instead of the flow silently failing.
- Existing one-time cart and checkout behavior remains unchanged.
- After successful subscription creation, pending cart subscription-mode state for that product is cleared.

## Architecture
The website reads salable products and subscription plans using the website Firebase Web SDK. The existing subscription creation API remains the backend write path; it was not replaced as part of this focused BUG-06 change.

## Git
The existing `.git` directory is intentionally preserved. No commit was created.
