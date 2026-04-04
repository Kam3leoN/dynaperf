import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import "./index.css";
import { applyDeviceClasses, listenDeviceChanges } from "./lib/deviceClasses";

const RESPONSIVE_VIEWPORT =
  "width=device-width, initial-scale=1.0, minimum-scale=1, maximum-scale=5, viewport-fit=cover, interactive-widget=resizes-content";

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
  const isGitHubPages = window.location.hostname.endsWith("github.io");

  if (!isGitHubPages && !isPreviewHost && !isInIframe) {
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

async function registerSW() {
  // Only register SW in production, outside iframes and preview hosts
  if (isPreviewHost || isInIframe) return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const { Serwist } = await import("@serwist/window");
    const sw = new Serwist("/sw.js", { scope: "/", type: "classic" });
    sw.register();
  } catch (e) {
    console.warn("SW registration failed:", e);
  }
}

ensureResponsiveViewport();
applyDeviceClasses();
listenDeviceChanges();

cleanupCaches().finally(() => {
  const el = document.getElementById("root");
  if (!el) {
    console.error("[main] Élément #root introuvable");
    return;
  }
  createRoot(el).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>,
  );
  registerSW();
});
