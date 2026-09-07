# Seedlings Website UI/UX — V2 Attractive Prototype

This is an enhanced version of the complete multi-page prototype.

## What is new in V2

- More polished visual hierarchy and spacing
- Inline icon treatment
- Responsive product cards with badges
- Horizontal product carousel with previous/next controls
- Auto-playing testimonial carousel on Home
- FAQ accordion
- Promotional feature panel
- Floating cart button on shopping pages
- More premium hover states and restrained elevation
- Mobile-first navigation and responsive layouts
- Same Seedlings visual system and Firebase-ready page structure

## Pages

- Home
- Microgreens listing
- Product detail
- Our Journey
- Contact / enquiry
- Account / login
- Cart
- Checkout
- Order success
- My Account overview
- My Orders + Order detail / payment reference
- My Subscriptions
- Subscription Delivery Calendar
- My Addresses (default address)
- My Profile

## Run

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080

## Migration

This remains plain HTML/CSS/JS intentionally. It can be migrated page-by-page into the existing Next.js website. The prototype does not replace the existing Firebase CMS or business data.

Production data should connect to the canonical catalogue and customer/order structures rather than the prototype values.

## Phase 1 customer-flow reference

The HTML prototype now also visualizes the authenticated customer area:
- Profile
- Addresses with default address
- Orders including past orders
- Order detail with payment/transaction information
- Subscriptions (Monthly, Quarterly, Half-Yearly, Yearly)
- Subscription delivery calendar with Delivered / Upcoming / Skipped / Rescheduled states
- Reschedule / Skip controls for the immediate next upcoming delivery
- Cart purchase mode: One-time or Subscription, with subscription plan selection

These are visual/reference flows only. They are not connected to Firebase or real payment/delivery APIs.
