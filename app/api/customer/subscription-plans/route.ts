import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/serverFirebase';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const h=request.headers.get('authorization')||''; if(!h.startsWith('Bearer ')) return NextResponse.json({error:'Authentication required.'},{status:401});
    await adminAuth.verifyIdToken(h.slice(7).trim());
    const snap=await adminDb.collection('subscriptionPlans').where('active','==',true).get();
    const plans=snap.docs.map(d=>({id:d.id,...d.data()})).filter((p:any)=>['monthly','quarterly'].includes(String(p.frequency)));
    return NextResponse.json({plans});
  } catch(e){ return NextResponse.json({error:e instanceof Error?e.message:'Unable to load subscription plans.'},{status:401}); }
}
