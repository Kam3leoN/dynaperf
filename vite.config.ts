import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { serwist } from "@serwist/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isGitHubPagesBuild =
    process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_PAGES === "true";
  const basePath = isGitHubPagesBuild ? "/dynaperf/" : "/";

  const serwistPlugin = serwist({
    swSrc: "src/sw.ts",
    swDest: "sw.js",
    globDirectory: "dist",
    injectionPoint: "self.__SW_MANIFEST",
    rollupFormat: "iife",
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
    plugins: [react(), mode === "development" && componentTagger(), serwistPlugin].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
