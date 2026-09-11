# Seedlings Customer Website — Phase 19 Product Pricing

## Scope
Implemented customer-facing MRP vs Selling Price display and product savings.

### Changes
- Home page Featured Microgreens cards now show:
  - MRP as a struck-through price when MRP is greater than Selling Price.
  - Selling Price as the customer price.
  - Per-product savings when applicable.
- Microgreens catalogue cards use the same MRP/Selling Price presentation.
- Product detail page uses the same MRP/Selling Price presentation.
- Cart items show MRP, Selling Price, and item-level savings when applicable.
- Cart order summary shows total `You save` amount.
- Checkout order summary shows MRP vs Selling Price per item and total `You save` amount.
- One-time customer orders now store the product MRP on each order item and store the product-price savings in the existing `discount` field.

## Data source
- Uses the existing `salesProducts` collection.
- `mrp` = original/reference customer-facing price.
- `sellingPrice` = actual customer price.
- No new Firebase collection was added.
- Existing cart/order flows remain unchanged apart from pricing display/savings data.

## Compatibility
- Existing products without `mrp` fall back to `sellingPrice`, so they continue to display normally without showing a false discount.
- Underlying selling-price calculations remain based on the existing `sellingPrice` field.

## Validation
- `git diff --check` passes.
- Dependency installation/typecheck could not be completed in this environment because `node_modules` is not present and `npm ci` timed out. Run `npm install`/`npm ci` and `npm run typecheck` locally before deployment.

## ZIP rules
- Keep `.git` in the ZIP.
- Do not include `.env.local`.
