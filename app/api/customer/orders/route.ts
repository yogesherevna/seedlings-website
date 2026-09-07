import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/serverFirebase';

export const runtime = 'nodejs';

function normalizeMobile(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length === 10 ? digits : '';
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function orderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const idToken = authorization.slice(7).trim();
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded.uid) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const body = await request.json();
    const mobile = normalizeMobile(body.mobile);
    const addressId = cleanString(body.addressId);
    const scheduledDeliveryDate = cleanString(body.scheduledDeliveryDate);
    const paymentMethod = cleanString(body.paymentMethod) || 'online';
    const notes = cleanString(body.notes);
    const requestedItems = Array.isArray(body.items) ? body.items : [];

    if (!mobile) return NextResponse.json({ error: 'Invalid customer mobile number.' }, { status: 400 });
    if (!addressId) return NextResponse.json({ error: 'Delivery address is required.' }, { status: 400 });
    if (!scheduledDeliveryDate) return NextResponse.json({ error: 'Delivery slot/date is required.' }, { status: 400 });
    if (!requestedItems.length) return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });

    const customerSnap = await adminDb.collection('customers').doc(mobile).get();
    if (!customerSnap.exists) return NextResponse.json({ error: 'Customer account not found.' }, { status: 404 });
    const customer = customerSnap.data() || {};
    if (customer.status === 'blocked') return NextResponse.json({ error: 'This customer account is blocked.' }, { status: 403 });

    const addresses = Array.isArray(customer.addresses) ? customer.addresses : [];
    const address = addresses.find((item: Record<string, unknown>) => String(item?.id ?? '') === addressId);
    if (!address) return NextResponse.json({ error: 'Selected delivery address was not found.' }, { status: 400 });

    const productRefs: string[] = requestedItems
      .map((item: Record<string, unknown>) => cleanString(item.productId))
      .filter(Boolean) as string[];
    const uniqueIds: string[] = [...new Set(productRefs)];
    if (uniqueIds.length !== productRefs.length) return NextResponse.json({ error: 'Duplicate cart items are not allowed.' }, { status: 400 });

    const products = await Promise.all(uniqueIds.map(async (id) => {
      const snap = await adminDb.collection('salesProducts').doc(id).get();
      return { id, snap };
    }));

    const byId = new Map(products.map(({ id, snap }) => [id, snap]));
    const items = [];
    for (const raw of requestedItems as Record<string, unknown>[]) {
      const id = cleanString(raw.productId);
      const quantity = Number(raw.quantity);
      const snap = byId.get(id);
      if (!snap?.exists) return NextResponse.json({ error: 'One or more Salable Products no longer exist.' }, { status: 400 });
      const product = snap.data() || {};
      if (product.active !== true || product.oneTimePurchase !== true) {
        return NextResponse.json({ error: `Product "${product.name || id}" is not available for one-time purchase.` }, { status: 400 });
      }
      if (!Number.isInteger(quantity) || quantity < 1) return NextResponse.json({ error: 'Item quantities must be at least 1.' }, { status: 400 });
      const unitPrice = Number(product.sellingPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return NextResponse.json({ error: `Invalid price for "${product.name || id}".` }, { status: 400 });
      items.push({
        salableProductId: id,
        salableProductSku: cleanString(product.sku),
        salableProductType: product.type === 'multiple' ? 'multiple' : 'single',
        productId: id,
        productName: cleanString(product.name),
        productSlug: cleanString(product.slug),
        sellingOptionId: id,
        sellingOptionLabel: product.type === 'multiple' ? 'Combo' : ((product.components?.[0]?.quantityGrams ?? '') ? `${product.components[0].quantityGrams}g` : 'Single'),
        weightGrams: Array.isArray(product.components) ? product.components.reduce((n: number, c: Record<string, unknown>) => n + Number(c.quantityGrams || 0), 0) : 0,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
        imageUrl: cleanString(product.imageUrl),
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const activeChargesSnap = await adminDb.collection('deliveryCharges')
      .where('active', '==', true)
      .where('scope', '==', 'one_time_order')
      .get();
    if (activeChargesSnap.size > 1) {
      return NextResponse.json({ error: 'Multiple active one-time delivery charges are configured. Please configure one active charge before accepting website orders.' }, { status: 409 });
    }
    const chargeSnap = activeChargesSnap.docs[0];
    const charge = chargeSnap?.data() || null;
    const deliveryFee = charge ? (charge.mode === 'free' ? 0 : Math.max(0, Number(charge.amount || 0))) : 0;

    const total = subtotal + deliveryFee;
    const orderRef = adminDb.collection('orders').doc();
    const order = {
      orderNumber: orderNumber(),
      customerId: customerSnap.id,
      customerName: cleanString(customer.name),
      customerMobile: cleanString(customer.mobileNumber || customer.mobile || mobile),
      items,
      subtotal,
      deliveryFee,
      discount: 0,
      total,
      currency: 'INR',
      paymentStatus: 'pending',
      paymentMethod,
      status: 'pending_payment',
      deliveryAddress: address,
      scheduledDeliveryDate,
      notes,
      orderType: 'one_time',
      deliveryChargeId: chargeSnap?.id || '',
      deliveryChargeName: cleanString(charge?.name),
      deliveryChargeSnapshot: deliveryFee,
      packingStatus: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await orderRef.set(order);
    return NextResponse.json({ orderId: orderRef.id, orderNumber: order.orderNumber, paymentStatus: order.paymentStatus, total });
  } catch (error) {
    console.error('Customer order creation failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create order.' }, { status: 500 });
  }
}
