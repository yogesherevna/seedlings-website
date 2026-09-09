import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/serverFirebase';

export const runtime = 'nodejs';

function mobileOf(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length === 10 ? digits : '';
}

export async function GET(request: NextRequest) {
  try {
    const header = request.headers.get('authorization') || '';
    if (!header.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(header.slice(7).trim());
    if (!decoded.uid) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const mobile = mobileOf(request.nextUrl.searchParams.get('mobile'));
    if (!mobile) return NextResponse.json({ error: 'Invalid customer mobile number.' }, { status: 400 });

    const snapshot = await adminDb.collection('orders').where('customerId', '==', mobile).get();
    const orders = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    orders.sort((a: any, b: any) => {
      const av = (a.createdAt?.toMillis?.() ?? Date.parse(String(a.createdAt || ''))) || 0;
      const bv = (b.createdAt?.toMillis?.() ?? Date.parse(String(b.createdAt || ''))) || 0;
      return bv - av;
    });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Customer orders load failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load orders.' }, { status: 500 });
  }
}
