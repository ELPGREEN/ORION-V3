package app.lovable.fc2105d766374b26bdec2c651f69d311;

import android.util.Log;

import com.amazon.device.drm.LicensingService;
import com.amazon.device.drm.model.LicenseResponse;
import com.amazon.device.iap.PurchasingService;
import com.amazon.device.iap.PurchasingListener;
import com.amazon.device.iap.model.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.*;

/**
 * Capacitor Native Plugin for Amazon Appstore SDK.
 * Bridges DRM (LicensingService), IAP (PurchasingService), and SSI.
 *
 * Register in MainActivity:
 *   public void onCreate(Bundle savedInstanceState) {
 *       registerPlugin(AmazonAppstoreSDKPlugin.class);
 *       super.onCreate(savedInstanceState);
 *   }
 */
@CapacitorPlugin(name = "AmazonAppstoreSDK")
public class AmazonAppstoreSDKPlugin extends Plugin {

    private static final String TAG = "AmazonAppstoreSDK";

    // Pending calls waiting for async SDK callbacks
    private PluginCall pendingPurchaseCall = null;
    private PluginCall pendingUserDataCall = null;
    private PluginCall pendingProductDataCall = null;
    private PluginCall pendingPurchaseUpdatesCall = null;

    @Override
    public void load() {
        // Register the PurchasingListener for IAP callbacks
        PurchasingService.registerListener(getContext(), new PurchasingListener() {
            @Override
            public void onUserDataResponse(UserDataResponse response) {
                if (pendingUserDataCall == null) return;
                try {
                    if (response.getRequestStatus() == UserDataResponse.RequestStatus.SUCCESSFUL) {
                        UserData userData = response.getUserData();
                        JSObject result = new JSObject();
                        result.put("userId", userData.getUserId());
                        result.put("marketplace", userData.getMarketplace());
                        pendingUserDataCall.resolve(result);
                    } else {
                        pendingUserDataCall.reject("getUserData failed: " + response.getRequestStatus());
                    }
                } catch (Exception e) {
                    pendingUserDataCall.reject("getUserData error", e);
                } finally {
                    pendingUserDataCall = null;
                }
            }

            @Override
            public void onProductDataResponse(ProductDataResponse response) {
                if (pendingProductDataCall == null) return;
                try {
                    if (response.getRequestStatus() == ProductDataResponse.RequestStatus.SUCCESSFUL) {
                        Map<String, Product> products = response.getProductData();
                        JSONArray items = new JSONArray();
                        for (Product p : products.values()) {
                            JSONObject item = new JSONObject();
                            item.put("sku", p.getSku());
                            item.put("type", p.getProductType().name());
                            item.put("title", p.getTitle());
                            item.put("description", p.getDescription());
                            item.put("price", p.getPrice());
                            if (p.getSmallIconUrl() != null) {
                                item.put("smallIconUrl", p.getSmallIconUrl());
                            }
                            items.put(item);
                        }
                        JSObject result = new JSObject();
                        result.put("items", items);
                        pendingProductDataCall.resolve(result);
                    } else {
                        pendingProductDataCall.reject("getProductData failed: " + response.getRequestStatus());
                    }
                } catch (Exception e) {
                    pendingProductDataCall.reject("getProductData error", e);
                } finally {
                    pendingProductDataCall = null;
                }
            }

            @Override
            public void onPurchaseResponse(PurchaseResponse response) {
                if (pendingPurchaseCall == null) return;
                try {
                    JSObject result = new JSObject();
                    result.put("status", response.getRequestStatus().name());
                    Receipt receipt = response.getReceipt();
                    if (receipt != null) {
                        JSObject receiptObj = new JSObject();
                        receiptObj.put("receiptId", receipt.getReceiptId());
                        receiptObj.put("sku", receipt.getSku());
                        receiptObj.put("itemType", receipt.getProductType().name());
                        receiptObj.put("purchaseDate", receipt.getPurchaseDate().toString());
                        if (receipt.getCancelDate() != null) {
                            receiptObj.put("cancelDate", receipt.getCancelDate().toString());
                        }
                        result.put("receipt", receiptObj);
                    }
                    pendingPurchaseCall.resolve(result);
                } catch (Exception e) {
                    pendingPurchaseCall.reject("purchase error", e);
                } finally {
                    pendingPurchaseCall = null;
                }
            }

            @Override
            public void onPurchaseUpdatesResponse(PurchaseUpdatesResponse response) {
                if (pendingPurchaseUpdatesCall == null) return;
                try {
                    if (response.getRequestStatus() == PurchaseUpdatesResponse.RequestStatus.SUCCESSFUL) {
                        List<Receipt> receipts = response.getReceipts();
                        JSONArray arr = new JSONArray();
                        for (Receipt r : receipts) {
                            JSONObject obj = new JSONObject();
                            obj.put("receiptId", r.getReceiptId());
                            obj.put("sku", r.getSku());
                            obj.put("itemType", r.getProductType().name());
                            obj.put("purchaseDate", r.getPurchaseDate().toString());
                            if (r.getCancelDate() != null) {
                                obj.put("cancelDate", r.getCancelDate().toString());
                            }
                            arr.put(obj);
                        }
                        JSObject result = new JSObject();
                        result.put("receipts", arr);
                        result.put("hasMore", response.hasMore());
                        pendingPurchaseUpdatesCall.resolve(result);
                    } else {
                        pendingPurchaseUpdatesCall.reject("getPurchaseUpdates failed: " + response.getRequestStatus());
                    }
                } catch (Exception e) {
                    pendingPurchaseUpdatesCall.reject("getPurchaseUpdates error", e);
                } finally {
                    pendingPurchaseUpdatesCall = null;
                }
            }
        });

        Log.i(TAG, "Amazon Appstore SDK Plugin loaded");
    }

    // ─── User Data ───

    @PluginMethod
    public void getUserData(PluginCall call) {
        pendingUserDataCall = call;
        call.setKeepAlive(true);
        PurchasingService.getUserData();
    }

    // ─── SDK Mode ───

    @PluginMethod
    public void getAppstoreSDKMode(PluginCall call) {
        try {
            boolean isSandbox = PurchasingService.IS_SANDBOX_MODE;
            JSObject result = new JSObject();
            result.put("mode", isSandbox ? "SANDBOX" : "PRODUCTION");
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("mode", "UNKNOWN");
            call.resolve(result);
        }
    }

    // ─── Enable Pending Purchases (Amazon Kids) ───

    @PluginMethod
    public void enablePendingPurchases(PluginCall call) {
        try {
            PurchasingService.enablePendingPurchases();
            call.resolve();
        } catch (Exception e) {
            Log.w(TAG, "enablePendingPurchases not available", e);
            call.resolve();
        }
    }

    // ─── DRM ───

    @PluginMethod
    public void checkLicense(PluginCall call) {
        try {
            // LicensingService.verifyLicense uses a callback via LicensingListener
            // For simplicity, we use the synchronous response pattern
            LicensingService.verifyLicense(getContext(), (response) -> {
                JSObject result = new JSObject();
                result.put("status", response.getRequestStatus().name());
                result.put("checkedAt", new Date().toString());
                call.resolve(result);
            });
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("status", "ERROR");
            result.put("checkedAt", new Date().toString());
            call.resolve(result);
        }
    }

    // ─── IAP ───

    @PluginMethod
    public void getProductData(PluginCall call) {
        JSArray skusArr = call.getArray("skus");
        if (skusArr == null) {
            call.reject("Missing skus parameter");
            return;
        }
        try {
            Set<String> skuSet = new HashSet<>();
            for (int i = 0; i < skusArr.length(); i++) {
                skuSet.add(skusArr.getString(i));
            }
            pendingProductDataCall = call;
            call.setKeepAlive(true);
            PurchasingService.getProductData(skuSet);
        } catch (Exception e) {
            call.reject("getProductData error", e);
        }
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String sku = call.getString("sku");
        if (sku == null) {
            call.reject("Missing sku parameter");
            return;
        }
        pendingPurchaseCall = call;
        call.setKeepAlive(true);
        PurchasingService.purchase(sku);
    }

    @PluginMethod
    public void getPurchaseUpdates(PluginCall call) {
        boolean reset = call.getBoolean("reset", false);
        pendingPurchaseUpdatesCall = call;
        call.setKeepAlive(true);
        PurchasingService.getPurchaseUpdates(reset);
    }

    @PluginMethod
    public void notifyFulfillment(PluginCall call) {
        String receiptId = call.getString("receiptId");
        String fulfillmentResult = call.getString("fulfillmentResult", "FULFILLED");
        if (receiptId == null) {
            call.reject("Missing receiptId");
            return;
        }
        FulfillmentResult result = "UNAVAILABLE".equals(fulfillmentResult)
            ? FulfillmentResult.UNAVAILABLE
            : FulfillmentResult.FULFILLED;
        PurchasingService.notifyFulfillment(receiptId, result);
        call.resolve();
    }

    // ─── SSI (Simple Sign-In) ───

    @PluginMethod
    public void signIn(PluginCall call) {
        // Amazon SSI is handled via the Appstore SDK signIn flow
        // This requires additional native UI integration
        call.reject("SSI signIn requires native Amazon UI — implement in Activity");
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void getSignInStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("signedIn", false);
        call.resolve(result);
    }
}
