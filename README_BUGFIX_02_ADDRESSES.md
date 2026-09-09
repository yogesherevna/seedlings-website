# BUG-02 — My Addresses

Updated from the latest website baseline.

- Uses the existing `customers` collection and `addresses` field.
- Customer Website uses its existing Firebase Web SDK (`lib/firebase.ts`) for address reads/writes.
- No Firebase Admin SDK is used by the address page/API.
- Add, Edit, and Set Default are functional.
- Loading skeleton is shown while the customer document loads.
- Static demo addresses are not used.
- Existing address data remains in the customer document.
- No new Firestore collection or data model was added.
