// Google Play Billing via RevenueCat: coin-pack IAP and the piggy-bank smash.
// Off-native (browser dev/preview) there's no store to talk to, so purchases
// are unavailable there — the UI falls back to "preview only" copy.
//
// Needs a real RevenueCat public API key before release (see README >
// Monetisation config); until one is set, billing stays disabled and the
// shop renders as a preview, same as before Phase 5.
import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

const isNative = Capacitor.isNativePlatform();

export const REVENUECAT_API_KEY = import.meta.env?.VITE_REVENUECAT_API_KEY || null;

export const COIN_PACKS = [
  { productId: 'coins_200k', coins: 200_000, price: 'NZ$1.99' },
  { productId: 'coins_1200k', coins: 1_200_000, price: 'NZ$9.99' },
  { productId: 'coins_15000k', coins: 15_000_000, price: 'NZ$99' },
];

export const PIGGY_SMASH_PRODUCT_ID = 'piggy_smash';
export const PIGGY_SMASH_PRICE = 'NZ$2.99';

/** True once a real store connection is possible: native shell + API key set. */
export function billingAvailable() {
  return isNative && !!REVENUECAT_API_KEY;
}

let configured = false;

async function ensureConfigured() {
  if (!billingAvailable() || configured) return;
  await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  configured = true;
}

/**
 * Buys a product by id and resolves `true` only once the purchase completes.
 * Resolves `false` on cancel/failure, or immediately when billing isn't
 * available (web preview, or no API key configured yet).
 */
export async function purchaseProduct(productId) {
  if (!billingAvailable()) return false;
  try {
    await ensureConfigured();
    const { products } = await Purchases.getProducts({ productIdentifiers: [productId] });
    const product = products[0];
    if (!product) return false;
    await Purchases.purchaseStoreProduct({ product });
    return true;
  } catch (err) {
    if (err?.userCancelled) return false;
    return false;
  }
}
