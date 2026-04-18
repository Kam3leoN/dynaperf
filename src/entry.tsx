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

void boot();
