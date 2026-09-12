export const CART_STORAGE_KEY = 'seedlings_cart';
const CUSTOMER_CART_STORAGE_PREFIX = 'seedlings_cart:';

type StoredCart = { oneTimeItems: CartItem[]; subscriptionItems: SubscriptionCartItem[] };

function activeCartStorageKey(): string {
  if (typeof window === 'undefined') return CART_STORAGE_KEY;
  const mobile = window.localStorage.getItem('seedlings_customer_mobile') || '';
  return mobile ? `${CUSTOMER_CART_STORAGE_PREFIX}${mobile}` : `${CUSTOMER_CART_STORAGE_PREFIX}guest`;
}

export type CartItem = {
  productId: string; slug: string; name: string; price: number; mrp?: number; currency: string; imageUrl?: string; quantity: number;
};

export type SubscriptionCartItem = CartItem & {
  planId: string;
  planName: string;
  frequency?: string;
  deliveriesPerTerm?: number;
  startDate: string;
};

const cleanCartItem = (item: any): CartItem | null => {
  if (!item || typeof item.productId !== 'string' || Number(item.quantity) <= 0) return null;
  return {
    productId: item.productId, slug: String(item.slug || item.productId), name: String(item.name || 'Product'),
    price: Number(item.price || 0), mrp: Number.isFinite(Number(item.mrp)) && Number(item.mrp) > 0 ? Number(item.mrp) : undefined,
    currency: String(item.currency || 'INR'), imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
    quantity: Math.max(1, Math.floor(Number(item.quantity))),
  };
};

function safeParse(value: string | null): StoredCart {
  if (!value) return { oneTimeItems: [], subscriptionItems: [] };
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return { oneTimeItems: parsed.map(cleanCartItem).filter(Boolean) as CartItem[], subscriptionItems: [] };
    return {
      oneTimeItems: Array.isArray(parsed?.oneTimeItems) ? parsed.oneTimeItems.map(cleanCartItem).filter(Boolean) as CartItem[] : [],
      subscriptionItems: Array.isArray(parsed?.subscriptionItems) ? parsed.subscriptionItems.map((item: any) => {
        const base = cleanCartItem(item); if (!base || !item.planId || !item.startDate) return null;
        return { ...base, planId: String(item.planId), planName: String(item.planName || 'Subscription'), frequency: item.frequency ? String(item.frequency) : undefined,
          deliveriesPerTerm: Number.isFinite(Number(item.deliveriesPerTerm)) ? Number(item.deliveriesPerTerm) : undefined, startDate: String(item.startDate) } as SubscriptionCartItem;
      }).filter(Boolean) as SubscriptionCartItem[] : [],
    };
  } catch { return { oneTimeItems: [], subscriptionItems: [] }; }
}

export function getUnifiedCart(): StoredCart {
  if (typeof window === 'undefined') return { oneTimeItems: [], subscriptionItems: [] };
  const key = activeCartStorageKey();
  const stored = localStorage.getItem(key);
  if (stored !== null) return safeParse(stored);
  if (key.endsWith(':guest')) {
    const legacy = localStorage.getItem(CART_STORAGE_KEY);
    if (legacy !== null) {
      const cart = safeParse(legacy);
      localStorage.setItem(key, JSON.stringify(cart)); localStorage.removeItem(CART_STORAGE_KEY); return cart;
    }
  }
  return { oneTimeItems: [], subscriptionItems: [] };
}

function saveUnifiedCart(cart: StoredCart) {
  localStorage.setItem(activeCartStorageKey(), JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('seedlings-cart-updated'));
}

/** Backward-compatible one-time view used by existing product controls. */
export function getCart(): CartItem[] { return getUnifiedCart().oneTimeItems; }
export function saveCart(items: CartItem[]) { const cart = getUnifiedCart(); saveUnifiedCart({ ...cart, oneTimeItems: items }); }

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1) {
  const cart = getUnifiedCart(); const items = [...cart.oneTimeItems]; const existing = items.find((x) => x.productId === item.productId);
  if (existing) existing.quantity += Math.max(1, Math.floor(quantity)); else items.push({ ...item, quantity: Math.max(1, Math.floor(quantity)) });
  saveUnifiedCart({ ...cart, oneTimeItems: items });
}

export function addSubscriptionToCart(item: Omit<SubscriptionCartItem, 'quantity'>, quantity = 1) {
  const cart = getUnifiedCart(); const items = [...cart.subscriptionItems];
  const existing = items.find((x) => x.productId === item.productId && x.planId === item.planId && x.startDate === item.startDate);
  if (existing) existing.quantity += Math.max(1, Math.floor(quantity)); else items.push({ ...item, quantity: Math.max(1, Math.floor(quantity)) });
  saveUnifiedCart({ ...cart, subscriptionItems: items });
}

export function setCartQuantity(productId: string, quantity: number) {
  const cart = getUnifiedCart();
  const next = cart.oneTimeItems.map((item) => item.productId === productId ? { ...item, quantity: Math.max(0, Math.floor(quantity)) } : item).filter((item) => item.quantity > 0);
  saveUnifiedCart({ ...cart, oneTimeItems: next });
}

export function setSubscriptionCartQuantity(productId: string, planId: string, startDate: string, quantity: number) {
  const cart = getUnifiedCart();
  const next = cart.subscriptionItems.map((item) => item.productId === productId && item.planId === planId && item.startDate === startDate ? { ...item, quantity: Math.max(0, Math.floor(quantity)) } : item).filter((item) => item.quantity > 0);
  saveUnifiedCart({ ...cart, subscriptionItems: next });
}

export function removeFromCart(productId: string) { const cart = getUnifiedCart(); saveUnifiedCart({ ...cart, oneTimeItems: cart.oneTimeItems.filter((item) => item.productId !== productId) }); }
export function removeSubscriptionFromCart(productId: string, planId: string, startDate: string) { const cart = getUnifiedCart(); saveUnifiedCart({ ...cart, subscriptionItems: cart.subscriptionItems.filter((item) => !(item.productId === productId && item.planId === planId && item.startDate === startDate)) }); }
export function clearCart() { saveUnifiedCart({ oneTimeItems: [], subscriptionItems: [] }); }
export function cartCount() { const cart = getUnifiedCart(); return [...cart.oneTimeItems, ...cart.subscriptionItems].reduce((sum, item) => sum + item.quantity, 0); }
