"use client";

import { useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getStoredCustomerMobile } from '@/lib/clientOnboarding';

type OrderItem = {
  productName?: string;
  quantity?: number;
  weightGrams?: number;
};

type Order = {
  id: string;
  orderNumber?: string;
  items?: OrderItem[];
  total?: number;
  status?: string;
  orderType?: string;
  scheduledDeliveryDate?: string;
  sourceSubscriptionDeliveryNumber?: number;
  createdAt?: string;
};

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c] || c));
}

function money(value: unknown) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function skeleton() {
  return Array.from({ length: 3 }, () => `<div class="order-row"><div style="flex:1"><div style="height:16px;width:120px;background:#eee7da;border-radius:8px"></div><div style="height:12px;width:65%;background:#eee7da;border-radius:8px;margin-top:10px"></div></div><div style="height:30px;width:90px;background:#eee7da;border-radius:16px"></div></div>`).join('');
}

function dateObject(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object') {
    const timestamp = value as { toDate?: () => Date; seconds?: number };
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
  }
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateText(value: unknown) {
  const date = dateObject(value);
  if (date) return date.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  const s = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  }
  return s || 'Date unavailable';
}

function render(root: HTMLElement, orders: Order[]) {
  const panel = root.querySelector('[data-orders-panel]') as HTMLElement | null;
  if (!panel) return;

  if (!orders.length) {
    panel.innerHTML = `<div class="panel"><h3>No orders yet</h3><p class="muted">Your orders will appear here after you place your first order.</p><a class="btn primary" href="/microgreens">Shop Fresh</a></div>`;
    return;
  }

  panel.innerHTML = orders.map(order => {
    const items = Array.isArray(order.items) ? order.items : [];
    const summary = items.map(item => `${esc(item.productName || 'Product')} ${item.weightGrams ? `${esc(item.weightGrams)}g ` : ''}× ${esc(item.quantity || 1)}`).join(' · ');
    const status = String(order.status || 'pending').replace(/_/g, ' ').toUpperCase();
    const statusClass = String(order.status || '').toLowerCase() === 'delivered' ? 'delivered' : 'upcoming';
    const type = order.orderType === 'subscription'
      ? `Subscription${order.sourceSubscriptionDeliveryNumber ? ` delivery #${order.sourceSubscriptionDeliveryNumber}` : ''}`
      : 'One-time';

    return `<div class="order-row"><div><strong>${esc(order.orderNumber || order.id)}</strong><div class="order-meta">${esc(dateText(order.scheduledDeliveryDate || order.createdAt))} · ${summary || 'Order'} · ${esc(type)} · ${money(order.total)}</div></div><span class="status ${statusClass}">${esc(status)}</span><a class="btn mini" href="/order-detail?order=${encodeURIComponent(order.id)}">View</a></div>`;
  }).join('');
}

export default function OrdersHydrator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let alive = true;
    let requestId = 0;
    const panel = root.querySelector('[data-orders-panel]') as HTMLElement | null;
    if (!panel) return;

    const renderSignedOut = () => {
      panel.innerHTML = `<div class="panel"><h3>Sign in to view orders</h3><p class="muted">Sign in to see your real order history.</p><a class="btn primary" href="/account">Go to Account</a></div>`;
    };

    const load = async (userPresent: boolean) => {
      const currentRequest = ++requestId;
      const mobile = getStoredCustomerMobile();

      if (!userPresent || !mobile) {
        if (alive && currentRequest === requestId) renderSignedOut();
        return;
      }

      panel.innerHTML = skeleton();

      try {
        const user = auth.currentUser;
        if (!user) return;

        // My Orders belongs to the customer website, so read the shared
        // Firestore data through the website's Firebase Web SDK. Do not call
        // the Admin Portal API or require Firebase Admin credentials just to
        // render a customer's order history.
        const snapshot = await getDocs(
          query(collection(db, 'orders'), where('customerId', '==', mobile))
        );
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        orders.sort((a, b) => (dateObject(b.createdAt)?.getTime() || 0) - (dateObject(a.createdAt)?.getTime() || 0));
        if (alive && currentRequest === requestId) render(root, orders);
      } catch (error) {
        if (!alive || currentRequest !== requestId) return;
        panel.innerHTML = `<div class="panel"><p class="muted">${esc(error instanceof Error ? error.message : 'Unable to load orders.')}</p></div>`;
      }
    };

    // Do not read auth.currentUser once at mount. Firebase restores the
    // anonymous session asynchronously, so the old implementation could
    // incorrectly render the sign-in state for an already logged-in customer.
    const unsubscribe = onAuthStateChanged(auth, user => {
      void load(Boolean(user));
    });

    return () => {
      alive = false;
      requestId += 1;
      unsubscribe();
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
