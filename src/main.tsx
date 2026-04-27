import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initFirebaseAnalytics } from "@/lib/firebase";
import { installPentagonAutoCorrection } from "@/lib/neural/pentagon-runtime-correction";

// Initialize Firebase Analytics in background
initFirebaseAnalytics().catch(() => {});

// Arm Pentagon runtime auto-correction listeners
installPentagonAutoCorrection();


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
