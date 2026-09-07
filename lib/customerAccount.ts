import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export type CustomerAddress = {
  id?: string;
  label?: string;
  name?: string;
  mobileNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export type CustomerAccount = {
  id: string;
  mobile?: string;
  mobileNumber?: string;
  phone?: string;
  phoneE164?: string;
  countryCode?: string;
  name?: string;
  email?: string;
  status?: string;
  onboardingStatus?: string;
  addresses?: CustomerAddress[];
};

export async function getCustomerAccount(mobile: string): Promise<CustomerAccount | null> {
  const ref = doc(db, 'customers', mobile);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CustomerAccount;
}

export async function updateCustomerProfile(mobile: string, name: string, email: string) {
  const ref = doc(db, 'customers', mobile);
  await updateDoc(ref, {
    name: name.trim(),
    email: email.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCustomerAddresses(mobile: string, addresses: CustomerAddress[]) {
  const ref = doc(db, 'customers', mobile);
  await updateDoc(ref, {
    addresses,
    updatedAt: serverTimestamp(),
  });
}
