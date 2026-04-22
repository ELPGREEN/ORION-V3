import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initFirebaseAnalytics } from "@/lib/firebase";

// Initialize Firebase Analytics in background
initFirebaseAnalytics().catch(() => {});

// NOTE: Voice subsystems (voiceManager / voicePerformanceDashboard) are no
// longer auto-started here — that caused the floating voice panel to appear
// on every route. Voice listening + the optional performance panel are now
// activated only inside the Orion overlay (GlobalOrionListener), where the
// user can toggle the panel on/off.

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
