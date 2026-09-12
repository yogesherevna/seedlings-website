import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const clean = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const nonNegative = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export type DeliveryChargeResult = {
  finalCharge: number;
  baseCharge: number;
  savings: number;
  isFree: boolean;
  source: 'geolocation' | 'delivery_master' | 'subscription_plan' | 'none';
  sourceId: string;
  sourceName: string;
  snapshot: Record<string, unknown>;
};

export type CheckoutDeliveryCharges = {
  oneTime: DeliveryChargeResult;
  subscriptions: Array<DeliveryChargeResult & { planId: string; planName: string }>;
  oneTimeTotal: number;
  subscriptionTotal: number;
  total: number;
  savingsTotal: number;
};

export type DeliveryChargeSubscriptionInput = {
  planId: string;
  planName?: string;
};

/**
 * Delivery charge precedence used by the customer website:
 *
 * 1. Geolocation Master is the pincode-specific base charge.
 * 2. Delivery Charges Master is the global fallback when no matching
 *    active geolocation exists.
 * 3. A subscription plan may reduce the subscription base charge. `free`
 *    and `included` make it zero; `per_delivery` uses the lower of the
 *    geolocation/global base and the plan amount, so a plan cannot increase
 *    a location's normal subscription delivery charge.
 */
export async function calculateCheckoutDeliveryCharges(input: {
  pincode: string;
  oneTime: boolean;
  subscriptions: DeliveryChargeSubscriptionInput[];
}): Promise<CheckoutDeliveryCharges> {
  const pincode = clean(input.pincode).replace(/\D/g, '').slice(0, 6);
  if (!/^\d{6}$/.test(pincode)) throw new Error('A valid 6-digit pincode is required to calculate delivery charges.');

  const [geoSnap, masterSnap, planSnap] = await Promise.all([
    getDocs(collection(db, 'geolocations')),
    getDocs(collection(db, 'deliveryCharges')),
    getDocs(collection(db, 'subscriptionPlans')),
  ]);

  const geolocations = geoSnap.docs.filter((d) => {
    const x = d.data() || {};
    return x.active === true && clean(x.pincode).replace(/\D/g, '') === pincode;
  });
  if (geolocations.length > 1) throw new Error(`Multiple active geolocations are configured for pincode ${pincode}.`);
  const geoDoc = geolocations[0];
  const geo = geoDoc?.data() || null;

  const masters = masterSnap.docs.filter((d) => {
    const x = d.data() || {};
    return x.active === true;
  });
  const masterFor = (scope: 'one_time_order' | 'subscription') => {
    const matches = masters.filter((d) => String(d.data()?.scope || '') === scope);
    if (matches.length > 1) throw new Error(`Multiple active ${scope === 'one_time_order' ? 'one-time' : 'subscription'} delivery charges are configured.`);
    return matches[0];
  };

  const baseResult = (kind: 'one_time_order' | 'subscription'): DeliveryChargeResult => {
    const geoField = kind === 'one_time_order' ? 'oneTimeCharge' : 'subscriptionCharge';
    if (geoDoc && geo) {
      const charge = nonNegative(geo[geoField]);
      return {
        finalCharge: charge,
        baseCharge: charge,
        savings: 0,
        isFree: charge === 0,
        source: 'geolocation',
        sourceId: geoDoc.id,
        sourceName: clean(geo.locationName) || `Pincode ${pincode}`,
        snapshot: { id: geoDoc.id, locationName: clean(geo.locationName), pincode, oneTimeCharge: nonNegative(geo.oneTimeCharge), subscriptionCharge: nonNegative(geo.subscriptionCharge), active: true },
      };
    }
    const masterDoc = masterFor(kind);
    const master = masterDoc?.data() || null;
    if (masterDoc && master) {
      const charge = master.mode === 'free' ? 0 : nonNegative(master.amount);
      return {
        finalCharge: charge,
        baseCharge: charge,
        savings: 0,
        isFree: charge === 0,
        source: 'delivery_master',
        sourceId: masterDoc.id,
        sourceName: clean(master.name) || 'Delivery Charges Master',
        snapshot: { id: masterDoc.id, name: clean(master.name), scope: clean(master.scope), mode: clean(master.mode), amount: charge, active: true },
      };
    }
    return { finalCharge: 0, baseCharge: 0, savings: 0, isFree: true, source: 'none', sourceId: '', sourceName: '', snapshot: {} };
  };

  const oneTime = input.oneTime ? baseResult('one_time_order') : { finalCharge: 0, baseCharge: 0, savings: 0, isFree: true, source: 'none' as const, sourceId: '', sourceName: '', snapshot: {} };
  const subscriptions = input.subscriptions.map((entry) => {
    const base = baseResult('subscription');
    const planDoc = planSnap.docs.find((d) => d.id === entry.planId);
    if (!planDoc) throw new Error(`Subscription plan "${entry.planName || entry.planId}" was not found.`);
    const plan = planDoc.data() || {};
    if (plan.active !== true) throw new Error(`Subscription plan "${entry.planName || plan.name || entry.planId}" is no longer active.`);
    const mode = clean(plan.deliveryChargeMode).toLowerCase();
    let final = base.finalCharge;
    let source = base.source;
    let sourceId = base.sourceId;
    let sourceName = base.sourceName;
    if (mode === 'free' || mode === 'included') {
      final = 0;
      source = 'subscription_plan';
      sourceId = planDoc.id;
      sourceName = clean(plan.name) || entry.planName || 'Subscription plan';
    } else if (mode === 'per_delivery' && Number.isFinite(Number(plan.deliveryCharge)) && Number(plan.deliveryCharge) >= 0) {
      final = Math.min(base.finalCharge, nonNegative(plan.deliveryCharge));
      if (final !== base.finalCharge) {
        source = 'subscription_plan';
        sourceId = planDoc.id;
        sourceName = clean(plan.name) || entry.planName || 'Subscription plan';
      }
    }
    const savings = Math.max(0, base.finalCharge - final);
    return {
      ...base,
      finalCharge: final,
      savings,
      isFree: final === 0,
      source,
      sourceId,
      sourceName,
      planId: entry.planId,
      planName: clean(plan.name) || entry.planName || entry.planId,
      snapshot: {
        ...base.snapshot,
        planId: planDoc.id,
        planName: clean(plan.name) || entry.planName || planDoc.id,
        deliveryChargeMode: mode,
        planDeliveryCharge: nonNegative(plan.deliveryCharge),
        baseCharge: base.finalCharge,
        finalCharge: final,
        savings,
      },
    };
  });

  return {
    oneTime,
    subscriptions,
    oneTimeTotal: oneTime.finalCharge,
    subscriptionTotal: subscriptions.reduce((sum, item) => sum + item.finalCharge, 0),
    total: oneTime.finalCharge + subscriptions.reduce((sum, item) => sum + item.finalCharge, 0),
    savingsTotal: subscriptions.reduce((sum, item) => sum + item.savings, 0) + (oneTime.savings || 0),
  };
}
