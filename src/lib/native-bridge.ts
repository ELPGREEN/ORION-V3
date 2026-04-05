/**
 * ─── Capacitor Native Bridge ───
 * Unified access to native device capabilities via Capacitor plugins.
 * Falls back to Web APIs when running in browser.
 */

import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

// ─── Camera ───
export async function takePhoto(): Promise<string | null> {
  if (!isNativePlatform()) return null;
  try {
    const mod = await import('@capacitor/camera');
    const photo = await mod.Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: mod.CameraResultType.Base64,
      source: mod.CameraSource.Camera,
    });
    return photo.base64String || null;
  } catch {
    return null;
  }
}

// ─── Geolocation ───
export async function getCurrentPosition() {
  const { Geolocation } = await import('@capacitor/geolocation');
  const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
}

// ─── Device Info ───
export async function getDeviceInfo() {
  const { Device } = await import('@capacitor/device');
  return Device.getInfo();
}

export async function getBatteryInfo() {
  const { Device } = await import('@capacitor/device');
  return Device.getBatteryInfo();
}

// ─── Network ───
export async function getNetworkStatus() {
  const { Network } = await import('@capacitor/network');
  return Network.getStatus();
}

// ─── Haptics ───
export async function vibrateDevice(duration: number = 300) {
  if (!isNativePlatform()) return;
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Medium });
}

export async function hapticsNotification(type: 'success' | 'warning' | 'error' = 'success') {
  if (!isNativePlatform()) return;
  const { Haptics, NotificationType } = await import('@capacitor/haptics');
  const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
  await Haptics.notification({ type: map[type] });
}

// ─── Push Notifications ───
export async function registerPushNotifications() {
  if (!isNativePlatform()) return null;
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive === 'granted') {
    await PushNotifications.register();
    return new Promise<string>((resolve) => {
      PushNotifications.addListener('registration', (token) => resolve(token.value));
    });
  }
  return null;
}

// ─── Local Notifications ───
export async function scheduleLocalNotification(title: string, body: string, delaySeconds = 0) {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.schedule({
    notifications: [{
      title, body,
      id: Date.now(),
      schedule: delaySeconds > 0 ? { at: new Date(Date.now() + delaySeconds * 1000) } : undefined,
    }],
  });
}

// ─── Motion / Sensors ───
export async function startMotionTracking(callback: (data: { x: number; y: number; z: number }) => void) {
  const { Motion } = await import('@capacitor/motion');
  return Motion.addListener('accel', (event: any) => {
    callback({
      x: event.acceleration?.x ?? 0,
      y: event.acceleration?.y ?? 0,
      z: event.acceleration?.z ?? 0,
    });
  });
}

// ─── Status Bar ───
export async function setStatusBarDark() {
  if (!isNativePlatform()) return;
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setBackgroundColor({ color: '#0a0a0f' });
}

// ─── App lifecycle ───
export async function onAppStateChange(callback: (isActive: boolean) => void) {
  const { App } = await import('@capacitor/app');
  App.addListener('appStateChange', (state) => callback(state.isActive));
}

// ─── Summary for Orion ───
export async function getDeviceSummary(): Promise<string> {
  try {
    const info = await getDeviceInfo();
    const battery = await getBatteryInfo();
    const network = await getNetworkStatus();
    const platform = getPlatform();
    
    const parts = [
      `Plataforma: ${platform} (${info.model || info.operatingSystem})`,
      `OS: ${info.operatingSystem} ${info.osVersion}`,
      battery.batteryLevel !== undefined ? `Bateria: ${Math.round(battery.batteryLevel * 100)}%${battery.isCharging ? ' (carregando)' : ''}` : null,
      `Rede: ${network.connected ? network.connectionType : 'desconectado'}`,
    ].filter(Boolean);
    
    return parts.join('. ');
  } catch {
    return `Plataforma: ${getPlatform()}`;
  }
}
