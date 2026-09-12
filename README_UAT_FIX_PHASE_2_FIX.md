# UAT_FIX_PHASE_2_FIX

## Scope
Fix the subscription popup/runtime regression reported during UAT.

## Fixes
- Removed the direct Firestore `db` dependency from `components/CatalogueHydrator.tsx`.
- Subscription plans are now loaded through `loadActiveCustomerSubscriptionPlans()` in `lib/customerSubscriptions.ts`, keeping Firestore access in the existing data layer.
- Subscription popup remains a true viewport-floating trigger on the product details page.
- Floating Subscribe trigger is orange and fixed to the bottom-right on desktop/mobile.
- Popup is full viewport width and keeps its header sticky while popup content scrolls.
- Product title and close button remain visible in the sticky popup header.
- Delivery address is not shown inside the popup.
- Popup CTA is `Subscribe`.
- Subscribe from the popup opens `/subscription-checkout` with the selected product, plan, quantity and start date.
- Added dedicated subscription checkout to collect the delivery address before creating the subscription and initial order, matching the existing `createCustomerSubscription` data contract.
- Preserved the existing harvest-shortage confirmation flow.
- One-time product Add control continues to use the existing cart flow; Add navigates to `/checkout`.
- Quantity=1 uses a proper SVG trash icon; quantity>1 uses minus/plus controls.

## Verification
- `git diff --check` passes.
- Source-level delimiter sanity checks pass.
- Full npm/Next build could not be executed in this environment because dependencies are not installed and the package registry cache is incomplete; no application files were changed to work around that limitation.
