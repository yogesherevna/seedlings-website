# UAT_FIX_PHASE_3 — Account OTP Duplicate UI Fix

## Scope
Fix the account login OTP UI so a single OTP request produces exactly one OTP input and one Verify OTP button.

## Changes
- After a valid mobile number is submitted, the Send OTP button is hidden.
- The OTP renderer removes any existing `.account-otp-row` before creating the new one.
- Repeated clicks cannot append multiple OTP sections.
- Existing OTP verification, countdown, onboarding, and redirect behavior is unchanged.
- No unrelated account functionality was changed.

## Verification
- Source change limited to `components/AccountHydrator.tsx`.
