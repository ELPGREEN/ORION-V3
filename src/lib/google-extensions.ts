/**
 * Google Extensions — Barrel export
 * All Google open-source integrations in one place.
 */

// Firebase
export { firebaseApp, initFirebaseAnalytics, firebaseStorage } from "./firebase";
export { requestNotificationPermission, onForegroundMessage, isFCMSupported } from "./firebase-messaging";
export { trackEvent, setAnalyticsUser, setAnalyticsUserProperties, OrionAnalytics } from "./firebase-analytics-events";

// Google reCAPTCHA v3
export { loadRecaptcha, executeRecaptcha, isRecaptchaAvailable } from "./google-recaptcha";

// Google Maps / Geocoding
export { loadGoogleMaps, geocodeAddress, reverseGeocode, isGoogleMapsAvailable } from "./google-maps";

// Google OAuth (existing)
export { useGoogleOAuth } from "@/hooks/useGoogleOAuth";
