/**
 * Point d’entrée : aucun module applicatif (React, routes…) n’est chargé tant que le SW / caches
 * sur localhost n’ont pas été traités — évite les échecs d’import dynamique avant purge.
 */
import { applySwResetFromQuery, ensureLocalhostBeforeApp } from "./initShell";
import { isLocalhostEnvironment, purgeServiceWorkerAndCaches } from "@/lib/chunkLoadRecovery";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sur GitHub Pages / preview, un vieux Serwist peut répondre avec une précache obsolète *avant*
 * que `main.tsx` ne purge les caches — les imports dynamiques voient du HTML ou un chunk absent → échec.
 */
async function purgeHostingCachesBeforeAppBundle(): Promise<void> {
  if (typeof window === "undefined" || isLocalhostEnvironment()) return;
  const h = window.location.hostname;
  const isGitHubPages = h.endsWith("github.io");
  const isPreviewHost = h.includes("lovableproject.com") || h.includes("id-preview--");
  if (!isGitHubPages && !isPreviewHost) return;
  await purgeServiceWorkerAndCaches();
}

async function boot() {
  if (await applySwResetFromQuery()) return;
  if (await ensureLocalhostBeforeApp()) return;
  await purgeHostingCachesBeforeAppBundle();
  await import("./main");
}

void boot().catch((err) => {
  console.error("[entry] échec chargement de l’application", err);
  const root = document.getElementById("root");
  if (root) {
    const detail = err instanceof Error ? err.message || String(err) : String(err ?? "");
    root.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;font-family:system-ui,sans-serif;text-align:center;background:#f8fafc;color:#0f172a;">
      <div style="max-width:28rem">
        <p style="font-weight:600;margin:0 0 0.5rem">Chargement impossible</p>
        <p style="font-size:0.875rem;color:#64748b;margin:0 0 1rem">Réessaie avec un rechargement forcé (Ctrl+F5) ou <code>?dp-sw-reset=1</code> dans l’URL.</p>
        <details style="text-align:left;font-size:0.75rem;color:#475569;margin:0">
          <summary style="cursor:pointer;color:#64748b">Détail technique</summary>
          <pre style="white-space:pre-wrap;word-break:break-word;margin:0.5rem 0 0;padding:0.5rem;background:#f1f5f9;border-radius:0.375rem">${escapeHtml(detail)}</pre>
        </details>
      </div>
    </div>`;
  }
});
