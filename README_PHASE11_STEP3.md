# Seedlings Website — Phase 11 Step 3

Baseline: Phase 11 Step 2 (Account Actions + Logout).

Step 3 changes only the global dynamic UI:
- Mounts a global cart badge hydrator.
- Cart count is read from the existing local cart state.
- Updates the existing HTML cart badge without changing the supplied UI/CSS.
- Responds to cart updates and cross-tab storage changes.
- Keeps all Phase 10/Phase 11 Step 1/Step 2 functionality intact.

No new Firestore collections or data structures are introduced.


Bug Fix: Home testimonials and FAQ now use CMS data with loading placeholders, local caching, static fallbacks, and working testimonial carousel controls.
