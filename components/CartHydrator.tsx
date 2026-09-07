"use client";
import type React from 'react';
import { useEffect, useRef } from 'react';
import { getCart, removeFromCart, setCartQuantity, type CartItem } from '@/lib/cart';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money = (v: number, currency='INR') => { try { return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:0}).format(v); } catch { return `₹${v}`; } };

export default function CartHydrator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current; if (!root) return;
    const render = () => {
      const items = getCart();
      const list = root.querySelector('.cart-list') as HTMLElement | null;
      const summary = root.querySelector('.summary') as HTMLElement | null;
      if (!list || !summary) return;
      if (!items.length) {
        list.innerHTML = '<div class="cart-item"><div><strong>Your cart is empty</strong><p class="muted">Add fresh microgreens from the catalogue to get started.</p></div></div>';
      } else {
        list.innerHTML = items.map((item: CartItem) => `<div class="cart-item" data-cart-id="${esc(item.productId)}"><div class="cart-thumb"${item.imageUrl ? ` style="background-image:url('${esc(item.imageUrl)}');background-size:cover;background-position:center"` : ''}></div><div><strong>${esc(item.name)}</strong><p class="muted">${esc(money(item.price,item.currency))} each</p><div class="qty"><button type="button" data-minus>−</button><strong data-qty>${item.quantity}</strong><button type="button" data-plus>+</button></div><button type="button" data-remove style="margin-top:8px;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline">Remove</button></div><span class="price">${esc(money(item.price*item.quantity,item.currency))}</span></div>`).join('');
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
        row.querySelector('[data-remove]')?.addEventListener('click', () => { removeFromCart(id); render(); });
      });
    };
    render();
    window.addEventListener('storage', render); window.addEventListener('seedlings-cart-updated', render);
    return () => { window.removeEventListener('storage', render); window.removeEventListener('seedlings-cart-updated', render); };
  }, []);
  return <div ref={ref}>{children}</div>;
}
