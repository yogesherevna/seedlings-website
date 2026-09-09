"use client";

import { useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { getStoredCustomerMobile } from '@/lib/clientOnboarding';

const CACHE_PREFIX = 'seedlings-customer-orders-v1:';
const CACHE_TTL_MS = 10 * 60 * 1000;

type Order = {
  id: string;
  orderNumber?: string;
  items?: Array<{ productName?: string; quantity?: number; weightGrams?: number }>;
  total?: number;
  status?: string;
  orderType?: string;
  scheduledDeliveryDate?: string;
  sourceSubscriptionDeliveryNumber?: number;
  createdAt?: unknown;
};

function esc(value: unknown) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c] || c)); }
function money(value: unknown) { return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function cacheKey(mobile: string) { return `${CACHE_PREFIX}${mobile}`; }
function readCache(mobile: string): Order[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(mobile));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || Date.now() - Number(entry.savedAt || 0) > CACHE_TTL_MS || !Array.isArray(entry.orders)) return null;
    return entry.orders;
  } catch { return null; }
}
function writeCache(mobile: string, orders: Order[]) {
  try { localStorage.setItem(cacheKey(mobile), JSON.stringify({ savedAt: Date.now(), orders })); } catch {}
}
function skeleton() { return Array.from({ length: 3 }, () => `<div class="order-row"><div style="flex:1"><div style="height:16px;width:120px;background:#eee7da;border-radius:8px"></div><div style="height:12px;width:65%;background:#eee7da;border-radius:8px;margin-top:10px"></div></div><div style="height:30px;width:90px;background:#eee7da;border-radius:16px"></div></div>`).join(''); }
function dateText(value: unknown) {
  const s = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  return s || 'Date unavailable';
}
function render(root: HTMLElement, orders: Order[]) {
  const panel = root.querySelector('[data-orders-panel]') as HTMLElement | null;
  if (!panel) return;
  if (!orders.length) { panel.innerHTML = `<div class="panel"><h3>No orders yet</h3><p class="muted">Your orders will appear here after you place your first order.</p><a class="btn primary" href="/microgreens">Shop Fresh</a></div>`; return; }
  panel.innerHTML = orders.map(order => {
    const items = Array.isArray(order.items) ? order.items : [];
    const summary = items.map(item => `${esc(item.productName || 'Product')} ${item.weightGrams ? `${esc(item.weightGrams)}g ` : ''}× ${esc(item.quantity || 1)}`).join(' · ');
    const status = String(order.status || 'pending').replace(/_/g, ' ').toUpperCase();
    const statusClass = String(order.status || '').toLowerCase() === 'delivered' ? 'delivered' : 'upcoming';
    return `<div class="order-row"><div><strong>${esc(order.orderNumber || order.id)}</strong><div class="order-meta">${esc(dateText(order.scheduledDeliveryDate || order.createdAt))} · ${summary || 'Order'} · ${esc(order.orderType === 'subscription' ? `Subscription${order.sourceSubscriptionDeliveryNumber ? ` delivery #${order.sourceSubscriptionDeliveryNumber}` : ''}` : 'One-time')} · ${money(order.total)}</div></div><span class="status ${statusClass}">${esc(status)}</span><a class="btn mini" href="/order-detail?order=${encodeURIComponent(order.id)}">View</a></div>`;
  }).join('');
}

export default function OrdersHydrator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let alive = true;
    const panel = root.querySelector('[data-orders-panel]') as HTMLElement | null;
    if (!panel) return;
    const load = async () => {
      const mobile = getStoredCustomerMobile();
      if (!mobile || !auth.currentUser) {
        panel.innerHTML = `<div class="panel"><h3>Sign in to view orders</h3><p class="muted">Sign in to see your real order history.</p><a class="btn primary" href="/account">Go to Account</a></div>`;
        return;
      }
      const cached = readCache(mobile);
      if (cached) { if (alive) render(root, cached); return; }
      panel.innerHTML = skeleton();
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(`/api/customer/orders?mobile=${encodeURIComponent(mobile)}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load orders.');
        const orders = Array.isArray(data.orders) ? data.orders : [];
        writeCache(mobile, orders);
        if (alive) render(root, orders);
      } catch (error) {
        if (alive) panel.innerHTML = `<div class="panel"><p class="muted">${esc(error instanceof Error ? error.message : 'Unable to load orders.')}</p></div>`;
      }
    };
    void load();
    return () => { alive = false; };
  }, []);
  return <div ref={ref}>{children}</div>;
}
