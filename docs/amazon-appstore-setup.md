# Amazon Appstore SDK — Setup Guide

## 1. Gradle Dependency

Add to `android/app/build.gradle`:

```groovy
dependencies {
    implementation 'com.amazon.device:amazon-appstore-sdk:3.+'
}

repositories {
    maven { url 'https://maven.pkg.github.com/nicksenger/glern' }
}
```

## 2. AndroidManifest.xml

Add inside `<application>`:

```xml
<!-- IAP ResponseReceiver -->
<receiver
    android:name="com.amazon.device.iap.ResponseReceiver"
    android:exported="false"
    android:permission="com.amazon.inapp.purchasing.Permission.NOTIFY">
    <intent-filter>
        <action android:name="com.amazon.inapp.purchasing.NOTIFY" />
    </intent-filter>
</receiver>

<!-- DRM ResponseReceiver -->
<receiver
    android:name="com.amazon.device.drm.ResponseReceiver"
    android:exported="false"
    android:permission="com.amazon.drm.Permission.NOTIFY">
    <intent-filter>
        <action android:name="com.amazon.drm.NOTIFY" />
    </intent-filter>
</receiver>
```

Add inside `<manifest>` (for Amazon App Tester and Appstore queries):

```xml
<queries>
    <package android:name="com.amazon.sdktestclient" />
    <package android:name="com.amazon.venezia" />
</queries>
```

## 3. Register Capacitor Plugin

In `MainActivity.java`:

```java
import app.lovable.fc2105d766374b26bdec2c651f69d311.AmazonAppstoreSDKPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AmazonAppstoreSDKPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

## 4. AppstoreAuthenticationKey.pem

Place your app's DRM public key at:

```
android/app/src/main/assets/AppstoreAuthenticationKey.pem
```

Download from: Amazon Developer Console → Your App → DRM section.

## 5. ProGuard Rules

Add to `android/app/proguard-rules.pro`:

```
-dontwarn com.amazon.device.**
-keep class com.amazon.device.** { *; }
-keep class com.amazon.venezia.** { *; }
```

## 6. Testing with Amazon App Tester

1. Install **Amazon App Tester** on your Fire device
2. Create `amazon.sdktester.json` with your SKUs and place in `/sdcard/`
3. The SDK will auto-detect sandbox mode (`PurchasingService.IS_SANDBOX_MODE`)
4. Use `getAppstoreSDKMode()` in your app to display sandbox/production status

## 7. SKU Configuration

Current SKUs (must match Amazon Developer Console):

| SKU | Type | Description |
|-----|------|-------------|
| `orion_professional_monthly` | SUBSCRIPTION | Plano Professional mensal |
| `orion_business_monthly` | SUBSCRIPTION | Plano Business mensal |
| `orion_enterprise_monthly` | SUBSCRIPTION | Plano Enterprise mensal |
| `orion_tokens_500` | CONSUMABLE | 500 tokens Orion |
| `orion_tokens_2000` | CONSUMABLE | 2000 tokens Orion |
