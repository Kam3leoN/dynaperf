/**
 * Point d’entrée : aucun module applicatif (React, routes…) n’est chargé tant que le SW / caches
 * sur localhost n’ont pas été traités — évite les échecs d’import dynamique avant purge.
 */
import { applySwResetFromQuery, ensureLocalhostBeforeApp } from "./initShell";

async function boot() {
  if (await applySwResetFromQuery()) return;
  if (await ensureLocalhostBeforeApp()) return;
  await import("./main");
}

void boot().catch((err) => {
  console.error("[entry] échec chargement de l’application", err);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;font-family:system-ui,sans-serif;text-align:center;background:#f8fafc;color:#0f172a;">
      <div style="max-width:24rem">
        <p style="font-weight:600;margin:0 0 0.5rem">Chargement impossible</p>
        <p style="font-size:0.875rem;color:#64748b;margin:0 0 1rem">Réessaie avec un rechargement forcé (Ctrl+F5) ou <code>?dp-sw-reset=1</code> dans l’URL.</p>
      </div>
    </div>`;
  }
});
