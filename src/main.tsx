import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

declare const __GITHUB_PAGES_BUILD__: boolean;

const RESPONSIVE_VIEWPORT = "width=device-width, initial-scale=1, maximum-scale=5.0, viewport-fit=cover";

function ensureResponsiveViewport() {
  let viewportMeta = document.querySelector('meta[name="viewport"]');

  if (!viewportMeta) {
    viewportMeta = document.createElement("meta");
    viewportMeta.setAttribute("name", "viewport");
    document.head.prepend(viewportMeta);
  }

  if (viewportMeta.getAttribute("content") !== RESPONSIVE_VIEWPORT) {
    viewportMeta.setAttribute("content", RESPONSIVE_VIEWPORT);
  }
}

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

ensureResponsiveViewport();

cleanupCaches().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
