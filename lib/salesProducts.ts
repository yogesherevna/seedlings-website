import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export type SalesProductComponent = {
  productId: string;
  productName: string;
  productSku?: string;
  quantityGrams: number;
};

export type SalesProduct = {
  id: string;
  name: string;
  sku?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  imageUrl?: string;
  type?: 'single' | 'multiple';
  components?: SalesProductComponent[];
  packedStockQuantity?: number;
  currency: string;
  sellingPrice: number;
  oneTimePurchase: boolean;
  subscriptionPurchase: boolean;
  active: boolean;
  featured?: boolean;
  sortOrder?: number;
};

export async function getActiveSalesProducts(): Promise<SalesProduct[]> {
  const snap = await getDocs(
    query(collection(db, 'salesProducts'), where('active', '==', true)),
  );

  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as SalesProduct)
    .filter((product) => product.active === true)
    .sort((a, b) => {
      const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featured !== 0) return featured;
      return Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
    });
}
