"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { clearStoredCustomerMobile, ensureClientOnboarding, getStoredCustomerMobile, normalizeIndianMobile } from "@/lib/clientOnboarding";

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
}

function formatLongDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function packLabel(weightGrams: number, quantity: number) {
  if (!Number.isFinite(weightGrams) || !Number.isFinite(quantity) || quantity < 1) return "";
  const weight = weightGrams >= 1000 && weightGrams % 1000 === 0 ? `${weightGrams / 1000}kg` : `${weightGrams}g`;
  return `${weight} × ${quantity}`;
}

function renderLogin(root: HTMLElement) {
  root.innerHTML = `
    <main class="section">
      <div class="container">
        <section class="auth-wrap">
          <div class="auth-card">
            <span class="eyebrow">My Account</span>
            <h1>Welcome back</h1>
            <p>Sign in with your mobile number to view orders, addresses and subscriptions.</p>
            <label>Mobile number<input type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number" /></label>
            <a class="btn primary" href="#" data-account-login>Send OTP</a>
            <p class="auth-hint" style="text-align:center;margin-top:12px;font-size:13px">Demo OTP: <strong>1234</strong></p>
          </div>
        </section>
      </div>
    </main>`;

  const input = root.querySelector('input[type="tel"]') as HTMLInputElement | null;
  const action = root.querySelector('[data-account-login]') as HTMLAnchorElement | null;
  const card = root.querySelector('.auth-card') as HTMLElement | null;
  if (!input || !action || !card) return;

  let mobile = '';
  let expiresAt = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const stopTimer = () => { if (timer) clearInterval(timer); timer = null; };
  const message = (text: string) => {
    let el = card.querySelector('.auth-message') as HTMLElement | null;
    if (!el) { el = document.createElement('p'); el.className='auth-message'; el.style.cssText='margin-top:12px;text-align:center;font-size:13px'; card.appendChild(el); }
    el.textContent = text;
  };
  const showOtp = () => {
    stopTimer();
    expiresAt = Date.now() + 60000;
    const row=document.createElement('div'); row.className='account-otp-row'; row.style.marginTop='14px';
    row.innerHTML='<label>OTP<input type="text" inputmode="numeric" maxlength="4" placeholder="Enter 4-digit OTP"></label><p class="otp-timer" style="text-align:center;margin:10px 0;font-size:13px"></p><button class="btn outline" type="button" style="width:100%">Verify OTP</button>';
    card.insertBefore(row, action);
    const otp=row.querySelector('input') as HTMLInputElement;
    const verify=row.querySelector('button') as HTMLButtonElement;
    const timerText=row.querySelector('.otp-timer') as HTMLElement;
    const tick=()=>{ const r=Math.max(0,Math.ceil((expiresAt-Date.now())/1000)); timerText.textContent=r?`OTP expires in 0:${String(r).padStart(2,'0')}`:'OTP expired'; if(!r){stopTimer();otp.disabled=true;verify.disabled=true;} };
    timer=setInterval(tick,1000); tick();
    verify.addEventListener('click', async()=>{
      message(''); if(Date.now()>=expiresAt){message('OTP expired. Please request a new OTP.');return;}
      if(otp.value.trim()!=='1234'){message('Invalid OTP. Please enter 1234.');return;}
      verify.disabled=true; verify.textContent='Verifying…';
      try { await ensureClientOnboarding(mobile); if(!auth.currentUser) await signInAnonymously(auth); window.location.assign('/account'); }
      catch(e){ console.error('Customer login failed',e); message('Unable to complete login. Please check your connection.'); verify.disabled=false; verify.textContent='Verify OTP'; }
    });
  };
  action.addEventListener('click',(e)=>{
    e.preventDefault(); message('');
    const normalized=normalizeIndianMobile(input.value); if(!normalized){message('Enter a valid 10-digit Indian mobile number.');return;}
    mobile=normalized; action.textContent='OTP sent'; showOtp();
  });
  action.removeAttribute('href'); action.style.cursor='pointer';
}

export default function AccountHydrator({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let alive = true;

    const wireAccountActions = () => {
      const side = root.querySelector(".account-side") as HTMLElement | null;
      if (!side || root.querySelector("[data-account-logout]")) return;

      const logout = document.createElement("button");
      logout.type = "button";
      logout.dataset.accountLogout = "true";
      logout.className = "account-logout";
      logout.textContent = "↪ Logout";
      logout.setAttribute("aria-label", "Logout");

      const profile = Array.from(side.querySelectorAll("a")).find((a) =>
        (a.getAttribute("href") || "").includes("profile")
      );

      if (profile) profile.insertAdjacentElement("afterend", logout);
      else side.appendChild(logout);

      logout.addEventListener("click", async () => {
        logout.disabled = true;
        logout.textContent = "Logging out…";
        try {
          await signOut(auth);
          clearStoredCustomerMobile();
          window.location.assign("/account");
        } catch (error) {
          console.error("Customer logout failed", error);
          logout.disabled = false;
          logout.textContent = "↪ Logout";
        }
      });
    };

    const hydrate = async () => {
      const mobile = getStoredCustomerMobile();
      const user = auth.currentUser;
      if (!mobile || !user) {
        renderLogin(root);
        return;
      }
      wireAccountActions();

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/customer/account?mobile=${encodeURIComponent(mobile)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Unable to load account dashboard.");
        const data = await response.json();
        if (!alive) return;

        const customerName = data.customer?.name || "Customer";
        const heading = root.querySelector(".account-title h1") as HTMLElement | null;
        if (heading) heading.textContent = `Welcome back, ${customerName}`;

        const kpis = root.querySelectorAll(".kpi");
        if (kpis[0]) {
          const value = kpis[0].querySelector("strong");
          if (value) value.textContent = String(data.activeSubscriptionCount ?? 0);
        }
        if (kpis[1]) {
          const value = kpis[1].querySelector("strong");
          if (value) value.textContent = formatDate(data.upcomingDelivery?.date || "");
        }
        if (kpis[2]) {
          const value = kpis[2].querySelector("strong");
          if (value) value.textContent = String(data.pastOrderCount ?? 0);
        }

        const panels = root.querySelectorAll(".account-main .panel");
        const current = data.currentSubscription;
        if (panels[0]) {
          const row = panels[0].querySelector(".order-row");
          const strong = row?.querySelector("strong");
          const meta = row?.querySelector(".order-meta");
          const status = row?.querySelector(".status");
          if (current) {
            if (strong) strong.textContent = `${current.productName || "Subscription"} · ${packLabel(Number(current.weightGrams), Number(current.quantity))}`;
            if (meta) meta.textContent = `${String(current.frequency || "").replace(/_/g, " ")} · ${Number(current.totalDeliveries || 0)} deliveries · Saturday delivery`;
            if (status) status.textContent = String(current.status || "ACTIVE").toUpperCase();
          } else {
            if (strong) strong.textContent = "No active subscription";
            if (meta) meta.textContent = "Start a subscription from the Microgreens catalogue.";
            if (status) status.textContent = "NONE";
          }
        }

        if (panels[1]) {
          const row = panels[1].querySelector(".order-row");
          const strong = row?.querySelector("strong");
          const meta = row?.querySelector(".order-meta");
          const status = row?.querySelector(".status");
          const delivery = data.upcomingDelivery;
          if (delivery) {
            if (strong) strong.textContent = formatLongDate(delivery.date);
            if (meta) meta.textContent = `${packLabel(Number(delivery.weightGrams), Number(delivery.quantity)) || "Upcoming delivery"} · Home address`;
            if (status) status.textContent = "UPCOMING";
          } else {
            if (strong) strong.textContent = "No upcoming delivery";
            if (meta) meta.textContent = "There are no scheduled deliveries.";
            if (status) status.textContent = "NONE";
          }
        }
      } catch (error) {
        console.error("Customer account dashboard hydration failed", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, () => void hydrate());
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
