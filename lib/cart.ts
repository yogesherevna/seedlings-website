export const CART_STORAGE_KEY = 'seedlings_cart';
export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string;
  quantity: number;
};

function safeParse(value: string | null): CartItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.productId === 'string' && Number(item.quantity) > 0).map((item) => ({
      productId: item.productId,
      slug: String(item.slug || item.productId),
      name: String(item.name || 'Product'),
      price: Number(item.price || 0),
      currency: String(item.currency || 'INR'),
      imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
      quantity: Math.max(1, Math.floor(Number(item.quantity))),
    }));
  } catch { return []; }
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  return safeParse(localStorage.getItem(CART_STORAGE_KEY));
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('seedlings-cart-updated'));
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1) {
  const items = getCart();
  const existing = items.find((x) => x.productId === item.productId);
  if (existing) existing.quantity += Math.max(1, Math.floor(quantity));
  else items.push({ ...item, quantity: Math.max(1, Math.floor(quantity)) });
  saveCart(items);
}

export function setCartQuantity(productId: string, quantity: number) {
  const items = getCart();
  const next = items.map((item) => item.productId === productId ? { ...item, quantity: Math.max(0, Math.floor(quantity)) } : item).filter((item) => item.quantity > 0);
  saveCart(next);
}

export function removeFromCart(productId: string) {
  saveCart(getCart().filter((item) => item.productId !== productId));
}

export function clearCart() { saveCart([]); }
export function cartCount() { return getCart().reduce((sum, item) => sum + item.quantity, 0); }
