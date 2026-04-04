import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, NetworkFirst, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => /^https:\/\/.*\.supabase\.co\/rest\/v1\//.test(url.href),
      handler: new NetworkFirst({
        cacheName: "supabase-api-cache",
        plugins: [
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
        ],
        networkTimeoutSeconds: 5,
      }),
    },
    {
      matcher: ({ url }) => /^https:\/\/basemaps\.cartocdn\.com\//.test(url.href),
      handler: new CacheFirst({
        cacheName: "map-tiles-cache",
        plugins: [
          new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }),
        ],
      }),
    },
    {
      matcher: ({ url }) => /^https:\/\/fonts\.googleapis\.com\//.test(url.href),
      handler: new CacheFirst({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
        ],
      }),
    },
    {
      matcher: ({ url }) => /^https:\/\/fonts\.gstatic\.com\//.test(url.href),
      handler: new CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
