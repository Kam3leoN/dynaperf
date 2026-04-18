import { isLocalhostEnvironment, purgeServiceWorkerAndCaches } from "@/lib/chunkLoadRecovery";

/** Limite d’attente : `getRegistrations` / `unregister` / `caches` peuvent ne jamais résoudre. */
const DP_SW_RESET_MAX_MS = 5000;

/**
 * Secours : `?dp-sw-reset=1` — désinscription SW, vidage caches, navigation sans le paramètre.
 */
export async function applySwResetFromQuery(): Promise<boolean> {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get("dp-sw-reset") !== "1") return false;
    u.searchParams.delete("dp-sw-reset");
    const next = `${u.pathname}${u.search}${u.hash}` || u.pathname;

    const work = async () => {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    };

    await Promise.race([
      work(),
      new Promise<void>((resolve) => setTimeout(resolve, DP_SW_RESET_MAX_MS)),
    ]);

    window.location.replace(next);
    return true;
  } catch (e) {
    console.warn("[initShell] dp-sw-reset a échoué:", e);
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get("dp-sw-reset") === "1") {
        u.searchParams.delete("dp-sw-reset");
        window.location.replace(`${u.pathname}${u.search}${u.hash}`);
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }
}

/**
 * Avant tout chargement de l’app : sur localhost, retirer un éventuel SW / caches (preview Serwist,
 * ancien build, même origin que le dev :8080, etc.). Un rechargement unique si la page était contrôlée.
 * @returns true si la page va se recharger — l’appelant ne doit pas continuer.
 */
export async function ensureLocalhostBeforeApp(): Promise<boolean> {
  if (!isLocalhostEnvironment()) return false;

  let needsReload = false;
  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      needsReload = regs.length > 0 || !!navigator.serviceWorker.controller;
    } catch {
      /* ignore */
    }
  }

  await purgeServiceWorkerAndCaches();

  if (needsReload) {
    const reloadKey = "dp_localhost_sw_reload_once";
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, "1");
      window.location.reload();
      return true;
    }
  }
  return false;
}
