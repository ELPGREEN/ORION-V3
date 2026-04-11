/**
 * ─── Amazon Appstore SDK Bridge ───
 * Capacitor-compatible bridge for DRM, IAP, SSI, and UserData.
 * Aligned with official Amazon Appstore SDK API Reference.
 * On native Android (Fire OS / Amazon Appstore), calls the real SDK via Capacitor plugin.
 * On web, provides mock/fallback responses for development.
 */

import { Capacitor } from "@capacitor/core";

// ─── Types ───

export type LicenseStatus =
  | "LICENSED"
  | "NOT_LICENSED"
  | "EXPIRED"
  | "UNKNOWN"
  | "ERROR"
  | "ERROR_VERIFICATION"
  | "ERROR_INVALID_LICENSING_KEYS";

export interface DRMStatus {
  status: LicenseStatus;
  userId?: string;
  marketplace?: string;
  checkedAt: string;
}

export type PurchaseRequestStatus =
  | "SUCCESSFUL"
  | "FAILED"
  | "INVALID_SKU"
  | "ALREADY_PURCHASED"
  | "NOT_SUPPORTED"
  | "PENDING";

export type ItemType = "CONSUMABLE" | "ENTITLED" | "SUBSCRIPTION";

export type FulfillmentResult = "FULFILLED" | "UNAVAILABLE";

export type SDKMode = "SANDBOX" | "PRODUCTION" | "UNKNOWN";

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

export interface UserData {
  userId: string;
  marketplace: string;
  countryCode?: string;
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
  userData: UserData | null;
  sdkMode: SDKMode;
  purchasedSkus: string[];
}

// ─── Event bus ───

type AppstoreEventType = "drm_check" | "iap_purchase" | "iap_receipt" | "ssi_status" | "user_data";
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
  return ua.includes("silk") || ua.includes("kindle") || ua.includes("fire") ||
    /\bkf[a-z]{2,}\b/.test(ua) || ua.includes("amazon");
};

async function callNativePlugin<T>(method: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isNative()) return null;
  try {
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

// ─── SDK Mode ───

export async function getAppstoreSDKMode(): Promise<SDKMode> {
  if (isNative()) {
    const result = await callNativePlugin<{ mode: SDKMode }>("getAppstoreSDKMode");
    if (result?.mode) return result.mode;
  }
  return "UNKNOWN";
}

// ─── Enable Pending Purchases (Amazon Kids) ───

export async function enablePendingPurchases(): Promise<void> {
  await callNativePlugin("enablePendingPurchases");
}

// ─── User Data ───

export async function getUserData(): Promise<UserData | null> {
  if (isNative()) {
    const result = await callNativePlugin<UserData>("getUserData");
    if (result) {
      emit("user_data", result);
      return result;
    }
  }
  // Web fallback
  const fallback: UserData = {
    userId: "web-dev-user",
    marketplace: "ATVPDKIKX0DER",
    countryCode: "BR",
  };
  emit("user_data", fallback);
  return fallback;
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
  return result?.valid ?? true;
}

// ─── IAP ───

export async function getProductData(skus: string[]): Promise<ProductItem[]> {
  if (isNative()) {
    const result = await callNativePlugin<{ items: ProductItem[] }>("getProductData", { skus });
    if (result?.items) return result.items;
  }
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
  const fallback: PurchaseResult = { status: "NOT_SUPPORTED" };
  emit("iap_purchase", fallback);
  return fallback;
}

/**
 * Get purchase updates with automatic pagination.
 * The native SDK may return paginated results (hasMore flag).
 * This function loops until all receipts are collected.
 */
export async function getPurchaseUpdates(reset = false): Promise<PurchaseReceipt[]> {
  if (isNative()) {
    const allReceipts: PurchaseReceipt[] = [];
    let hasMore = true;
    let isFirst = true;

    while (hasMore) {
      const result = await callNativePlugin<{
        receipts: PurchaseReceipt[];
        hasMore: boolean;
      }>("getPurchaseUpdates", { reset: isFirst ? reset : false });

      if (!result?.receipts) break;

      allReceipts.push(...result.receipts);
      result.receipts.forEach((r) => emit("iap_receipt", r));
      hasMore = result.hasMore === true;
      isFirst = false;
    }

    return allReceipts;
  }
  return [];
}

/**
 * Notify Amazon that a purchase has been fulfilled or is unavailable.
 * @param receiptId - The receipt ID from the purchase
 * @param result - "FULFILLED" or "UNAVAILABLE"
 */
export async function notifyFulfillment(
  receiptId: string,
  result: FulfillmentResult
): Promise<void> {
  await callNativePlugin("notifyFulfillment", { receiptId, fulfillmentResult: result });
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

  const [drm, ssi, receipts, userData, sdkMode] = await Promise.all([
    checkDRMLicense(),
    getSSIStatus(),
    getPurchaseUpdates(),
    getUserData(),
    getAppstoreSDKMode(),
  ]);

  return {
    available,
    platform,
    drm,
    ssi,
    userData,
    sdkMode,
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
