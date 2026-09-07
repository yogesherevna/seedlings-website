import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/serverFirebase';

export const runtime = 'nodejs';

function mobileOf(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length === 10 ? digits : '';
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function dateValue(value: unknown) {
  if (typeof value === 'string') return value.slice(0, 10);
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return ((value as { toDate: () => Date }).toDate()).toISOString().slice(0, 10);
  }
  return '';
}

type SubscriptionRecord = {
  id: string;
  status?: unknown;
  nextDeliveryDate?: unknown;
  productName?: unknown;
  weightGrams?: unknown;
  quantity?: unknown;
  deliveryAddress?: unknown;
};

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    await adminAuth.verifyIdToken(authorization.slice(7).trim());

    const mobile = mobileOf(request.nextUrl.searchParams.get('mobile'));
    if (!mobile) return NextResponse.json({ error: 'Invalid customer mobile number.' }, { status: 400 });

    const customerSnap = await adminDb.collection('customers').doc(mobile).get();
    if (!customerSnap.exists) return NextResponse.json({ error: 'Customer account not found.' }, { status: 404 });
    const customer = customerSnap.data() || {};
    if (customer.status === 'blocked') return NextResponse.json({ error: 'This customer account is blocked.' }, { status: 403 });

    const [subscriptionsSnap, ordersSnap] = await Promise.all([
      adminDb.collection('subscriptions').where('customerId', '==', mobile).get(),
      adminDb.collection('orders').where('customerId', '==', mobile).get(),
    ]);

    const subscriptions: SubscriptionRecord[] = subscriptionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const orders = ordersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const activeSubscriptions = subscriptions.filter((item) => String(item.status) === 'active');
    const upcoming = activeSubscriptions
      .filter((item) => dateValue(item.nextDeliveryDate))
      .sort((a, b) => dateValue(a.nextDeliveryDate).localeCompare(dateValue(b.nextDeliveryDate)))[0] ?? null;

    return NextResponse.json({
      customer: {
        name: clean(customer.name),
        mobile: mobile,
        email: clean(customer.email),
      },
      activeSubscriptionCount: activeSubscriptions.length,
      pastOrderCount: orders.length,
      currentSubscription: upcoming,
      upcomingDelivery: upcoming ? {
        date: dateValue(upcoming.nextDeliveryDate),
        productName: clean(upcoming.productName),
        weightGrams: Number(upcoming.weightGrams || 0),
        quantity: Number(upcoming.quantity || 0),
        deliveryAddress: upcoming.deliveryAddress ?? null,
      } : null,
    });
  } catch (error) {
    console.error('Customer account dashboard failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load account dashboard.' }, { status: 500 });
  }
}
