# BUG-07 — Mobile Menu

## Fix
The prototype HTML includes the mobile hamburger button and CSS for `.nav.open`, but `PrototypePage` removes prototype `<script>` tags before rendering. The original menu click handler therefore never ran in the Next.js website.

The fix wires the existing `.menu` button to the existing `.nav.open` CSS behavior from `CmsHydrator` after the prototype markup has mounted.

## Behavior
- Hamburger opens the existing navigation drawer on screens up to 700px.
- `aria-expanded` updates between `true` and `false`.
- `aria-label` changes between Open/Close navigation.
- Clicking a navigation link closes the drawer.
- Clicking outside the open drawer closes it.
- Switching back to desktop width closes the drawer.

No navigation markup, routes, or unrelated application functionality were changed.
