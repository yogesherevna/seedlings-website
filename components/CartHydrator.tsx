"use client";
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getCart, removeFromCart, setCartQuantity, type CartItem } from '@/lib/cart';
import { db } from '@/lib/firebase';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money = (v: number, currency='INR') => { try { return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:0}).format(v); } catch { return `₹${v}`; } };

type PurchaseMode = 'one-time' | 'subscription';
type SubscriptionPlan = { id: string; name?: string; frequency?: string; price?: number; deliveriesPerTerm?: number | string; active?: boolean };

type SalesMeta = { subscriptionPurchase?: boolean; oneTimePurchase?: boolean };

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
          const canSubscribe = meta.subscriptionPurchase === true;
          const mode = (localStorage.getItem(modeKey(item.productId)) || 'one-time') as PurchaseMode;
          const selectedPlan = localStorage.getItem(planKey(item.productId)) || '';
          const modeHtml = canSubscribe ? `<div class="purchase-mode" style="margin-top:12px;padding:10px"><div class="mode-options"><button type="button" class="mode-option ${mode === 'one-time' ? 'selected' : ''}" data-mode="one-time" data-product-id="${esc(item.productId)}"><strong>One-time purchase</strong><span>Buy this box once.</span></button><button type="button" class="mode-option ${mode === 'subscription' ? 'selected' : ''}" data-mode="subscription" data-product-id="${esc(item.productId)}"><strong>Subscribe</strong><span>Recurring delivery.</span></button></div>${mode === 'subscription' ? `<label style="display:block;margin-top:10px">Subscription plan<select data-plan data-product-id="${esc(item.productId)}"><option value="">${plans.length ? 'Choose a plan' : 'Plans unavailable — choose on next step'}</option>${plans.map((p) => `<option value="${esc(p.id)}" ${selectedPlan === p.id ? 'selected' : ''}>${esc(p.name || p.frequency)}${p.deliveriesPerTerm ? ` — ${esc(p.deliveriesPerTerm)} deliveries` : ''}</option>`).join('')}</select></label><button type="button" class="btn primary" data-subscribe-cart data-product-id="${esc(item.productId)}" style="margin-top:10px">Continue with subscription</button>` : ''}</div>` : '';
          return `<div class="cart-item" data-cart-id="${esc(item.productId)}"><div class="cart-thumb"${item.imageUrl ? ` style="background-image:url('${esc(item.imageUrl)}');background-size:cover;background-position:center"` : ''}></div><div style="min-width:0"><strong>${esc(item.name)}</strong><p class="muted">${esc(money(item.price,item.currency))} each</p><div class="qty"><button type="button" data-minus>−</button><strong data-qty>${item.quantity}</strong><button type="button" data-plus>+</button></div><button type="button" data-remove style="margin-top:8px;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline">Remove</button>${modeHtml}</div><span class="price">${esc(money(item.price*item.quantity,item.currency))}</span></div>`;
        }).join('');
      }
      const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const count = items.reduce((sum, i) => sum + i.quantity, 0);
      const currency = items[0]?.currency || 'INR';
      const itemRow = summary.querySelector('.summary-row');
      if (itemRow) itemRow.innerHTML = `<span>Items (${count})</span><span>${esc(money(total,currency))}</span>`;
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
