import { getActiveSalesProducts, type SalesProduct } from './salesProducts';

export type FeaturedProduct = SalesProduct;

/** Featured products use the same active Salable Product source and cache as the catalogue. */
export async function getFeaturedProducts(): Promise<FeaturedProduct[]> {
  const products = await getActiveSalesProducts();
  return products.filter((product) => product.featured === true);
}

export async function refreshFeaturedProducts(): Promise<FeaturedProduct[]> {
  // Kept as a named API for callers that want an explicit background refresh.
  const products = await getActiveSalesProducts();
  return products.filter((product) => product.featured === true);
}
