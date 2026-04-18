import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import "./index.css";
import "@/material/materialWebReact";
import { applyDeviceClasses, listenDeviceChanges } from "./lib/deviceClasses";
import { purgeServiceWorkerAndCaches, scheduleChunkLoadRecovery } from "./lib/chunkLoadRecovery";

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
  const isLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  /** Domaine personnalisé (ex. GitHub Pages en CNAME) ou hébergement type cPanel : sans ça, shouldRunCleanup restait false et un vieux SW pouvait figer l’UI. */
  const shouldRunCleanup =
    isGitHubPages || isPreviewHost || isInIframe || (import.meta.env.PROD && !isLocalhost);

  if (!shouldRunCleanup) {
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
  /** En dev (`npm run dev`), ne pas enregistrer le SW : sinon caches / precache obsolètes → chunks 404, écran « mise à jour » bloqué. */
  if (!import.meta.env.PROD) return;

  const isLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  /**
   * `vite preview` (ex. :8080) a `import.meta.env.PROD === true` : Serwist precache d’anciens builds,
   * les chunks changent à chaque `npm run build` → imports dynamiques en échec → RootErrorBoundary « Mise à jour… ».
   * Sur machine locale : pas de SW ; on purge au cas où un vieux SW traîne encore.
   */
  if (isLocalhost) {
    await purgeServiceWorkerAndCaches();
    return;
  }

  // Only register SW in production, outside iframes and preview hosts
  if (isPreviewHost || isInIframe) return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const { Serwist } = await import("@serwist/window");
    const base = import.meta.env.BASE_URL;
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    const swUrl = `${normalizedBase}sw.js`;
    const sw = new Serwist(swUrl, { scope: normalizedBase, type: "classic" });
    await sw.register();

    /** Forcer une relecture du script SW au retour sur l’onglet (navigateur ne vérifie pas tout seul souvent). */
    const pingSwUpdate = () => {
      void sw.update();
    };
    pingSwUpdate();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") pingSwUpdate();
    });
    window.addEventListener("focus", pingSwUpdate);
  } catch (e) {
    console.warn("SW registration failed:", e);
  }
}

void (async function bootstrap() {
  /** Purge SW localhost : voir `src/entry.tsx` + `initShell.ts` (avant import de ce module). */
  ensureResponsiveViewport();
  applyDeviceClasses();
  listenDeviceChanges();

  const el = document.getElementById("root");
  if (!el) {
    console.error("[main] Élément #root introuvable");
    return;
  }

  /** Monter l’app tout de suite : ne pas attendre `cleanupCaches` (peut être lent / bloquant sur certains hôtes). */
  createRoot(el).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>,
  );
  void registerSW();

  await cleanupCaches();
})();

/**
 * Échecs de chunks après déploiement (hashes changés) : souvent `unhandledrejection`
 * sur l’import dynamique, pas seulement `error` sur window.
 */
window.addEventListener("error", (e) => {
  const ev = e as ErrorEvent;
  scheduleChunkLoadRecovery(ev.error ?? ev.message ?? "");
});

window.addEventListener("unhandledrejection", (e) => {
  if (scheduleChunkLoadRecovery(e.reason)) {
    e.preventDefault();
  }
});
