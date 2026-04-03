import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isGitHubPagesBuild =
    process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_PAGES === "true";
  const basePath = isGitHubPagesBuild ? "/dynaperf/" : "/";

  const pwaPlugin = VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["pwaDynaperf.svg", "pwa-192x192.png", "pwa-512x512.png", "placeholder.svg"],
    workbox: {
      ...(isGitHubPagesBuild ? { navigateFallback: null } : { navigateFallbackDenylist: [/^\/~oauth/] }),
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

  return {
    define: {
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0"),
    },
    base: basePath,
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger(), pwaPlugin].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
