"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import { collection, getDocsFromServer, query, where } from 'firebase/firestore';
import { getActiveSalesProducts, refreshActiveSalesProducts, isSubscriptionEligible, productMoods, productSlug, type SalesProduct } from '@/lib/salesProducts';
import { addToCart, getCart, setCartQuantity } from '@/lib/cart';
import { db } from '@/lib/firebase';

type Page = 'microgreens' | 'product';

const esc = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const money = (value: number, currency = 'INR') => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
  catch { return `₹${value}`; }
};

const priceMarkup = (product: SalesProduct) => {
  const sale = Number(product.sellingPrice ?? 0);
  const mrp = Number(product.mrp ?? sale);
  const currency = product.currency || 'INR';
  if (Number.isFinite(mrp) && mrp > sale && sale >= 0) {
    const saving = mrp - sale;
    return `<span class=\"price-stack\"><span class=\"price-mrp\">MRP ${esc(money(mrp, currency))}</span><strong class=\"price-sale\">${esc(money(sale, currency))}</strong><span class=\"price-saving\">Save ${esc(money(saving, currency))}</span></span>`;
  }
  return `<span class=\"price-stack\"><strong class=\"price-sale\">${esc(money(sale, currency))}</strong></span>`;
};

const slugify = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const slugFor = (p: SalesProduct) => productSlug(p);
const isPlaceholderDescription = (value: string) => ['dsds', 'dssd', 'test', 'test description'].includes(value.trim().toLowerCase());
const descriptionFor = (p: SalesProduct) => {
  const description = p.description?.trim() || '';
  const short = p.shortDescription?.trim() || '';
  if (description && !isPlaceholderDescription(description)) return description;
  if (short && !isPlaceholderDescription(short)) return short;
  return 'Freshly grown microgreens, harvested with care and prepared for delivery.';
};

function card(product: SalesProduct) {
  const href = `/product/${encodeURIComponent(slugFor(product))}`;
  const image = product.imageUrl?.trim();
  const badge = product.featured ? 'Featured' : 'Fresh';
  const description = descriptionFor(product);
  return `<article class="card"><a href="${esc(href)}" aria-label="View ${esc(product.name)}"><div class="product-art"${image ? ` style="background-image:url('${esc(image)}');background-size:cover;background-position:center"` : ''}><span class="badge">${badge}</span></div></a><div class="product-body"><span class="tag">${product.type === 'multiple' ? 'Salable combo' : 'Fresh microgreen'}</span><h3>${esc(product.name)}</h3><p>${esc(description)}</p><div class="product-foot"><span class="price">${priceMarkup(product)}</span><a class="mini" href="${esc(href)}">Details</a></div></div></article>`;
}

function renderError(root: HTMLElement, detail = false) {
  if (detail) {
    const title = root.querySelector('.detail h1');
    const description = root.querySelector('.detail p.muted');
    if (title) title.textContent = 'Product unavailable';
    if (description) description.textContent = 'This product could not be loaded right now.';
    return;
  }
  const cards = root.querySelector('.cards');
  if (cards) cards.innerHTML = '<div class="card" style="grid-column:1/-1;padding:28px"><div class="product-body"><h3>Products are temporarily unavailable</h3><p>Please try again shortly.</p></div></div>';
}

function renderEmpty(root: HTMLElement) {
  const cards = root.querySelector('.cards');
  if (cards) cards.innerHTML = '<div class="card" style="grid-column:1/-1;padding:28px"><div class="product-body"><h3>No salable products are currently available</h3><p>Please check back soon.</p></div></div>';
}

function moodMarkup(products: SalesProduct[]) {
  const counts = new Map<string, number>();
  for (const product of products) for (const mood of productMoods(product)) counts.set(mood, (counts.get(mood) || 0) + 1);
  const moods = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!moods.length) return '';
  return moods.map(([mood, count], i) => `<article class="card mood-card" data-mood="${esc(mood)}"><div class="product-art"><span class="badge">${i === 0 ? 'Popular' : 'Explore'}</span></div><div class="product-body"><h3>${esc(mood)}</h3><p>${count} ${count === 1 ? 'product' : 'products'} to explore.</p></div></article>`).join('');
}

function applyMoods(root: HTMLElement, products: SalesProduct[]) {
  const section = root.querySelectorAll('.section')[0];
  const track = section?.querySelector('.carousel-track');
  if (!section || !track) return;
  const markup = moodMarkup(products);
  if (!markup) { (section as HTMLElement).hidden = true; return; }
  (section as HTMLElement).hidden = false;
  track.innerHTML = markup;
  track.querySelectorAll<HTMLElement>('[data-mood]').forEach((card) => {
    card.addEventListener('click', () => {
      const mood = card.dataset.mood || '';
      const url = new URL(window.location.href);
      if (mood) url.searchParams.set('mood', mood); else url.searchParams.delete('mood');
      window.history.replaceState(null, '', url.toString());
      renderProductCards(root, products, mood);
      root.querySelectorAll('.filter').forEach((el) => el.classList.remove('active'));
    });
  });
}

function renderProductCards(root: HTMLElement, products: SalesProduct[], mood = '') {
  const cards = root.querySelector('.cards');
  if (!cards) return;
  const filtered = mood ? products.filter((p) => productMoods(p).some((value) => value.toLowerCase() === mood.toLowerCase())) : products;
  if (!filtered.length) { renderEmpty(root); return; }
  cards.innerHTML = filtered.map(card).join('');
}

function showCataloguePlaceholder(root: HTMLElement) {
  const section = root.querySelectorAll('.section')[1];
  const cards = section?.querySelector('.cards');
  if (!section || !cards) return;
  cards.innerHTML = Array.from({ length: 6 }, () => `<article class="card product-placeholder" aria-hidden="true"><div class="product-art"><span class="placeholder-product-image"></span></div><div class="product-body"><span class="placeholder-line placeholder-tag"></span><span class="placeholder-line placeholder-product-title"></span><span class="placeholder-line placeholder-product-text"></span></div></article>`).join('');
}

function applyMicrogreens(root: HTMLElement, products: SalesProduct[]) {
  applyMoods(root, products);
  const mood = new URLSearchParams(window.location.search).get('mood') || '';
  renderProductCards(root, products, mood);
  const filters = root.querySelector('.filters');
  if (filters) {
    const categories = [...new Set(products.map((p) => String(p.category || '').trim()).filter(Boolean))].slice(0, 5);
    filters.innerHTML = `<button class="filter active" data-filter="">All</button>${categories.map((c) => `<button class="filter" data-filter="${esc(c)}">${esc(c)}</button>`).join('')}`;
    filters.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => button.addEventListener('click', () => {
      filters.querySelectorAll('.filter').forEach((el) => el.classList.remove('active'));
      button.classList.add('active');
      const value = button.dataset.filter || '';
      const filtered = value ? products.filter((p) => String(p.category || '').toLowerCase() === value.toLowerCase()) : products;
      renderProductCards(root, filtered, '');
    }));
  }
}
type SubscriptionPlan = {
  id: string;
  name?: string;
  frequency?: string;
  price?: number;
  deliveriesPerTerm?: number | string;
  active?: boolean;
};

async function loadActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const snapshot = await getDocsFromServer(
    query(collection(db, 'subscriptionPlans'), where('active', '==', true)),
  );
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as SubscriptionPlan)
    .filter((plan) => plan.active === true && ['monthly', 'quarterly'].includes(String(plan.frequency).toLowerCase()));
}

async function applyProduct(root: HTMLElement, products: SalesProduct[], slug: string) {
  const decoded = decodeURIComponent(slug);
  const normalizedRequested = slugify(decoded);
  const product = products.find((p) => slugFor(p) === normalizedRequested || p.slug?.trim() === decoded || p.id === decoded);
  if (!product) { renderError(root, true); return; }

  const canonicalSlug = slugFor(product);
  if (typeof window !== 'undefined' && decoded !== canonicalSlug) {
    window.history.replaceState(null, '', `/product/${encodeURIComponent(canonicalSlug)}`);
  }

  const image = product.imageUrl?.trim();
  const art = root.querySelector('.detail-art') as HTMLElement | null;
  if (art && image) {
    art.style.backgroundImage = `url('${image.replace(/'/g, "%27")}')`;
    art.style.backgroundSize = 'cover';
    art.style.backgroundPosition = 'center';
    art.style.minHeight = '560px';
  }

  const tag = root.querySelector('.detail .tag');
  if (tag) tag.textContent = product.type === 'multiple' ? 'Salable combo' : 'Fresh microgreen';
  const title = root.querySelector('.detail h1');
  if (title) title.textContent = product.name;

  const breadcrumbs = root.querySelector('.breadcrumbs');
  if (breadcrumbs) {
    breadcrumbs.innerHTML = `<a href="/">Home</a> / <a href="/microgreens">Microgreens</a> / ${esc(product.name)}`;
  }
  const rating = root.querySelector('.rating');
  if (rating) rating.textContent = product.featured ? 'Featured · Fresh availability' : 'Fresh availability';
  const description = root.querySelector('.detail p.muted');
  if (description) description.textContent = descriptionFor(product);
  const price = root.querySelector('.detail-price');
  if (price) price.innerHTML = priceMarkup(product);

  const chips = root.querySelector('.chips');
  const choose = chips?.previousElementSibling;
  const productSubscriptionEligible = isSubscriptionEligible(product);
  let plans: SubscriptionPlan[] = [];
  if (productSubscriptionEligible) {
    try {
      plans = await loadActiveSubscriptionPlans();
    } catch (error) {
      console.warn('Subscription plans could not be loaded from website Firebase', error);
    }
  }
  const subscriptionAvailable = productSubscriptionEligible && plans.length > 0;
  const oneTimeAvailable = Boolean(product.oneTimePurchase);
  if (chips) {
    const options: string[] = [];
    if (oneTimeAvailable) options.push('One-time purchase');
    if (subscriptionAvailable) options.push('Subscribe');
    chips.innerHTML = options.length
      ? options.map((label, i) => `<button class=\"chip purchase-option${i === 0 ? ' active' : ''}\" data-purchase-option=\"${label === 'Subscribe' ? 'subscription' : 'one-time'}\" type=\"button\">${esc(label)}</button>`).join('')
      : '<span class=\"chip active\">Unavailable</span>';
    if (choose) choose.textContent = options.length > 1 ? 'Choose purchase option' : 'Purchase option';
  }

  const info = root.querySelector('.detail-info');
  if (info) {
    info.innerHTML = `<div><strong>Availability</strong><br><span class="muted">${Number(product.packedStockQuantity ?? 0) > 0 ? 'Available for purchase.' : 'Current packed stock is limited.'}</span></div><div><strong>Purchase</strong><br><span class="muted">${oneTimeAvailable && subscriptionAvailable ? 'One-time and subscription purchase options.' : subscriptionAvailable ? 'Subscription purchase available.' : oneTimeAvailable ? 'One-time purchase available.' : 'Purchase unavailable.'}</span></div><div><strong>Delivery</strong><br><span class="muted">Weekend delivery slots.</span></div>`;
  }

  const actions = root.querySelector('.actions');
  if (actions) {
    actions.innerHTML =
      (oneTimeAvailable ? '<button class=\"btn primary\" data-add-cart type=\"button\">Add to cart</button><button class=\"btn outline\" data-buy-now type=\"button\">Buy now</button>' : '') +
      (subscriptionAvailable ? '<div class=\"subscription-picker\" data-subscription-picker hidden><label for=\"subscription-plan\">Choose subscription</label><select id=\"subscription-plan\" data-subscription-plan><option value=\"\">Select a subscription</option></select></div><button class=\"btn outline subscription-action\" data-subscribe type=\"button\" hidden disabled>Subscribe</button>' : '');

    const qtyEl = root.querySelector('#qty') as HTMLElement | null;
    const existingCartItem = getCart().find((item) => item.productId === product.id);
    const initialCartQuantity = existingCartItem?.quantity || 1;
    const getQty = () => Math.max(1, Number(qtyEl?.textContent || '1'));
    const setQty = (next: number) => {
      if (!qtyEl) return;
      qtyEl.textContent = String(Math.max(1, Math.floor(Number.isFinite(next) ? next : 1)));
    };
    // The details-page quantity represents the current cart quantity for this product.
    // This prevents a stale UI value (1) from being added on top of an existing cart quantity.
    setQty(initialCartQuantity);
    const minusButton = root.querySelector('[data-minus="#qty"]') as HTMLButtonElement | null;
    const plusButton = root.querySelector('[data-plus="#qty"]') as HTMLButtonElement | null;
    // PrototypePage strips the original script.js, so wire quantity controls here.
    // Use onclick assignment (instead of addEventListener) because the product is
    // rendered once from cache and once again after the background refresh.
    if (minusButton) minusButton.onclick = () => setQty(getQty() - 1);
    if (plusButton) plusButton.onclick = () => setQty(getQty() + 1);
    const addButton = actions.querySelector('[data-add-cart]') as HTMLButtonElement | null;
    const buyButton = actions.querySelector('[data-buy-now]') as HTMLButtonElement | null;
    const subscribeButton = actions.querySelector('[data-subscribe]') as HTMLButtonElement | null;
    const planSelect = actions.querySelector('[data-subscription-plan]') as HTMLSelectElement | null;
    const planPicker = actions.querySelector('[data-subscription-picker]') as HTMLElement | null;

    const add = (goCart: boolean) => {
      const quantity = getQty();
      const currentCartItem = getCart().find((item) => item.productId === product.id);
      if (currentCartItem) {
        // Existing cart item: the details-page quantity is the desired final quantity,
        // not an additional quantity to add.
        setCartQuantity(product.id, quantity);
      } else {
        addToCart({ productId: product.id, slug: slugFor(product), name: product.name, price: Number(product.sellingPrice ?? 0), mrp: Number(product.mrp ?? product.sellingPrice ?? 0), currency: product.currency || 'INR', imageUrl: product.imageUrl }, quantity);
      }
      if (addButton) {
        addButton.textContent = goCart ? 'Added' : 'Added to cart';
        addButton.disabled = true;
        window.setTimeout(() => {
          if (addButton) { addButton.textContent = 'Add to cart'; addButton.disabled = false; }
        }, 900);
      }
      if (goCart) window.location.href = '/cart';
    };

    const setPurchaseMode = (mode: 'one-time' | 'subscription') => {
      root.querySelectorAll<HTMLButtonElement>('[data-purchase-option]').forEach((button) => {
        button.classList.toggle('active', button.dataset.purchaseOption === mode);
      });
      const isSubscription = mode === 'subscription';
      if (planPicker) planPicker.hidden = !isSubscription;
      if (subscribeButton) subscribeButton.hidden = !isSubscription;
      if (isSubscription && planSelect) {
        planSelect.disabled = false;
        if (plans.length && planSelect.options.length <= 1) {
          planSelect.innerHTML = '<option value="">Select a subscription</option>' + plans.map((plan) => {
            const frequency = String(plan.frequency || '').replace(/^./, (c) => c.toUpperCase());
            const price = Number(plan.price || 0).toLocaleString('en-IN');
            const deliveries = plan.deliveriesPerTerm ? ` · ${esc(plan.deliveriesPerTerm)} deliveries` : '';
            return `<option value="${esc(plan.id)}">${esc(plan.name || frequency)} — ₹${price}${deliveries}</option>`;
          }).join('');
        }
      }
    };


    root.querySelectorAll<HTMLButtonElement>('[data-purchase-option]').forEach((button) => {
      button.addEventListener('click', () => setPurchaseMode(button.dataset.purchaseOption === 'subscription' ? 'subscription' : 'one-time'));
    });

    addButton?.addEventListener('click', () => add(false));
    buyButton?.addEventListener('click', () => add(true));
    planSelect?.addEventListener('change', () => {
      if (subscribeButton) subscribeButton.disabled = !planSelect.value;
    });
    subscribeButton?.addEventListener('click', () => {
      const planId = planSelect?.value || '';
      if (!planId) return;
      sessionStorage.setItem('seedlings_subscription_product', JSON.stringify({ productId: product.id, name: product.name, quantity: getQty() }));
      sessionStorage.setItem('seedlings_subscription_plan', planId);
      window.location.href = '/subscriptions';
    });

    // Default to one-time when available; otherwise open subscription mode.
    setPurchaseMode(oneTimeAvailable ? 'one-time' : 'subscription');
  }
}

export default function CatalogueHydrator({ page, slug, children }: { page: Page; slug?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let dead = false;
    void (async () => {
      try {
        if (page === 'microgreens') showCataloguePlaceholder(root);
        const cached = await getActiveSalesProducts();
        if (dead) return;
        if (page === 'microgreens') applyMicrogreens(root, cached);
        else if (slug) applyProduct(root, cached, slug);
        try {
          const fresh = await refreshActiveSalesProducts();
          if (dead) return;
          if (page === 'microgreens') applyMicrogreens(root, fresh);
          else if (slug) applyProduct(root, fresh, slug);
        } catch (refreshError) { console.warn('Salable Products background refresh failed', refreshError); }
      } catch (error) {
        if (!dead) { console.error('Salable Products load failed', error); renderError(root, page === 'product'); }
      }
    })();
    return () => { dead = true; };
  }, [page, slug]);
  return <div ref={ref}>{children}</div>;
}
