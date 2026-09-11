"use client";
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getCart, removeFromCart, setCartQuantity, type CartItem } from '@/lib/cart';
import { db } from '@/lib/firebase';
import { isSubscriptionEligible, type SalesProductComponent } from '@/lib/salesProducts';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money = (v: number, currency='INR') => { try { return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:0}).format(v); } catch { return `₹${v}`; } };

type PurchaseMode = 'one-time' | 'subscription';
type SubscriptionPlan = { id: string; name?: string; frequency?: string; price?: number; deliveriesPerTerm?: number | string; active?: boolean };

type SalesMeta = { subscriptionPurchase?: boolean; oneTimePurchase?: boolean; active?: boolean; type?: 'single' | 'multiple'; components?: SalesProductComponent[]; mrp?: number; sellingPrice?: number; currency?: string };

function customerStorageSuffix() {
  if (typeof window === 'undefined') return 'guest';
  return window.localStorage.getItem('seedlings_customer_mobile') || 'guest';
}
function modeKey(productId: string) { return `seedlings_cart_mode:${customerStorageSuffix()}:${productId}`; }
function planKey(productId: string) { return `seedlings_cart_plan:${customerStorageSuffix()}:${productId}`; }

export default function CartHydrator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [salesMeta, setSalesMeta] = useState<Record<string, SalesMeta>>({});
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getDocs(query(collection(db, 'salesProducts'), where('active', '==', true))),
      getDocs(query(collection(db, 'subscriptionPlans'), where('active', '==', true))),
    ]).then(([salesSnap, plansSnap]) => {
      if (!alive) return;
      const sales: Record<string, SalesMeta> = {};
      salesSnap.docs.forEach((doc) => { sales[doc.id] = doc.data() as SalesMeta; });
      setSalesMeta(sales);
      setPlans(plansSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as SubscriptionPlan)
        .filter((p) => p.active !== false && ['monthly', 'quarterly'].includes(String(p.frequency))));
    }).catch((error) => {
      console.warn('Cart subscription options could not be loaded', error);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const root = ref.current; if (!root) return;
    const render = () => {
      const items = getCart();
      const list = root.querySelector('.cart-list') as HTMLElement | null;
      const summary = root.querySelector('.summary') as HTMLElement | null;
      const purchaseMode = root.querySelector('.purchase-mode') as HTMLElement | null;
      if (!list || !summary) return;

      if (purchaseMode) {
        purchaseMode.innerHTML = `<strong>How would you like to buy?</strong><p class="muted" style="font-size:12px;margin:3px 0 12px">Choose one-time purchase or subscription for each product.</p>${plans.length ? '' : '<p class="muted" style="font-size:12px;margin:0">Subscription plans are currently unavailable.</p>'}`;
      }

      if (!items.length) {
        list.innerHTML = '<div class="cart-item"><div><strong>Your cart is empty</strong><p class="muted">Add fresh microgreens from the catalogue to get started.</p></div></div>';
      } else {
        list.innerHTML = items.map((item: CartItem) => {
          const meta = salesMeta[item.productId] || {};
          const canSubscribe = isSubscriptionEligible({ id: item.productId, name: item.name, currency: item.currency, sellingPrice: item.price, oneTimePurchase: meta.oneTimePurchase === true, subscriptionPurchase: meta.subscriptionPurchase === true, active: meta.active === true, type: meta.type, components: meta.components } as any);
          const mode = (localStorage.getItem(modeKey(item.productId)) || 'one-time') as PurchaseMode;
          const selectedPlan = localStorage.getItem(planKey(item.productId)) || '';
          const modeHtml = canSubscribe ? `<div class="purchase-mode" style="margin-top:12px;padding:10px"><div class="mode-options"><button type="button" class="mode-option ${mode === 'one-time' ? 'selected' : ''}" data-mode="one-time" data-product-id="${esc(item.productId)}"><strong>One-time purchase</strong><span>Buy this box once.</span></button><button type="button" class="mode-option ${mode === 'subscription' ? 'selected' : ''}" data-mode="subscription" data-product-id="${esc(item.productId)}"><strong>Subscribe</strong><span>Recurring delivery.</span></button></div>${mode === 'subscription' ? `<label style="display:block;margin-top:10px">Subscription plan<select data-plan data-product-id="${esc(item.productId)}"><option value="">${plans.length ? 'Choose a plan' : 'Plans unavailable — choose on next step'}</option>${plans.map((p) => `<option value="${esc(p.id)}" ${selectedPlan === p.id ? 'selected' : ''}>${esc(p.name || p.frequency)}${p.deliveriesPerTerm ? ` — ${esc(p.deliveriesPerTerm)} deliveries` : ''}</option>`).join('')}</select></label><button type="button" class="btn primary" data-subscribe-cart data-product-id="${esc(item.productId)}" style="margin-top:10px">Continue with subscription</button>` : ''}</div>` : '';
          const salePrice = Number(meta.sellingPrice ?? item.price ?? 0);
          const mrp = Number(meta.mrp ?? item.mrp ?? salePrice);
          const currency = meta.currency || item.currency || 'INR';
          const lineSaving = Math.max(0, mrp - salePrice) * item.quantity;
          const pricing = mrp > salePrice
            ? `<span class="price-stack"><span class="price-mrp">MRP ${esc(money(mrp, currency))}</span><strong class="price-sale">${esc(money(salePrice, currency))} each</strong></span>`
            : `<span class="price-stack"><strong class="price-sale">${esc(money(salePrice, currency))} each</strong></span>`;
          return `<div class="cart-item" data-cart-id="${esc(item.productId)}"><div class="cart-thumb"${item.imageUrl ? ` style="background-image:url('${esc(item.imageUrl)}');background-size:cover;background-position:center"` : ''}></div><div style="min-width:0"><strong>${esc(item.name)}</strong><div style="margin:4px 0 10px">${pricing}${lineSaving > 0 ? `<span class="price-saving">Save ${esc(money(lineSaving, currency))}</span>` : ''}</div><div class="qty"><button type="button" data-minus>−</button><strong data-qty>${item.quantity}</strong><button type="button" data-plus>+</button></div><button type="button" data-remove style="margin-top:8px;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline">Remove</button>${modeHtml}</div><span class="price">${esc(money(salePrice*item.quantity,currency))}</span></div>`;
        }).join('');
      }
      const total = items.reduce((sum, i) => { const meta = salesMeta[i.productId] || {}; return sum + Number(meta.sellingPrice ?? i.price ?? 0) * i.quantity; }, 0);
      const mrpTotal = items.reduce((sum, i) => { const meta = salesMeta[i.productId] || {}; const sale = Number(meta.sellingPrice ?? i.price ?? 0); const mrp = Number(meta.mrp ?? i.mrp ?? sale); return sum + Math.max(mrp, sale) * i.quantity; }, 0);
      const savings = Math.max(0, mrpTotal - total);
      const count = items.reduce((sum, i) => sum + i.quantity, 0);
      const currency = items[0]?.currency || 'INR';
      const itemRow = summary.querySelector('.summary-row');
      if (itemRow) itemRow.innerHTML = `<span>Items (${count})</span><span>${esc(money(total,currency))}</span>`;
      const savingsRow = summary.querySelector('.summary-saving') as HTMLElement | null;
      if (savingsRow) { savingsRow.innerHTML = savings > 0 ? `<span>You save</span><strong>${esc(money(savings,currency))}</strong>` : ''; savingsRow.style.display = savings > 0 ? '' : 'none'; }
      const totalRow = summary.querySelector('.summary-total');
      if (totalRow) totalRow.innerHTML = `<span>Total</span><span>${esc(money(total,currency))}</span>`;
      const checkout = summary.querySelector('a.btn.primary') as HTMLAnchorElement | null;
      if (checkout) { checkout.style.pointerEvents = items.length ? '' : 'none'; checkout.style.opacity = items.length ? '1' : '.5'; }

      root.querySelectorAll('[data-cart-id]').forEach((row) => {
        const id = (row as HTMLElement).dataset.cartId!;
        row.querySelector('[data-minus]')?.addEventListener('click', () => { const current=getCart().find(x=>x.productId===id)?.quantity||1; setCartQuantity(id,current-1); render(); });
        row.querySelector('[data-plus]')?.addEventListener('click', () => { const current=getCart().find(x=>x.productId===id)?.quantity||0; setCartQuantity(id,current+1); render(); });
        row.querySelector('[data-remove]')?.addEventListener('click', () => { removeFromCart(id); localStorage.removeItem(modeKey(id)); localStorage.removeItem(planKey(id)); render(); });
      });

      root.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => {
        const el = button as HTMLElement;
        const id = el.dataset.productId || '';
        const mode = (el.dataset.mode || 'one-time') as PurchaseMode;
        localStorage.setItem(modeKey(id), mode);
        if (mode === 'one-time') localStorage.removeItem(planKey(id));
        render();
      }));

      root.querySelectorAll('[data-plan]').forEach((select) => select.addEventListener('change', () => {
        const el = select as HTMLSelectElement;
        localStorage.setItem(planKey(el.dataset.productId || ''), el.value);
      }));

      root.querySelectorAll('[data-subscribe-cart]').forEach((button) => button.addEventListener('click', () => {
        const el = button as HTMLButtonElement;
        const id = el.dataset.productId || '';
        const item = getCart().find((x) => x.productId === id);
        if (!item) return;
        const planId = localStorage.getItem(planKey(id)) || '';
        sessionStorage.setItem('seedlings_subscription_product', JSON.stringify({ productId: item.productId, name: item.name, quantity: item.quantity }));
        if (planId) sessionStorage.setItem('seedlings_subscription_plan', planId);
        else sessionStorage.removeItem('seedlings_subscription_plan');
        window.location.href = '/subscriptions';
      }));
    };
    render();
    window.addEventListener('storage', render); window.addEventListener('seedlings-cart-updated', render);
    return () => { window.removeEventListener('storage', render); window.removeEventListener('seedlings-cart-updated', render); };
  }, [salesMeta, plans]);

  return <div ref={ref}>{children}</div>;
}
