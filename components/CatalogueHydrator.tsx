"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import { getActiveSalesProducts, type SalesProduct } from '@/lib/salesProducts';
import { addToCart } from '@/lib/cart';

type Page = 'microgreens' | 'product';

const esc = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const money = (value: number, currency = 'INR') => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
  catch { return `₹${value}`; }
};

const slugFor = (p: SalesProduct) => p.slug?.trim() || p.id;

function card(product: SalesProduct) {
  const href = `/product/${encodeURIComponent(slugFor(product))}`;
  const image = product.imageUrl?.trim();
  const badge = product.featured ? 'Featured' : 'Fresh';
  const description = product.shortDescription?.trim() || product.description?.trim() || 'Freshly grown and prepared for delivery.';
  return `<article class="card"><a href="${esc(href)}" aria-label="View ${esc(product.name)}"><div class="product-art"${image ? ` style="background-image:url('${esc(image)}');background-size:cover;background-position:center"` : ''}><span class="badge">${badge}</span></div></a><div class="product-body"><span class="tag">${product.type === 'multiple' ? 'Salable combo' : 'Fresh microgreen'}</span><h3>${esc(product.name)}</h3><p>${esc(description)}</p><div class="product-foot"><span class="price">${esc(money(Number(product.sellingPrice ?? 0), product.currency || 'INR'))}</span><a class="mini" href="${esc(href)}">Details</a></div></div></article>`;
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

function applyMicrogreens(root: HTMLElement, products: SalesProduct[]) {
  const cards = root.querySelector('.cards');
  if (!cards) return;
  if (!products.length) { renderEmpty(root); return; }
  cards.innerHTML = products.map(card).join('');

  const filters = root.querySelector('.filters');
  if (filters) filters.innerHTML = '<button class="filter active" type="button">All</button>';
}

function applyProduct(root: HTMLElement, products: SalesProduct[], slug: string) {
  const decoded = decodeURIComponent(slug);
  const product = products.find((p) => slugFor(p) === decoded || p.id === decoded);
  if (!product) { renderError(root, true); return; }

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
  const rating = root.querySelector('.rating');
  if (rating) rating.textContent = product.featured ? 'Featured · Fresh availability' : 'Fresh availability';
  const description = root.querySelector('.detail p.muted');
  if (description) description.textContent = product.description?.trim() || product.shortDescription?.trim() || 'Freshly grown and prepared for delivery.';
  const price = root.querySelector('.detail-price');
  if (price) price.textContent = money(Number(product.sellingPrice ?? 0), product.currency || 'INR');

  const chips = root.querySelector('.chips');
  const choose = chips?.previousElementSibling;
  if (chips) {
    const options: string[] = [];
    if (product.oneTimePurchase) options.push('One-time');
    if (product.subscriptionPurchase) options.push('Subscription');
    chips.innerHTML = options.length ? options.map((x, i) => `<span class="chip${i === 0 ? ' active' : ''}">${x}</span>`).join('') : '<span class="chip active">Available</span>';
    if (choose) choose.textContent = options.length > 1 ? 'Choose purchase' : 'Purchase option';
  }

  const info = root.querySelector('.detail-info');
  if (info) {
    info.innerHTML = `<div><strong>Availability</strong><br><span class="muted">${Number(product.packedStockQuantity ?? 0) > 0 ? 'Available for purchase.' : 'Current packed stock is limited.'}</span></div><div><strong>Purchase</strong><br><span class="muted">${product.oneTimePurchase && product.subscriptionPurchase ? 'One-time and subscription purchase options.' : product.subscriptionPurchase ? 'Subscription purchase available.' : 'One-time purchase available.'}</span></div><div><strong>Delivery</strong><br><span class="muted">Weekend delivery slots.</span></div>`;
  }

  const actions = root.querySelector('.actions');
  if (actions) {
    actions.innerHTML = '<button class="btn primary" data-add-cart type="button">Add to cart</button><button class="btn outline" data-buy-now type="button">Buy now</button>' + (product.subscriptionPurchase ? '<button class="btn outline" data-subscribe type="button">Subscribe</button>' : '');
    const qtyEl = root.querySelector('#qty') as HTMLElement | null;
    const getQty = () => Math.max(1, Number(qtyEl?.textContent || '1'));
    const addButton = actions.querySelector('[data-add-cart]') as HTMLButtonElement | null;
    const buyButton = actions.querySelector('[data-buy-now]') as HTMLButtonElement | null;
    const subscribeButton = actions.querySelector('[data-subscribe]') as HTMLButtonElement | null;
    const add = (goCart: boolean) => {
      const quantity = getQty();
      addToCart({ productId: product.id, slug: slugFor(product), name: product.name, price: Number(product.sellingPrice ?? 0), currency: product.currency || 'INR', imageUrl: product.imageUrl }, quantity);
      if (addButton) { addButton.textContent = goCart ? 'Added' : 'Added to cart'; addButton.disabled = true; window.setTimeout(() => { if (addButton) { addButton.textContent = 'Add to cart'; addButton.disabled = false; } }, 900); }
      if (goCart) window.location.href = '/cart';
    };
    addButton?.addEventListener('click', () => add(false));
    buyButton?.addEventListener('click', () => add(true));
    subscribeButton?.addEventListener('click', () => { sessionStorage.setItem('seedlings_subscription_product', JSON.stringify({ productId: product.id, quantity: getQty() })); window.location.href = '/subscriptions'; });
  }
}

export default function CatalogueHydrator({ page, slug, children }: { page: Page; slug?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    void (async () => {
      try {
        const products = await getActiveSalesProducts();
        if (page === 'microgreens') applyMicrogreens(root, products);
        else if (slug) applyProduct(root, products, slug);
      } catch (error) {
        console.error('Salable Products load failed', error);
        renderError(root, page === 'product');
      }
    })();
  }, [page, slug]);
  return <div ref={ref}>{children}</div>;
}
