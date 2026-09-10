# Bug Fix 09 — Profile Cache-First Loading

## Phase 1 behavior

- The logged-in customer's mobile number is displayed immediately from local login state.
- Profile data uses the existing per-customer localStorage cache (`seedlings-customer-account-v1:<mobile>`), with a 10-minute TTL.
- Cached profile data is rendered immediately when available.
- Firestore is refreshed in the background and updates the cache.
- If no profile cache exists, Full name and Email remain empty with `Not provided` placeholders.
- Preferred delivery day remains unselected with `Select a delivery day` until a value exists.
- A temporary Firestore failure does not replace the mobile number with a loading/error screen.
- Profile save clears the cached profile so the next read uses fresh Firestore data.

## Scope

This change only addresses customer profile loading, caching, and placeholders. It does not change the existing login/OTP implementation.
