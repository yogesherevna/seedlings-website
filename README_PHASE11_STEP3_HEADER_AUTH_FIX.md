# Phase 11 Step 3 — Header, Cart Badge and Logout/Auth Fix

Based on the accepted Phase 11 Step 3 sidebar-logout baseline.

Changes only:
- One canonical customer website header is used across account-area pages.
- Cart badge reads the existing cart state and updates on cart events/storage changes.
- Logged-out `/account` renders the existing customer mobile + demo OTP login flow.
- Sidebar logout signs out Firebase, clears stored customer mobile, and returns to `/account`, which then shows login.

No new collections, data structures, or business masters.
