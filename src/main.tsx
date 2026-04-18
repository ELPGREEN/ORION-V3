import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initFirebaseAnalytics } from "@/lib/firebase";
import { voiceManager } from "@/lib/voice/voiceManager";
import { voicePerformanceDashboard } from "@/lib/voice/voicePerformanceDashboard";

// Initialize Firebase Analytics in background
initFirebaseAnalytics().catch(() => {});

// Initialize voice systems
const initializeVoiceSystems = async () => {
  try {
    // Initialize voice manager with recommended settings
    await voiceManager.startListening();
    
    // Initialize performance dashboard for monitoring
    voicePerformanceDashboard.init();
    
    console.log('[Voice Systems] ✅ Voice manager and performance dashboard initialized');
  } catch (error) {
    console.error('[Voice Systems] ❌ Failed to initialize voice systems:', error);
  }
};

// Initialize voice systems in background
initializeVoiceSystems().catch(() => {});

// Prevent service worker from registering in iframes or Lovable preview
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

createRoot(document.getElementById("root")!).render(<App />);
