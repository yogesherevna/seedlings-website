"use client";

import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getStoredCustomerMobile } from "@/lib/clientOnboarding";
import { getCustomerAccount, type CustomerAddress } from "@/lib/customerAccount";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));

const money = (v: unknown) =>
  `₹${Number(v || 0).toLocaleString("en-IN")}`;

async function api(path: string, options?: RequestInit) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : "";
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
}

const addressText = (a: CustomerAddress) =>
  [a.addressLine1, a.addressLine2, a.landmark, a.city, a.state, a.pincode]
    .filter(Boolean).join(", ");

function renderPlans(plans: any[], selectedPlanId: string) {
  if (!plans.length) {
    return `<div class="panel"><h3>Available plans</h3><p class="muted">No active subscription plans are available.</p></div>`;
  }
  return `<div class="panel"><h3>Available plans</h3><div class="plan-grid">${
    plans.map((p) => `
      <div class="plan-card ${selectedPlanId === String(p.id) ? "active" : ""}">
        <h4>${esc(p.name || p.frequency)}</h4>
        <strong>${money(p.price)}</strong>
        <small>${esc(p.deliveriesPerTerm || "")}${p.deliveriesPerTerm ? " deliveries" : ""} · Saturday</small>
        <button class="btn ${selectedPlanId === String(p.id) ? "primary" : "outline"}"
          type="button" data-choose="${esc(p.id)}" style="margin-top:12px">Choose</button>
      </div>`).join("")
  }</div></div>`;
}

export default function SubscriptionHydrator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let dead = false;

    const main = () => root.querySelector(".account-main") as HTMLElement | null;
    const message = (text: string, error = false) => {
      const el = root.querySelector("[data-message]") as HTMLElement | null;
      if (el) { el.textContent = text; el.style.color = error ? "crimson" : ""; }
    };

    const renderSignedOut = () => {
      const m = main();
      if (m) m.innerHTML = `<div class="account-title"><div><div class="eyebrow">Subscriptions</div><h1>My Subscription</h1><p class="muted">Sign in to manage your recurring microgreens plan.</p></div></div><div class="panel"><h3>Sign in to continue</h3><p class="muted">Use your mobile number and OTP from the Account page.</p><a class="btn primary" href="/account">Go to Account</a></div>`;
    };

    const renderLoading = () => {
      const m = main();
      if (m) m.innerHTML = `<div class="account-title"><div><div class="eyebrow">Subscriptions</div><h1>My Subscription</h1><p class="muted">Loading your subscription details…</p></div></div><div class="panel"><p class="muted">Please wait while we load your account.</p></div>`;
    };

    async function load(userPresent = Boolean(auth.currentUser)) {
      const mobile = getStoredCustomerMobile();
      if (!userPresent || !mobile) {
        renderSignedOut();
        return;
      }

      try {
        // Customer website reads shared Firestore data through its own Firebase
        // Web SDK. This keeps customer reads independent from the Admin Portal
        // API and avoids requiring Firebase Admin credentials in the website.
        const [plansSnapshot, subsSnapshot, account] = await Promise.all([
          getDocs(query(collection(db, "subscriptionPlans"), where("active", "==", true))),
          getDocs(query(collection(db, "subscriptions"), where("customerId", "==", mobile))),
          getCustomerAccount(mobile),
        ]);

        const plans = plansSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((p: any) => ["monthly", "quarterly"].includes(String(p.frequency)));
        const subs = subsSnapshot.docs.map((doc): Record<string, unknown> => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
        const addresses = account?.addresses || [];

        let selectedProduct: any = null;
        try {
          selectedProduct = JSON.parse(sessionStorage.getItem("seedlings_subscription_product") || "null");
        } catch {}

        const selectedPlanId = sessionStorage.getItem("seedlings_subscription_plan") || "";
        const m = main();
        if (!m) return;

        const plansHtml = renderPlans(plans, selectedPlanId);

        const active = (subs.find((s: any) => s.status === "active") || subs[0]) as Record<string, unknown> | undefined;
        const currentHtml = active ? `
          <div class="panel">
            <h3>${esc(active.productName)}</h3>
            <div class="order-meta">${esc(active.sellingOptionLabel)} × ${esc(active.quantity)} · ${esc(active.frequency)} · Saturday delivery</div>
            <div class="kpi-grid" style="margin-top:16px">
              <div class="kpi"><small>Plan</small><strong>${esc(active.frequency)}</strong></div>
              <div class="kpi"><small>Deliveries</small><strong>${esc(active.totalDeliveries ?? "—")}</strong></div>
              <div class="kpi"><small>Remaining</small><strong>${esc(active.totalDeliveries != null ? Math.max(0, Number(active.totalDeliveries) - Number(active.deliveriesGenerated || 0)) : "—")}</strong></div>
            </div>
            <div class="actions">
              <a class="btn primary" href="/delivery-calendar">View delivery calendar</a>
              ${active.status === "active" ? `<button class="btn outline" data-status="paused" data-id="${esc(active.id)}">Pause</button>` : ""}
              ${active.status === "paused" ? `<button class="btn primary" data-status="active" data-id="${esc(active.id)}">Resume</button>` : ""}
              ${["active","paused"].includes(String(active.status)) ? `<button class="btn outline" data-status="cancelled" data-id="${esc(active.id)}">Cancel</button>` : ""}
            </div>
          </div>` : "";

        const startHtml = selectedProduct ? `
          <div class="panel">
            <h3>Start subscription</h3>
            <p class="muted">Product: <strong>${esc(selectedProduct.name || selectedProduct.productName)}</strong></p>
            <label>Delivery address
              <select data-address>
                ${addresses.map((a: any) => `<option value="${esc(a.id || "")}">${esc(a.label || "Address")} — ${esc(addressText(a))}</option>`).join("")}
              </select>
            </label>
            <label style="margin-top:12px">Packs per delivery
              <input data-quantity type="number" min="1" step="1" value="${Math.max(1, Number(selectedProduct.quantity || 1))}">
            </label>
            <label style="margin-top:12px">Start date
              <input data-start type="date" value="${new Date().toISOString().slice(0,10)}">
            </label>
            <p class="muted" style="font-size:12px;margin-top:10px">Delivery is Saturday. Monthly and Quarterly are the configured customer subscription plans.</p>
            <button class="btn primary" data-create type="button" style="margin-top:12px">Create Subscription</button>
          </div>` : "";

        const myHtml = `<div class="panel"><h3>My Subscriptions</h3>${
          subs.length ? subs.map((s: any) => `
            <div class="panel" style="margin:12px 0 0">
              <div class="account-title">
                <div><h3>${esc(s.productName)}</h3><div class="order-meta">${esc(s.sellingOptionLabel)} × ${esc(s.quantity)} · ${esc(s.frequency)} · Saturday delivery</div></div>
                <span class="status ${s.status === "active" ? "delivered" : ""}">${esc(String(s.status || "").toUpperCase())}</span>
              </div>
              <p class="muted">Next delivery: <strong>${esc(s.nextDeliveryDate || "—")}</strong></p>
              <div class="actions">
                ${s.status === "active" ? `<button class="btn outline" data-status="paused" data-id="${esc(s.id)}">Pause</button>` : ""}
                ${s.status === "paused" ? `<button class="btn primary" data-status="active" data-id="${esc(s.id)}">Resume</button>` : ""}
                ${["active","paused"].includes(String(s.status)) ? `<button class="btn outline" data-status="cancelled" data-id="${esc(s.id)}">Cancel</button>` : ""}
              </div>
            </div>`).join("") : `<p class="muted">No subscriptions yet.</p>`
        }</div>`;

        m.innerHTML = `
          <div class="account-title">
            <div><div class="eyebrow">Subscriptions</div><h1>My Subscription</h1><p class="muted">Your recurring microgreens plan and delivery schedule.</p></div>
            <span class="status delivered">${active ? "ACTIVE" : "NO ACTIVE PLAN"}</span>
          </div>
          <p data-message style="font-size:13px;min-height:20px"></p>
          ${currentHtml}
          ${startHtml}
          ${plansHtml}
          ${myHtml}`;

        const rootEl = ref.current;
        if (!rootEl) return;

        rootEl.querySelectorAll("[data-choose]").forEach((b) => b.addEventListener("click", () => {
          const id = (b as HTMLElement).dataset.choose || "";
          sessionStorage.setItem("seedlings_subscription_plan", id);
          void load();
          message("Plan selected.");
        }));

        rootEl.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", async () => {
          const el = b as HTMLButtonElement;
          el.disabled = true;
          try {
            const r = await api("/api/customer/subscriptions", {
              method: "PATCH",
              body: JSON.stringify({ mobile, id: el.dataset.id, status: el.dataset.status }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || "Unable to update subscription.");
            await load();
          } catch (e) {
            message(e instanceof Error ? e.message : "Unable to update subscription.", true);
            el.disabled = false;
          }
        }));

        rootEl.querySelector("[data-create]")?.addEventListener("click", async () => {
          const planId = sessionStorage.getItem("seedlings_subscription_plan") || "";
          const addressId = (rootEl.querySelector("[data-address]") as HTMLSelectElement | null)?.value || "";
          const quantity = Number((rootEl.querySelector("[data-quantity]") as HTMLInputElement | null)?.value || 1);
          const startDate = (rootEl.querySelector("[data-start]") as HTMLInputElement | null)?.value || "";
          if (!planId) return message("Choose a subscription plan first.", true);
          if (!addressId) return message("Add a delivery address in My Account first.", true);
          const button = rootEl.querySelector("[data-create]") as HTMLButtonElement;
          button.disabled = true;
          button.textContent = "Creating…";
          try {
            const r = await api("/api/customer/subscriptions", {
              method: "POST",
              body: JSON.stringify({
                mobile, productId: selectedProduct.productId, planId, addressId, quantity, startDate,
              }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || "Unable to create subscription.");
            sessionStorage.removeItem("seedlings_subscription_product");
            sessionStorage.removeItem("seedlings_subscription_plan");
            // A subscription is created from the selected product; do not leave
            // the cart's subscription mode/plan state suggesting it is pending.
            localStorage.removeItem(`seedlings_cart_mode_${selectedProduct.productId}`);
            localStorage.removeItem(`seedlings_cart_plan_${selectedProduct.productId}`);
            await load();
            message(`Subscription ${data.subscriptionNumber} created.`);
          } catch (e) {
            message(e instanceof Error ? e.message : "Unable to create subscription.", true);
            button.disabled = false;
            button.textContent = "Create Subscription";
          }
        });
      } catch (e) {
        if (!dead) {
          const m = main();
          if (m) m.innerHTML = `<div class="account-title"><div><div class="eyebrow">Subscriptions</div><h1>My Subscription</h1><p class="muted">Unable to load your subscription.</p></div></div><div class="panel"><p>${esc(e instanceof Error ? e.message : "Please try again later.")}</p><a class="btn outline" href="/account">Back to Account</a></div>`;
        }
      }
    }

    renderLoading();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (dead) return;
      void load(Boolean(user));
    });

    return () => {
      dead = true;
      unsubscribe();
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
