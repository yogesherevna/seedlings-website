"use client";
import { useEffect, useRef } from 'react';
export default function OrderSuccessHydrator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current; if (!root) return;
    try {
      const params = new URLSearchParams(window.location.search); const number = params.get('order');
      const saved = JSON.parse(sessionStorage.getItem('seedlings_last_order') || 'null');
      const orderNumber = number || saved?.orderNumber || '';
      const payment = saved?.paymentStatus === 'paid' ? 'Paid' : 'Pending';
      const target = root.querySelector('[data-order-number]') as HTMLElement | null; if (target) target.textContent = orderNumber || 'Order placed';
      const paymentTarget = root.querySelector('[data-payment-status]') as HTMLElement | null; if (paymentTarget) paymentTarget.textContent = payment;
    } catch {}
  }, []);
  return <div ref={ref}>{children}</div>;
}
