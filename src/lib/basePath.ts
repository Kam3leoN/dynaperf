/**
 * Base Vite (`/` en local, `/dynaperf/` sur GitHub Pages). Toujours avec slash final.
 */
export function viteBase(): string {
  const b = import.meta.env.BASE_URL;
  return b.endsWith("/") ? b : `${b}/`;
}

/**
 * URL vers un fichier servi depuis `public/` (icônes PWA, logos, etc.).
 * Indispensable sur GitHub Pages : évite `/asset.svg` qui pointe à la racine du domaine.
 */
export function publicAssetUrl(path: string): string {
  const p = path.replace(/^\/+/, "");
  return `${viteBase()}${p}`;
}

/**
 * URL publique de l’app (origine + base), pour QR code « installer l’app », partages, etc.
 */
export function absoluteAppBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const raw = viteBase();
  const pathOnly = raw.replace(/\/+$/, "");
  return `${window.location.origin}${pathOnly ? `${pathOnly}/` : "/"}`;
}

/**
 * Racine publique de l’app avec un seul « / » final (évite les concaténations du type `…/dynaperf//auth`).
 */
export function absoluteAppHomeUrl(): string {
  if (typeof window === "undefined") return "";
  const raw = viteBase();
  const pathOnly = raw.replace(/\/+$/, "");
  const withoutTrailing = pathOnly ? `${window.location.origin}${pathOnly}` : window.location.origin;
  return `${withoutTrailing.replace(/\/+$/, "")}/`;
}

/**
 * Supprime les barres obliques dupliquées dans le chemin d’une URL http(s) (ne casse pas `https://`).
 */
export function collapseDuplicatePathSlashes(url: string): string {
  const t = url.trim();
  if (!t) return t;
  return t.replace(/([^:]\/)\/+/g, "$1");
}
