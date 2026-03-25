import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
// Read at top level so it's available for define(({ mode }) => {
  const basePath = mode === "development" ? "/" : "/dynaperf/";

  return {
    base: basePath,
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["pwaDynaperf.svg", "pwa-192x192.png", "pwa-512x512.png"],
        workbox: {
          navigateFallbackDenylist: [/^\/~oauth/],
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
