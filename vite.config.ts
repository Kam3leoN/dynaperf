import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

function createGitHubPagesServiceWorkerCleanupPlugin(enabled: boolean, basePath: string): Plugin | null {
  if (!enabled) return null;

  const serviceWorkerCleanupSource = `self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

    await self.registration.unregister();

    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(
      clientsList.map((client) =>
        "navigate" in client ? client.navigate(client.url) : Promise.resolve(undefined)
      )
    );
  })());
});

self.addEventListener("fetch", () => {});
`;

  const registerCleanupSource = `if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const cacheNames = "caches" in window ? await caches.keys() : [];

    if (!registrations.length && !cacheNames.length) {
      return;
    }

    try {
      await navigator.serviceWorker.register("${basePath}sw.js", { scope: "${basePath}" });
    } catch {
      // noop
    }

    if ("caches" in window) {
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  });
}
`;

  const inlineCleanupSource = `(function () {
  if (!window.location.hostname.endsWith("github.io")) {
    return;
  }

  const cleanupKey = "dynaperf-github-cleanup-v4";

  window.addEventListener("load", async () => {
    try {
      const registrations = "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistrations()
        : [];
      const cacheNames = "caches" in window ? await caches.keys() : [];

      if (!registrations.length && !cacheNames.length) {
        return;
      }

      await Promise.all(registrations.map((registration) => registration.unregister()));
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

      if (sessionStorage.getItem(cleanupKey) !== "done") {
        sessionStorage.setItem(cleanupKey, "done");
        window.location.reload();
      }
    } catch {
      // noop
    }
  }, { once: true });
})();`;

  return {
    name: "github-pages-service-worker-cleanup",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "</head>",
        `    <script>${inlineCleanupSource}</script>\n    <script src="${basePath}registerSW.js"></script>\n  </head>`
      );
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: serviceWorkerCleanupSource,
      });

      this.emitFile({
        type: "asset",
        fileName: "registerSW.js",
        source: registerCleanupSource,
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isGitHubPagesBuild =
    process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_PAGES === "true";
  const basePath = isGitHubPagesBuild ? "/dynaperf/" : "/";
  const pwaPlugin = VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["pwaDynaperf.svg", "pwa-192x192.png", "pwa-512x512.png", "placeholder.svg"],
    workbox: {
      // CRITICAL: no navigateFallback on GitHub Pages to avoid caching stale HTML
      ...(isGitHubPagesBuild ? {} : { navigateFallbackDenylist: [/^\/~oauth/] }),
      ...(isGitHubPagesBuild ? { navigateFallback: null } : {}),
      globPatterns: ["**/*.{js,css,ico,png,svg,woff,woff2}"],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      skipWaiting: true,
      clientsClaim: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "supabase-api-cache",
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            networkTimeoutSeconds: 5,
          },
        },
        {
          urlPattern: /^https:\/\/basemaps\.cartocdn\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "map-tiles-cache",
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts-stylesheets",
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts-webfonts",
            expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    manifest: {
      name: "DynaPerf — Monitoring audits partenaires",
      short_name: "DynaPerf",
      description: "Tableau de bord de suivi des audits partenaires agences",
      theme_color: "#0E222C",
      background_color: "#ffffff",
      display: "standalone",
      scope: basePath,
      start_url: basePath,
      icons: [
        {
          src: "pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },
  });
  const githubPagesCleanupPlugin = createGitHubPagesServiceWorkerCleanupPlugin(isGitHubPagesBuild, basePath);

  return {
    define: {
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0"),
      __GITHUB_PAGES_BUILD__: JSON.stringify(isGitHubPagesBuild),
    },
    base: basePath,
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger(), pwaPlugin, isGitHubPagesBuild && githubPagesCleanupPlugin].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
