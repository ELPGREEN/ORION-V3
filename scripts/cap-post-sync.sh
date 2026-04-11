#!/bin/bash
# ═══ Orion — Capacitor Post-Sync Auto-Config ═══
# Run after: npx cap sync
# This script automatically patches the Android project for Amazon Appstore SDK,
# native plugins (Camera, Speech), and production-ready config.

set -e
ANDROID_DIR="android"
APP_DIR="$ANDROID_DIR/app"
MANIFEST="$APP_DIR/src/main/AndroidManifest.xml"
BUILD_GRADLE="$APP_DIR/build.gradle"
PROGUARD="$APP_DIR/proguard-rules.pro"
MAIN_ACTIVITY="$APP_DIR/src/main/java/app/lovable/fc2105d766374b26bdec2c651f69d311/MainActivity.java"
ASSETS_DIR="$APP_DIR/src/main/assets"

echo "🧠 Orion Post-Sync: Auto-configuring Android project..."

# ─── 1. Patch build.gradle — Amazon Appstore SDK dependency ───
if [ -f "$BUILD_GRADLE" ]; then
  if ! grep -q "amazon-appstore-sdk" "$BUILD_GRADLE"; then
    echo "  📦 Adding Amazon Appstore SDK dependency..."
    sed -i "/^dependencies {/a\\    implementation 'com.amazon.device:amazon-appstore-sdk:3.+'" "$BUILD_GRADLE"
  fi
  # Camera2 API for CameraStreamPlugin
  if ! grep -q "camera2" "$BUILD_GRADLE"; then
    echo "  📷 Adding Camera2 dependency..."
    sed -i "/^dependencies {/a\\    implementation 'androidx.camera:camera-camera2:1.3.1'" "$BUILD_GRADLE"
  fi
  echo "  ✅ build.gradle patched"
else
  echo "  ⚠️  build.gradle not found — run 'npx cap add android' first"
fi

# ─── 2. Patch AndroidManifest.xml — Amazon receivers + queries ───
if [ -f "$MANIFEST" ]; then
  if ! grep -q "amazon.device.iap.ResponseReceiver" "$MANIFEST"; then
    echo "  📡 Adding Amazon IAP/DRM receivers..."
    sed -i '/<\/application>/i\
        <!-- Amazon IAP ResponseReceiver -->\
        <receiver\
            android:name="com.amazon.device.iap.ResponseReceiver"\
            android:exported="false"\
            android:permission="com.amazon.inapp.purchasing.Permission.NOTIFY">\
            <intent-filter>\
                <action android:name="com.amazon.inapp.purchasing.NOTIFY" />\
            </intent-filter>\
        </receiver>\
        <!-- Amazon DRM ResponseReceiver -->\
        <receiver\
            android:name="com.amazon.device.drm.ResponseReceiver"\
            android:exported="false"\
            android:permission="com.amazon.drm.Permission.NOTIFY">\
            <intent-filter>\
                <action android:name="com.amazon.drm.NOTIFY" />\
            </intent-filter>\
        </receiver>' "$MANIFEST"
  fi

  if ! grep -q "com.amazon.sdktestclient" "$MANIFEST"; then
    echo "  🔍 Adding Amazon package queries..."
    sed -i '/<\/manifest>/i\
    <queries>\
        <package android:name="com.amazon.sdktestclient" />\
        <package android:name="com.amazon.venezia" />\
    </queries>' "$MANIFEST"
  fi

  # Camera permission
  if ! grep -q "android.permission.CAMERA" "$MANIFEST"; then
    echo "  📷 Adding Camera permission..."
    sed -i '/<\/manifest>/i\
    <uses-permission android:name="android.permission.CAMERA" />\
    <uses-permission android:name="android.permission.RECORD_AUDIO" />\
    <uses-permission android:name="android.permission.BLUETOOTH" />\
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />\
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />' "$MANIFEST"
  fi

  echo "  ✅ AndroidManifest.xml patched"
else
  echo "  ⚠️  AndroidManifest.xml not found"
fi

# ─── 3. Patch MainActivity.java — Register all native plugins ───
if [ -f "$MAIN_ACTIVITY" ]; then
  if ! grep -q "AmazonAppstoreSDKPlugin" "$MAIN_ACTIVITY"; then
    echo "  🔌 Registering native plugins in MainActivity..."
    cat > "$MAIN_ACTIVITY" << 'JAVA'
package app.lovable.fc2105d766374b26bdec2c651f69d311;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AmazonAppstoreSDKPlugin.class);
        registerPlugin(CameraStreamPlugin.class);
        registerPlugin(NativeSpeechPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
JAVA
    echo "  ✅ MainActivity.java patched"
  fi
else
  echo "  ⚠️  MainActivity.java not found"
fi

# ─── 4. ProGuard rules ───
if [ -f "$PROGUARD" ]; then
  if ! grep -q "com.amazon.device" "$PROGUARD"; then
    echo "  🛡️ Adding ProGuard rules..."
    cat >> "$PROGUARD" << 'PRO'

# ═══ Amazon Appstore SDK ═══
-dontwarn com.amazon.device.**
-keep class com.amazon.device.** { *; }
-keep class com.amazon.venezia.** { *; }

# ═══ Orion Native Plugins ═══
-keep class app.lovable.fc2105d766374b26bdec2c651f69d311.** { *; }
PRO
    echo "  ✅ ProGuard rules added"
  fi
fi

# ─── 5. Create assets dir for AppstoreAuthenticationKey.pem ───
mkdir -p "$ASSETS_DIR"
if [ ! -f "$ASSETS_DIR/AppstoreAuthenticationKey.pem" ]; then
  echo "  ⚠️  AppstoreAuthenticationKey.pem not found in $ASSETS_DIR"
  echo "     Download from Amazon Developer Console → Your App → DRM section"
  echo "     Place at: $ASSETS_DIR/AppstoreAuthenticationKey.pem"
fi

echo ""
echo "🚀 Orion Post-Sync complete!"
echo "   Next: npx cap run android"
