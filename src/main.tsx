import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

declare const __GITHUB_PAGES_BUILD__: boolean;

async function cleanupGitHubPagesCaches() {
  if (!__GITHUB_PAGES_BUILD__ || typeof window === "undefined") {
    return;
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
  }
}

cleanupGitHubPagesCaches().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
