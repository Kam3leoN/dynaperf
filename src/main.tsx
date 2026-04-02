import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyDeviceClasses, listenDeviceChanges } from "./lib/deviceClasses";

declare const __GITHUB_PAGES_BUILD__: boolean;

const RESPONSIVE_VIEWPORT = "width=device-width, initial-scale=1, maximum-scale=5.0, viewport-fit=cover";
const DEFAULT_ROOT_FONT_SIZE = 16;
const MOBILE_SCALE_FIX_THRESHOLD = 1.15;

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

function normalizeGitHubPagesMobileScale() {
  if (typeof __GITHUB_PAGES_BUILD__ === "undefined" || !__GITHUB_PAGES_BUILD__) {
    return;
  }

  const isTouchDevice = navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isTouchDevice) {
    return;
  }

  const shortestScreenEdge = Math.min(window.screen.width || 0, window.screen.height || 0);
  const layoutWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const visualViewportScale = window.visualViewport?.scale ?? 1;
  const widthRatio = shortestScreenEdge ? layoutWidth / shortestScreenEdge : 1;
  const zoomRatio = visualViewportScale > 0 ? 1 / visualViewportScale : 1;
  const looksLikeDesktopViewport = shortestScreenEdge > 0 && shortestScreenEdge <= 600 && layoutWidth >= 800;
  const scale = Math.max(looksLikeDesktopViewport ? widthRatio : 1, widthRatio, zoomRatio, 1);

  document.documentElement.style.fontSize = `${DEFAULT_ROOT_FONT_SIZE * (scale > MOBILE_SCALE_FIX_THRESHOLD ? scale : 1)}px`;
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
applyDeviceClasses();
listenDeviceChanges();
normalizeGitHubPagesMobileScale();

window.addEventListener("resize", normalizeGitHubPagesMobileScale);
window.visualViewport?.addEventListener("resize", normalizeGitHubPagesMobileScale);

cleanupCaches().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
