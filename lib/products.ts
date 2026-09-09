import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export type FeaturedProduct = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  imageUrls?: string[];
  status?: string;
  featured?: boolean;
  sortOrder?: number;
  price?: number;
};

const FEATURED_PRODUCTS_CACHE_KEY = 'seedlings-products-featured-v1';

export async function getFeaturedProducts(): Promise<FeaturedProduct[]> {
  if (typeof window === 'undefined') return [];

  try {
    const cached = window.localStorage.getItem(FEATURED_PRODUCTS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed as FeaturedProduct[];
    }
  } catch (error) {
    console.warn('Featured products cache read failed', error);
  }

  try {
    // Featured content comes from the Production Product Master, not salesProducts.
    const snapshot = await getDocs(query(collection(db, 'products'), where('featured', '==', true)));
    const products = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as FeaturedProduct)
      .filter((product) => product.featured === true && product.status === 'active')
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));

    try {
      window.localStorage.setItem(FEATURED_PRODUCTS_CACHE_KEY, JSON.stringify(products));
    } catch (error) {
      console.warn('Featured products cache write failed', error);
    }

    return products;
  } catch (error) {
    console.error('Featured products load failed', error);
    return [];
  }
}
