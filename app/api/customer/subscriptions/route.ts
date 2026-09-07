import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/serverFirebase';

export const runtime = 'nodejs';

function clean(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function mobileOf(value: unknown) { const d = String(value ?? '').replace(/\D/g, ''); return d.length === 10 ? d : ''; }
function dateOnly(value: unknown) { const s = clean(value); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function nextSaturdayOrSunday(start: string, day: number) {
  const d = new Date(`${start}T00:00:00`); d.setHours(0,0,0,0);
  const delta = (day - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0,10);
}
function addWeeks(date: string, weeks: number) { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate()+weeks*7); return d.toISOString().slice(0,10); }

async function authenticate(request: NextRequest) {
  const h = request.headers.get('authorization') || '';
  if (!h.startsWith('Bearer ')) throw new Error('Authentication required.');
  return adminAuth.verifyIdToken(h.slice(7).trim());
}

export async function GET(request: NextRequest) {
  try {
    await authenticate(request);
    const mobile = mobileOf(request.nextUrl.searchParams.get('mobile'));
    if (!mobile) return NextResponse.json({ error: 'Invalid customer mobile number.' }, { status: 400 });
    const snap = await adminDb.collection('subscriptions').where('customerId', '==', mobile).get();
    const subscriptions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ subscriptions });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to load subscriptions.' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await authenticate(request);
    const body = await request.json();
    const mobile = mobileOf(body.mobile);
    const productId = clean(body.productId);
    const planId = clean(body.planId);
    const addressId = clean(body.addressId);
    const startDate = dateOnly(body.startDate) || new Date().toISOString().slice(0,10);
    const quantity = Number(body.quantity || 1);
    if (!mobile || !productId || !planId || !addressId) return NextResponse.json({ error: 'Customer, product, plan and address are required.' }, { status: 400 });
    if (!Number.isInteger(quantity) || quantity < 1) return NextResponse.json({ error: 'Quantity must be at least 1.' }, { status: 400 });

    const [customerSnap, salesSnap, planSnap] = await Promise.all([
      adminDb.collection('customers').doc(mobile).get(),
      adminDb.collection('salesProducts').doc(productId).get(),
      adminDb.collection('subscriptionPlans').doc(planId).get(),
    ]);
    if (!customerSnap.exists) return NextResponse.json({ error: 'Customer account not found.' }, { status: 404 });
    if (!salesSnap.exists) return NextResponse.json({ error: 'Salable Product not found.' }, { status: 404 });
    if (!planSnap.exists) return NextResponse.json({ error: 'Subscription plan not found.' }, { status: 404 });
    const customer = customerSnap.data() || {};
    const sales = salesSnap.data() || {};
    const plan = planSnap.data() || {};
    if (customer.status === 'blocked') return NextResponse.json({ error: 'This customer account is blocked.' }, { status: 403 });
    if (sales.active !== true || sales.subscriptionPurchase !== true) return NextResponse.json({ error: 'This Salable Product is not available for subscription.' }, { status: 400 });
    if (plan.active !== true) return NextResponse.json({ error: 'This subscription plan is not active.' }, { status: 400 });
    if (!['monthly','quarterly'].includes(String(plan.frequency))) return NextResponse.json({ error: 'This website supports the configured Monthly and Quarterly customer plans.' }, { status: 400 });
    if (sales.type === 'multiple') return NextResponse.json({ error: 'Combo Salable Products cannot be enrolled because the existing Subscription Master stores one production product and selling option.' }, { status: 400 });
    const component = Array.isArray(sales.components) ? sales.components[0] : null;
    if (!component?.productId) return NextResponse.json({ error: 'This Salable Product has no production product component.' }, { status: 400 });
    const productionSnap = await adminDb.collection('products').doc(String(component.productId)).get();
    if (!productionSnap.exists) return NextResponse.json({ error: 'The underlying production product was not found.' }, { status: 400 });
    const production = productionSnap.data() || {};
    const options = Array.isArray(production.sellingOptions) ? production.sellingOptions : [];
    const option = options.find((o: Record<string, unknown>) => o.active === true && Number(o.weightGrams) === Number(component.quantityGrams));
    if (!option) return NextResponse.json({ error: 'No active selling option on the underlying production product matches this Salable Product.' }, { status: 400 });
    const addresses = Array.isArray(customer.addresses) ? customer.addresses : [];
    const address = addresses.find((a: Record<string, unknown>) => String(a?.id ?? '') === addressId);
    if (!address) return NextResponse.json({ error: 'Selected delivery address was not found.' }, { status: 400 });
    const deliveryDay = 6;
    const firstDelivery = nextSaturdayOrSunday(startDate, deliveryDay);
    const deliveries = String(plan.frequency) === 'monthly' ? 4 : 12;
    const endDate = addWeeks(firstDelivery, deliveries - 1);
    const ref = adminDb.collection('subscriptions').doc();
    const subscriptionNumber = `SUB-${ref.id.slice(0,8).toUpperCase()}`;
    const data = {
      subscriptionNumber,
      customerId: mobile,
      customerName: clean(customer.name) || 'Unnamed customer',
      customerMobile: mobile,
      productId: String(component.productId),
      productName: clean(production.name) || clean(sales.name),
      sellingOptionId: String(option.id),
      sellingOptionLabel: Number(option.weightGrams) >= 1000 && Number(option.weightGrams) % 1000 === 0 ? `${Number(option.weightGrams)/1000}kg box` : `${Number(option.weightGrams)}g box`,
      weightGrams: Number(option.weightGrams),
      unitPrice: Number(option.price),
      quantity,
      frequency: String(plan.frequency),
      totalDeliveries: deliveries,
      deliveriesGenerated: 0,
      nextDeliveryDate: firstDelivery,
      deliveryDay,
      startDate,
      endDate,
      deliveryAddress: address,
      status: 'active',
      notes: clean(body.notes),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.set(data);
    return NextResponse.json({ id: ref.id, subscriptionNumber, status: data.status, frequency: data.frequency, nextDeliveryDate: data.nextDeliveryDate }, { status: 201 });
  } catch (e) {
    console.error('Customer subscription creation failed', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to create subscription.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await authenticate(request);
    const body = await request.json();
    const mobile = mobileOf(body.mobile); const id = clean(body.id); const status = clean(body.status);
    if (!mobile || !id || !['active','paused','cancelled'].includes(status)) return NextResponse.json({ error: 'Invalid subscription update.' }, { status: 400 });
    const ref = adminDb.collection('subscriptions').doc(id); const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });
    const sub = snap.data() || {};
    if (String(sub.customerId) !== mobile) return NextResponse.json({ error: 'Subscription does not belong to this customer.' }, { status: 403 });
    if (['completed','cancelled'].includes(String(sub.status))) return NextResponse.json({ error: 'A completed or cancelled subscription cannot be changed.' }, { status: 400 });
    await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ id, status });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to update subscription.' }, { status: 500 }); }
}
