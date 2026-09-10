# Phase 13 — Home, Catalogue and Product Data Fixes

Implemented customer website fixes:

- Featured products now use the same active `salesProducts` source as the catalogue and product detail pages.
- Featured product cards link directly to `/product/<canonical-slug>` instead of the generic catalogue page.
- Active sales products use a customer-browser cache (`seedlings-sales-products-v2`) and a server refresh via Firestore; catalogue/product pages render cached data first and refresh in the background.
- Home featured products render cached data first and refresh in the background.
- Microgreens page no longer contains hardcoded product cards.
- Microgreens `Shop by mood` cards are generated from product `mood`/`moods` data; if no mood data is configured, the section is hidden rather than showing fake static products.
- Microgreens category filters are generated from product data.
- Product detail HTML no longer contains a hardcoded Broccoli product shell; neutral loading content is used until cached/current product data is applied.
- Product detail purchase options are driven by the salable product configuration: one-time purchase is shown only when enabled; subscription is shown only when the product is subscription-eligible.
- Decorative `.product-art:after` fake-product effect and product-card hover lift were removed.
- Canonical product slug generation is shared between catalogue and featured links to prevent 404s caused by slug mismatches.

No Git commit was made. `.git` is preserved.
