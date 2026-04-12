/** Clé unique : évite boucles de reload et aligne main / error boundary / handlers globaux. */
const RELOAD_THROTTLE_KEY = "dp_chunk_reload_ts";

/**
 * Extrait un message lisible depuis une erreur de chargement de chunk / import dynamique.
 */
export function messageFromChunkFailure(reason: unknown): string {
  if (reason instanceof Error) return reason.message || String(reason);
  if (typeof reason === "string") return reason;
  return String(reason ?? "");
}

/**
 * Indique un échec typique après déploiement (hashes de chunks changés, cache navigateur / SW).
 */
export function isStaleChunkLoadFailure(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("importing a module script failed") ||
    m.includes("error loading dynamically imported module") ||
    m.includes("loading chunk") ||
    m.includes("loading css chunk") ||
    /** Réponse HTML (404) à la place du .js — déploiement / mauvais chemin de base. */
    m.includes("unexpected token") ||
    m.includes("text/html") ||
    m.includes("mime type") ||
    m.includes("failed to load module script") ||
    m.includes("failed to fetch") && m.includes("import")
  );
}

/**
 * Désinscription des service workers + suppression des caches API (Serwist, etc.).
 */
export async function purgeServiceWorkerAndCaches(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* best-effort */
  }
}

/**
 * Une seule tentative espacée (10 s) : purge caches + rechargement dur.
 * À appeler depuis `unhandledrejection`, error boundary, ou `window.error`.
 * @returns true si une récupération a été planifiée (ex. pour `preventDefault()` sur la rejection).
 */
export function scheduleChunkLoadRecovery(reason?: unknown): boolean {
  const msg = messageFromChunkFailure(reason);
  if (!isStaleChunkLoadFailure(msg)) return false;

  const last = Number(sessionStorage.getItem(RELOAD_THROTTLE_KEY) || 0);
  if (Date.now() - last < 10_000) return false;

  sessionStorage.setItem(RELOAD_THROTTLE_KEY, String(Date.now()));
  void purgeServiceWorkerAndCaches().then(() => {
    window.location.reload();
  });
  return true;
}
