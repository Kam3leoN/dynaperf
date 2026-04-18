import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { serwist } from "@serwist/vite";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin } from "vite";

/** Le plugin Serwist lance un second Rollup (SW seul) : on ignore ce build pour ne pas écraser le rapport. */
function visualizerAppBuildOnly(baseOpts: Parameters<typeof visualizer>[0]): Plugin {
  const p = visualizer(baseOpts) as Plugin & {
    generateBundle?: (this: unknown, o: unknown, b: Record<string, { type?: string }>) => void | Promise<void>;
  };
  const orig = p.generateBundle;
  if (!orig) return p;
  p.generateBundle = function (outputOptions: any, outputBundle: any) {
    const chunks = Object.values(outputBundle).filter((x: any) => x?.type === "chunk");
    if (chunks.length < 3) return;
    return orig.call(this, outputOptions, outputBundle);
  };
  return p;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isGitHubPagesBuild =
    process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_PAGES === "true";
  const basePath = isGitHubPagesBuild ? "/dynaperf/" : "/";
  const analyze = process.env.ANALYZE === "1";

  const serwistPlugin = serwist({
    swSrc: "src/sw.ts",
    swDest: "sw.js",
    globDirectory: "dist",
    injectionPoint: "self.__SW_MANIFEST",
    rollupFormat: "iife",
    /** Évite de precacher des fichiers trop lourds (chunks JS volumineux) — ils restent chargés à la demande. */
    maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
    globIgnores: ["**/*.map", "**/bundle-stats.html"],
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
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      /** Serwist uniquement sur `vite build` : en `vite` dev, pas de precache / SW parasite sur :8080. */
      mode === "production" && serwistPlugin,
      analyze &&
        visualizerAppBuildOnly({
          filename: path.resolve(__dirname, "bundle-stats.html"),
          open: false,
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      /**
       * Évite le helper `__vite__mapDeps` + préchargements parallèles (CSS / gros chunks) dont un échec
       * fait échouer tout le bootstrap — problème vu sur GitHub Pages avec précache / réseau capricieux.
       */
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("maplibre-gl")) return "maplibre";
            if (id.includes("recharts")) return "recharts";
            if (id.includes("@tiptap") || id.includes("/tiptap/")) return "tiptap";
            if (id.includes("xlsx")) return "xlsx";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("framer-motion")) return "framer-motion";
            if (id.includes("@fortawesome")) return "fontawesome";
          },
        },
      },
    },
  };
});
