"use client";

import { useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getStoredCustomerMobile } from '@/lib/clientOnboarding';
import { getCustomerAccount, type CustomerAccount, type CustomerAddress } from '@/lib/customerAccount';
import { getCart, clearCart, type CartItem } from '@/lib/cart';
import { createCustomerOneTimeOrder } from '@/lib/customerOrders';
import { checkProductAvailability, nextWeekSaturday } from '@/lib/customerOrderAvailability';
import { getActiveSalesProducts, type SalesProduct } from '@/lib/salesProducts';
import { confirmHarvestShortage } from '@/lib/customerAlerts';

const CHECKOUT_KEY = 'seedlings_checkout_details';
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));
const money = (v: number, currency='INR') => { try { return new Intl.NumberFormat('en-IN', { style:'currency', currency, maximumFractionDigits:0 }).format(v); } catch { return `₹${v}`; } };
const addressText = (a: CustomerAddress) => [a.addressLine1, a.addressLine2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ');
const renderLoading = (root: HTMLElement) => { root.innerHTML = `<section class="section"><div class="container checkout-grid"><div class="form"><div class="skeleton" style="height:14px;width:150px;margin-bottom:12px"></div><div class="skeleton" style="height:32px;width:260px;margin-bottom:24px"></div><div class="skeleton" style="height:46px;margin-bottom:14px"></div><div class="skeleton" style="height:46px;margin-bottom:22px"></div><div class="skeleton" style="height:22px;width:180px;margin-bottom:12px"></div><div class="skeleton" style="height:52px;margin-bottom:14px"></div><div class="skeleton" style="height:52px;margin-bottom:14px"></div><div class="skeleton" style="height:48px"></div></div><aside class="summary"><div class="skeleton" style="height:24px;width:160px;margin-bottom:18px"></div><div class="skeleton" style="height:18px;margin-bottom:12px"></div><div class="skeleton" style="height:18px;margin-bottom:12px"></div><div class="skeleton" style="height:18px"></div></aside></div></section>`; };

export default function CheckoutHydrator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current; if (!root) return;
    let stopped = false;
    renderLoading(root);
    const message = (text: string, error = false) => { const el = root.querySelector('.checkout-message') as HTMLElement | null; if (el) { el.textContent = text; el.style.color = error ? 'crimson' : ''; } };
    const renderSignedOut = () => { root.innerHTML = `<section class="auth-wrap"><div class="auth-card"><span class="eyebrow">Checkout</span><h1>Sign in to continue</h1><p>Please sign in with your mobile number before confirming your delivery details.</p><a class="btn primary" style="width:100%;text-align:center" href="/account">Go to Account Login</a></div></section>`; };
    const renderEmptyCart = () => { root.innerHTML = `<section class="auth-wrap"><div class="auth-card"><span class="eyebrow">Checkout</span><h1>Your cart is empty</h1><p>Add a Salable Product to your cart before checkout.</p><a class="btn primary" style="width:100%;text-align:center" href="/microgreens">Browse Microgreens</a></div></section>`; };
    const render = (mobile: string, account: CustomerAccount, cart: CartItem[], products: SalesProduct[]) => {
      const saved = (() => { try { return JSON.parse(sessionStorage.getItem(CHECKOUT_KEY) || 'null'); } catch { return null; } })();
      const addresses = account.addresses || [];
      const selectedId = saved?.addressId && addresses.some(a => a.id === saved.addressId) ? saved.addressId : (addresses[0]?.id || '');
      const selected = addresses.find(a => a.id === selectedId);
      const priced = cart.map((item) => { const product = products.find((p) => p.id === item.productId); const salePrice = Number(product?.sellingPrice ?? item.price ?? 0); const mrp = Number(product?.mrp ?? item.mrp ?? salePrice); return { item, salePrice, mrp: Math.max(mrp, salePrice), currency: product?.currency || item.currency || 'INR' }; });
      const subtotal = priced.reduce((sum, x) => sum + x.salePrice * x.item.quantity, 0);
      const mrpSubtotal = priced.reduce((sum, x) => sum + x.mrp * x.item.quantity, 0);
      const savings = Math.max(0, mrpSubtotal - subtotal);
      const count = cart.reduce((sum, item) => sum + item.quantity, 0);
      const currency = priced[0]?.currency || cart[0]?.currency || 'INR';
      root.innerHTML = `<section class="section"><div class="container checkout-grid"><div class="form">
        <span class="eyebrow">Delivery details</span><h2 style="margin-top:8px">Confirm your delivery</h2>
        <label>Name<input data-name value="${esc(saved?.name || account.name || '')}" placeholder="Full name"></label>
        <label>Mobile<input data-mobile value="${esc(mobile)}" disabled></label>
        <h3 style="margin:22px 0 12px">Delivery address</h3>
        ${addresses.length ? `<label>Saved address<select data-address>${addresses.map((a) => `<option value="${esc(a.id || '')}" ${a.id === selectedId ? 'selected' : ''}>${esc(a.label || 'Address')} — ${esc(addressText(a))}</option>`).join('')}</select></label><div data-selected-address style="background:#faf7f1;border:1px solid #ddd2be;border-radius:14px;padding:13px;margin:8px 0 16px;font-size:13px">${esc(selected ? addressText(selected) : '')}</div>` : `<p class="muted" style="font-size:13px">No saved address found. Add an address from <a href="/addresses" style="text-decoration:underline">My Addresses</a> before checkout.</p>`}
        <h3 style="margin:22px 0 12px">Delivery slot</h3><label>Weekend slot<select data-slot><option value="">Select a Saturday delivery slot</option><option value="Saturday morning">Saturday morning — ${nextWeekSaturday()}</option><option value="Saturday evening">Saturday evening — ${nextWeekSaturday()}</option></select></label>
        <h3 style="margin:22px 0 12px">Payment</h3><label>Payment method<select data-payment><option value="online">Online payment</option></select></label>
        <p class="checkout-message" style="font-size:13px;min-height:18px;margin-top:12px"></p><button class="btn primary" style="width:100%" type="button" data-place>Place Order</button>
        <p class="muted" style="font-size:11px;margin-top:10px">Payment gateway processing is not connected yet. The order is created with payment status Pending.</p>
      </div><aside class="summary"><h3>Order summary</h3>${priced.map(({item, salePrice, mrp, currency}) => { const line = salePrice * item.quantity; const lineMrp = mrp * item.quantity; return `<div class="summary-row"><span>${esc(item.name)} × ${item.quantity}</span><span>${lineMrp > line ? `<span class="price-mrp">${esc(money(lineMrp,currency))}</span> ` : ''}<strong>${esc(money(line,currency))}</strong></span></div>`; }).join('')}<div class="summary-row"><span>Items (${count})</span><span>${esc(money(subtotal,currency))}</span></div>${savings > 0 ? `<div class="summary-row summary-saving"><span>You save</span><strong>${esc(money(savings,currency))}</strong></div>` : ''}<div class="summary-row"><span>Delivery</span><span>Calculated on order</span></div><div class="summary-row summary-total"><span>Items subtotal</span><span>${esc(money(subtotal,currency))}</span></div><p class="muted" style="font-size:11px">The configured active one-time delivery charge is applied when the order is created.</p></aside></div></section>`;
      const slot = root.querySelector('[data-slot]') as HTMLSelectElement | null; if (slot) slot.value = saved?.deliverySlot || '';
      const address = root.querySelector('[data-address]') as HTMLSelectElement | null; const preview = root.querySelector('[data-selected-address]') as HTMLElement | null;
      address?.addEventListener('change', () => { const a = addresses.find(x => x.id === address.value); if (preview) preview.textContent = a ? addressText(a) : ''; });
      root.querySelector('[data-place]')?.addEventListener('click', async () => {
        const name = (root.querySelector('[data-name]') as HTMLInputElement | null)?.value.trim() || ''; const addressId = address?.value || ''; const deliverySlot = slot?.value || ''; const paymentMethod = (root.querySelector('[data-payment]') as HTMLSelectElement | null)?.value || 'online';
        if (!name) return message('Enter your name.', true); if (!addressId) return message('Select a saved delivery address.', true); if (!deliverySlot) return message('Select a weekend delivery slot.', true);
        const button = root.querySelector('[data-place]') as HTMLButtonElement | null; if (button) { button.disabled = true; button.textContent = 'Checking availability…'; }
        try {
          if (!auth.currentUser) throw new Error('Your login session has expired. Please sign in again.');
          const currentCart = getCart();
          const salesProducts = await getActiveSalesProducts();
          const targetDate = nextWeekSaturday();
          const results = await Promise.all(currentCart.map(async (item) => {
            const product = salesProducts.find((p) => p.id === item.productId);
            if (!product) throw new Error(`Product "${item.name}" is no longer available.`);
            return { item, result: await checkProductAvailability({ product, quantity: item.quantity, deliveryDate: targetDate }) };
          }));
          const shortages = results.filter(({ result }) => result.hasShortage);
          let shortageDecision: 'continue' | 'contact' | undefined;
          if (shortages.length) {
            const availableGrams = Math.min(...shortages.map(({ result }) => result.availableGrams));
            const requestedGrams = shortages.reduce((sum, { result }) => sum + result.requestedGrams, 0);
            const shortageGrams = shortages.reduce((sum, { result }) => sum + result.shortageGrams, 0);
            shortageDecision = await confirmHarvestShortage({ mode: 'one-time', availableGrams, requestedGrams, shortageGrams });
          }
          if (button) button.textContent = 'Placing Order…';
          const result = await createCustomerOneTimeOrder({ mobile, addressId, deliverySlot, paymentMethod, shortageDecision, items: currentCart.map(i => ({ productId: i.productId, quantity: i.quantity })) });
          sessionStorage.setItem('seedlings_last_order', JSON.stringify(result)); clearCart(); window.location.href = `/order-success?order=${encodeURIComponent(result.orderNumber)}`;
        } catch (error) { message(error instanceof Error ? error.message : 'Unable to create order.', true); if (button) { button.disabled = false; button.textContent = 'Place Order'; } }
      });
    };
    const start = async (present: boolean) => { const mobile = getStoredCustomerMobile(); if (!present || !mobile) return renderSignedOut(); const cart = getCart(); if (!cart.length) return renderEmptyCart(); try { const account = await getCustomerAccount(mobile); if (!account) throw new Error('Customer account not found.'); let products: SalesProduct[] = []; try { products = await getActiveSalesProducts(); } catch (e) { console.warn('Checkout product pricing could not be loaded', e); } render(mobile, account, cart, products); } catch (e) { console.error(e); renderSignedOut(); } };
    // Wait for Firebase to restore the auth session before deciding whether the customer is signed in.
    // This prevents the checkout page from flashing the sign-in screen on initial load.
    const unsubscribe = onAuthStateChanged(auth, user => { void start(Boolean(user)); });
    const onCart = () => { void start(Boolean(auth.currentUser)); }; window.addEventListener('seedlings-cart-updated', onCart);
    return () => { stopped = true; unsubscribe(); window.removeEventListener('seedlings-cart-updated', onCart); };
  }, []);
  return <div ref={ref}>{children}</div>;
}
