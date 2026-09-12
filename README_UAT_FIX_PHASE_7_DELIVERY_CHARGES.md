# UAT_FIX_PHASE_7 — Delivery Charges

## Scope
Implemented checkout delivery-charge calculation using the existing Admin masters:

- Geolocation Master (`geolocations`) — pincode-specific base charges.
- Delivery Charges Master (`deliveryCharges`) — global fallback when no active matching geolocation exists.
- Subscription Plan (`subscriptionPlans`) — subscription delivery benefit/reduction.

## Calculation rules

### One-time purchase
1. Find an active Geolocation Master record matching the checkout pincode.
2. Use `oneTimeCharge` when matched.
3. If no matching active geolocation exists, use the active `one_time_order` Delivery Charges Master record.
4. If no active fallback exists, delivery is ₹0.

### Subscription
1. Find an active Geolocation Master record matching the checkout pincode and use `subscriptionCharge` as the base.
2. If no matching active geolocation exists, use the active `subscription` Delivery Charges Master record as the base.
3. Apply the selected subscription plan:
   - `free` / `included` → ₹0.
   - `per_delivery` with a valid plan delivery charge → the lower of the base location/global charge and the plan charge. This allows a plan to reduce delivery but never increase the normal location charge.
4. The resulting amount is the delivery charge for that subscription delivery. It is not multiplied by product quantity.

## Checkout UI

- Delivery charges are calculated as soon as a valid saved-address pincode is selected.
- For a new address, charges recalculate when a valid 6-digit pincode is entered.
- Checkout shows one-time and subscription delivery charges separately.
- A zero charge is explicitly displayed as **₹0 — FREE**.
- When a subscription plan reduces delivery, checkout shows the saving and also shows the combined **You saved ₹X on delivery** message.
- Grand total includes the calculated delivery charges.

## Order/subscription persistence

- One-time orders continue to store `deliveryFee`, `deliveryChargeId`, `deliveryChargeName`, and numeric `deliveryChargeSnapshot`; `deliveryChargeDetails` stores the calculation snapshot.
- Subscription initial orders now store the calculated delivery fee and snapshot.
- Subscriptions store `deliveryFeePerDelivery` and `deliveryChargeDetails` so the selected delivery charge can be carried into future subscription fulfilment logic.

## Shared calculation layer

`lib/deliveryCharges.ts` is the single website calculation layer used by:

- Unified mixed checkout (`lib/customerMixedCheckout.ts`)
- Existing one-time order creation (`lib/customerOrders.ts`)
- Existing direct subscription creation (`lib/customerSubscriptions.ts`)
- Checkout preview (`components/CheckoutHydrator.tsx`)

No Admin code was changed in this phase.

## Validation

The five changed TypeScript/TSX files were syntax-transpiled successfully with the repository's TypeScript compiler. Full `npm run typecheck` could not be completed because the uploaded ZIP did not contain a usable complete `node_modules` installation; dependency installation timed out in the working environment.
