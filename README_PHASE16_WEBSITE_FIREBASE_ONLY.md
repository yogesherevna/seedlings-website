# Phase 16 — Website Firebase-Only Customer Flow

## Goal
The customer website must not depend on the Firebase Admin SDK or customer Admin API routes.

## Changes
- Customer account dashboard reads directly from the website Firebase Web SDK.
- One-time order creation writes directly to Firestore from the customer website.
- Subscription creation writes the subscription and its initial order atomically with a Firestore batch from the customer website.
- Subscription pause/resume/cancel writes directly to Firestore.
- Subscription plan loading remains website-Firebase direct.
- Checkout waits for Firebase Auth state restoration before rendering the signed-out state, preventing the initial sign-in flash.
- Removed website customer API routes that depended on `firebase-admin`.
- Removed the website `firebase-admin` dependency from `package.json`.

## Important
Customer-side Firestore writes are governed by the Firebase project's Firestore Security Rules. The current demo OTP uses anonymous Firebase Auth, so production-grade ownership rules should be tightened when real phone/WhatsApp authentication is integrated.
