# UAT_FIX_PHASE_4 — Checkout Address + Customer Name

## Changes

1. Checkout no longer redirects/asks the customer to go to My Addresses when no saved address exists.
2. Checkout renders an inline delivery-address form when the customer has no saved addresses.
3. On Place Order, the entered address is saved to the customer's `addresses` array as the first/default address.
4. The checkout Name field updates the customer's `name` field before the one-time order is created.
5. Existing saved-address checkout flow remains unchanged.
6. The existing order flow continues to pass the selected/new `addressId` into the order creation service.

## Default-address behavior

The website's existing address management treats the first address in the customer's `addresses` array as the default address. A newly entered checkout address is therefore saved as the first (and initially only) address.

## Validation

- Address line 1, city, and state are required.
- Pincode must contain exactly 6 digits.
- Customer name remains required.
- Delivery slot remains required.
