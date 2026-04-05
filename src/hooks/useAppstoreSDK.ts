/**
 * ─── useAppstoreSDK Hook ───
 * React hook for Amazon Appstore SDK (DRM, IAP, SSI).
 */

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  type AppstoreSDKState,
  type ProductItem,
  type PurchaseResult,
  type DRMStatus,
  type SSIStatus,
  getAppstoreState,
  checkDRMLicense,
  getProductData,
  purchase,
  getPurchaseUpdates,
  notifyFulfillment,
  getSSIStatus,
  signInWithAmazon,
  signOutAmazon,
  onAppstoreEvent,
  ORION_SKUS,
} from "@/lib/amazon/appstore-sdk";

export function useAppstoreSDK() {
  const { toast } = useToast();
  const [state, setState] = useState<AppstoreSDKState | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Initialize
  useEffect(() => {
    getAppstoreState()
      .then(setState)
      .finally(() => setLoading(false));
  }, []);

  // Listen for events
  useEffect(() => {
    const unsubs = [
      onAppstoreEvent("drm_check", (data) => {
        setState((s) => s ? { ...s, drm: data as DRMStatus } : s);
      }),
      onAppstoreEvent("ssi_status", (data) => {
        setState((s) => s ? { ...s, ssi: data as SSIStatus } : s);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Load products
  const loadProducts = useCallback(async () => {
    const skus = Object.values(ORION_SKUS);
    const items = await getProductData(skus);
    setProducts(items);
    return items;
  }, []);

  // Purchase
  const handlePurchase = useCallback(async (sku: string): Promise<PurchaseResult> => {
    setPurchasing(true);
    try {
      const result = await purchase(sku);
      if (result.status === "SUCCESSFUL" && result.receipt) {
        await notifyFulfillment(result.receipt.receiptId, true);
        toast({ title: "Compra realizada!", description: `SKU: ${sku}` });
        // Refresh state
        const newState = await getAppstoreState();
        setState(newState);
      } else if (result.status === "NOT_SUPPORTED") {
        toast({ title: "IAP indisponível", description: "Disponível apenas no Amazon Appstore.", variant: "destructive" });
      } else if (result.status === "ALREADY_PURCHASED") {
        toast({ title: "Já adquirido", description: "Você já possui este item." });
      } else if (result.status === "FAILED") {
        toast({ title: "Compra falhou", description: "Tente novamente.", variant: "destructive" });
      }
      return result;
    } finally {
      setPurchasing(false);
    }
  }, [toast]);

  // DRM check
  const recheckLicense = useCallback(async () => {
    const drm = await checkDRMLicense();
    setState((s) => s ? { ...s, drm } : s);
    return drm;
  }, []);

  // SSI
  const handleSignIn = useCallback(async () => {
    const ssi = await signInWithAmazon();
    setState((s) => s ? { ...s, ssi } : s);
    if (ssi.signedIn) {
      toast({ title: "Login Amazon", description: `Bem-vindo, ${ssi.displayName || ssi.email}!` });
    }
    return ssi;
  }, [toast]);

  const handleSignOut = useCallback(async () => {
    await signOutAmazon();
    setState((s) => s ? { ...s, ssi: { signedIn: false } } : s);
    toast({ title: "Desconectado", description: "Amazon Sign-In desconectado." });
  }, [toast]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    const receipts = await getPurchaseUpdates(true);
    setState((s) => s ? { ...s, purchasedSkus: receipts.map((r) => r.sku) } : s);
    toast({ title: `${receipts.length} compras restauradas` });
    return receipts;
  }, [toast]);

  return {
    state,
    products,
    loading,
    purchasing,
    loadProducts,
    handlePurchase,
    recheckLicense,
    handleSignIn,
    handleSignOut,
    restorePurchases,
  };
}
