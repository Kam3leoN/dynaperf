import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

declare const __GITHUB_PAGES_BUILD__: boolean;

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

async function cleanupCaches() {
  if (typeof __GITHUB_PAGES_BUILD__ !== "undefined" && __GITHUB_PAGES_BUILD__) {
    // GitHub Pages build: always clean up old SW caches
  } else if (!isPreviewHost && !isInIframe) {
    // Production non-iframe: keep PWA working
    return;
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

cleanupCaches().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
