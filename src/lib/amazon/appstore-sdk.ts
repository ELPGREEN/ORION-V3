/**
 * ─── Amazon Appstore SDK Bridge ───
 * Capacitor-compatible bridge for DRM, IAP, and SSI.
 * On native Android (Fire OS / Amazon Appstore), calls the real SDK.
 * On web, provides mock/fallback responses.
 */

import { Capacitor } from "@capacitor/core";

// ─── Types ───

export type LicenseStatus = "LICENSED" | "NOT_LICENSED" | "EXPIRED" | "UNKNOWN" | "ERROR";

export interface DRMStatus {
  status: LicenseStatus;
  userId?: string;
  marketplace?: string;
  checkedAt: string;
}

export type PurchaseRequestStatus = "SUCCESSFUL" | "FAILED" | "INVALID_SKU" | "ALREADY_PURCHASED" | "NOT_SUPPORTED" | "PENDING";
export type ItemType = "CONSUMABLE" | "ENTITLED" | "SUBSCRIPTION";

export interface ProductItem {
  sku: string;
  type: ItemType;
  title: string;
  description: string;
  price: string;
  smallIconUrl?: string;
}

export interface PurchaseReceipt {
  receiptId: string;
  sku: string;
  itemType: ItemType;
  purchaseDate: string;
  cancelDate?: string;
  userId: string;
}

export interface PurchaseResult {
  status: PurchaseRequestStatus;
  receipt?: PurchaseReceipt;
}

export interface SSIStatus {
  signedIn: boolean;
  userId?: string;
  email?: string;
  displayName?: string;
}

export interface AppstoreSDKState {
  available: boolean;
  platform: "fire_os" | "android" | "web";
  drm: DRMStatus;
  ssi: SSIStatus;
  purchasedSkus: string[];
}

// ─── Event bus ───

type AppstoreEventType = "drm_check" | "iap_purchase" | "iap_receipt" | "ssi_status";
type AppstoreListener = (data: unknown) => void;

const listeners = new Map<AppstoreEventType, Set<AppstoreListener>>();

export function onAppstoreEvent(event: AppstoreEventType, fn: AppstoreListener) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(fn);
  return () => listeners.get(event)?.delete(fn);
}

function emit(event: AppstoreEventType, data: unknown) {
  listeners.get(event)?.forEach((fn) => fn(data));
}

// ─── Helpers ───

const isNative = () => Capacitor.isNativePlatform();
const isFireOS = () => {
  if (!isNative()) return false;
  const ua = navigator.userAgent.toLowerCase();
  // Detect Fire OS via multiple signals: Silk browser, Kindle/Fire brand, KFTT/KF device codes, or Amazon Build tags
  return ua.includes("silk") || ua.includes("kindle") || ua.includes("fire") ||
    /\bkf[a-z]{2,}\b/.test(ua) || ua.includes("amazon");
};

async function callNativePlugin<T>(method: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isNative()) return null;
  try {
    // Dynamic import of native bridge — the plugin must be registered on the native side
    const plugin = (window as any).Capacitor?.Plugins?.AmazonAppstoreSDK;
    if (!plugin || typeof plugin[method] !== "function") {
      console.warn(`[AppstoreSDK] Native method "${method}" not available`);
      return null;
    }
    return await plugin[method](args || {});
  } catch (e) {
    console.error(`[AppstoreSDK] Native call "${method}" failed:`, e);
    return null;
  }
}

// ─── DRM ───

export async function checkDRMLicense(): Promise<DRMStatus> {
  if (isNative()) {
    const result = await callNativePlugin<DRMStatus>("checkLicense");
    if (result) {
      emit("drm_check", result);
      return result;
    }
  }
  // Web fallback — always licensed (development mode)
  const fallback: DRMStatus = {
    status: "LICENSED",
    userId: "web-dev-user",
    marketplace: "web",
    checkedAt: new Date().toISOString(),
  };
  emit("drm_check", fallback);
  return fallback;
}

export async function verifyLicenseReceipt(receiptToken: string): Promise<boolean> {
  const result = await callNativePlugin<{ valid: boolean }>("verifyReceipt", { receiptToken });
  return result?.valid ?? true; // Web fallback: always valid
}

// ─── IAP ───

export async function getProductData(skus: string[]): Promise<ProductItem[]> {
  if (isNative()) {
    const result = await callNativePlugin<{ items: ProductItem[] }>("getProductData", { skus });
    if (result?.items) return result.items;
  }
  // Web fallback — mock products
  return skus.map((sku) => ({
    sku,
    type: "SUBSCRIPTION" as ItemType,
    title: `Orion ${sku}`,
    description: `Plano ${sku} do Orion IA`,
    price: "R$ 0,00",
  }));
}

export async function purchase(sku: string): Promise<PurchaseResult> {
  if (isNative()) {
    const result = await callNativePlugin<PurchaseResult>("purchase", { sku });
    if (result) {
      emit("iap_purchase", result);
      return result;
    }
  }
  const fallback: PurchaseResult = {
    status: "NOT_SUPPORTED",
  };
  emit("iap_purchase", fallback);
  return fallback;
}

export async function getPurchaseUpdates(reset = false): Promise<PurchaseReceipt[]> {
  if (isNative()) {
    const result = await callNativePlugin<{ receipts: PurchaseReceipt[] }>("getPurchaseUpdates", { reset });
    if (result?.receipts) {
      result.receipts.forEach((r) => emit("iap_receipt", r));
      return result.receipts;
    }
  }
  return [];
}

export async function notifyFulfillment(receiptId: string, fulfilled: boolean): Promise<void> {
  await callNativePlugin("notifyFulfillment", { receiptId, fulfilled });
}

// ─── SSI (Simple Sign-In) ───

export async function getSSIStatus(): Promise<SSIStatus> {
  if (isNative()) {
    const result = await callNativePlugin<SSIStatus>("getSignInStatus");
    if (result) {
      emit("ssi_status", result);
      return result;
    }
  }
  // Web fallback
  return { signedIn: false };
}

export async function signInWithAmazon(): Promise<SSIStatus> {
  if (isNative()) {
    const result = await callNativePlugin<SSIStatus>("signIn");
    if (result) {
      emit("ssi_status", result);
      return result;
    }
  }
  return { signedIn: false };
}

export async function signOutAmazon(): Promise<void> {
  await callNativePlugin("signOut");
  emit("ssi_status", { signedIn: false });
}

// ─── Unified State ───

export async function getAppstoreState(): Promise<AppstoreSDKState> {
  const platform = isFireOS() ? "fire_os" : isNative() ? "android" : "web";
  const available = isNative();

  const [drm, ssi, receipts] = await Promise.all([
    checkDRMLicense(),
    getSSIStatus(),
    getPurchaseUpdates(),
  ]);

  return {
    available,
    platform,
    drm,
    ssi,
    purchasedSkus: receipts.map((r) => r.sku),
  };
}

// ─── SKU Constants (matches Amazon Developer Console) ───

export const ORION_SKUS = {
  PROFESSIONAL: "orion_professional_monthly",
  BUSINESS: "orion_business_monthly",
  ENTERPRISE: "orion_enterprise_monthly",
  TOKENS_500: "orion_tokens_500",
  TOKENS_2000: "orion_tokens_2000",
} as const;
