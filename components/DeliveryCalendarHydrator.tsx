"use client";

import { useEffect, useRef } from "react";
import { collection, getDocsFromServer, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getStoredCustomerMobile } from "@/lib/clientOnboarding";

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object") {
    const v = value as { toDate?: () => Date; seconds?: number };
    if (typeof v.toDate === "function") return v.toDate();
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
  }
  const s = String(value);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateOnly(value: unknown) {
  const d = parseDate(value);
  return d ? d.toISOString().slice(0, 10) : "";
}

function longDate(value: unknown) {
  const d = parseDate(value);
  return d ? d.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "—";
}

function monthTitle(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function renderSignedOut(root: HTMLElement) {
  const main = root.querySelector(".account-main") as HTMLElement | null;
  if (!main) return;
  main.innerHTML = `<div class="account-title"><div><div class="eyebrow">Subscription delivery</div><h1>Delivery Calendar</h1><p class="muted">Sign in to view your delivery schedule.</p></div></div><div class="panel"><h3>Sign in to continue</h3><p class="muted">There are no customer deliveries to display until you sign in.</p><a class="btn primary" href="/account">Go to Account</a></div>`;
}

function renderNoSubscription(root: HTMLElement) {
  const main = root.querySelector(".account-main") as HTMLElement | null;
  if (!main) return;
  main.innerHTML = `<div class="account-title"><div><div class="eyebrow">Subscription delivery</div><h1>Delivery Calendar</h1><p class="muted">Your scheduled subscription deliveries will appear here.</p></div><span class="status">NO ACTIVE PLAN</span></div><div class="panel"><h3>No active subscription</h3><p class="muted">There are no scheduled subscription deliveries for this customer.</p><a class="btn primary" href="/microgreens">Shop Fresh</a></div>`;
}

export default function DeliveryCalendarHydrator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let alive = true;

    const load = async () => {
      const mobile = getStoredCustomerMobile();
      if (!mobile) { renderSignedOut(root); return; }

      try {
        // Always read the server so an old browser/offline Firestore cache cannot
        // make another customer's subscription appear in this customer's calendar.
        const snapshot = await getDocsFromServer(
          query(collection(db, "subscriptions"), where("customerId", "==", mobile)),
        );
        if (!alive) return;

        const subscriptions = snapshot.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
          .filter((s: any) => String(s.customerId ?? "").replace(/\D/g, "") === mobile) as any[];

        const active = subscriptions.find((s) => s.status === "active");
        const paused = subscriptions.find((s) => s.status === "paused");
        const subscription = active || paused;
        if (!subscription) { renderNoSubscription(root); return; }

        const main = root.querySelector(".account-main") as HTMLElement | null;
        if (!main) return;

        const next = dateOnly(subscription.nextDeliveryDate);
        const nextDate = parseDate(subscription.nextDeliveryDate);
        const calendarMonth = nextDate || new Date();
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const startOffset = (firstDay.getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: string[] = [];
        for (let i = 0; i < startOffset; i++) cells.push("<div></div>");
        for (let day = 1; day <= daysInMonth; day++) {
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isNext = iso === next;
          cells.push(`<div class="${isNext ? "calendar-date" : ""}"><b>${day}</b>${isNext ? `<span class="status upcoming">UPCOMING</span>` : ""}</div>`);
        }

        main.innerHTML = `<div class="account-title"><div><div class="eyebrow">Subscription delivery</div><h1>Delivery Calendar</h1><p class="muted">Your actual subscription delivery schedule.</p></div><span class="status ${active ? "upcoming" : ""}">${active ? "ACTIVE" : "PAUSED"}</span></div>
          <div class="panel"><div class="calendar-head"><h3 style="margin:0">${esc(monthTitle(calendarMonth))}</h3></div>
            <div class="calendar-grid"><div class="day-name">Mon</div><div class="day-name">Tue</div><div class="day-name">Wed</div><div class="day-name">Thu</div><div class="day-name">Fri</div><div class="day-name">Sat</div><div class="day-name">Sun</div>${cells.join("")}</div>
            <div class="delivery-actions"><span class="status upcoming">● Next delivery</span></div>
          </div>
          <div class="panel"><h3>Next upcoming delivery</h3><div class="order-row"><div><strong>${esc(longDate(subscription.nextDeliveryDate))}</strong><div class="order-meta">${esc(subscription.productName || "Subscription")} · ${esc(subscription.sellingOptionLabel || "")} × ${esc(subscription.quantity || 1)} · Saturday delivery</div></div><span class="status upcoming">UPCOMING</span></div></div>`;
      } catch (error) {
        if (!alive) return;
        const main = root.querySelector(".account-main") as HTMLElement | null;
        if (main) main.innerHTML = `<div class="account-title"><div><div class="eyebrow">Subscription delivery</div><h1>Delivery Calendar</h1><p class="muted">Unable to load your delivery schedule.</p></div></div><div class="panel"><p class="muted">${esc(error instanceof Error ? error.message : "Unable to load delivery calendar.")}</p></div>`;
      }
    };

    void load();
    return () => { alive = false; };
  }, []);

  return <div ref={ref}>{children}</div>;
}
