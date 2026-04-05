/**
 * Détecte le système, le navigateur et la densité d’écran (DPR)
 * et pose des classes CSS sur `<html>` pour un styling adaptatif.
 *
 * **DPI / DPR** : les classes `dpi-*` reflètent `devicePixelRatio` (assets, finesse d’écran).
 * Elles **ne remplacent pas** les breakpoints du shell (`layoutBreakpoints`, Tailwind `shell:`),
 * qui sont basés sur la **largeur du viewport en px CSS** — comme en responsive DevTools.
 *
 * Classes ajoutées :
 *   OS:         os-android | os-ios | os-windows | os-macos | os-linux
 *   Type:       device-mobile | device-tablet | device-desktop (heuristique `innerWidth`/`innerHeight`, pas le DPR)
 *   Navigateur: browser-chrome | browser-safari | browser-firefox | browser-edge | browser-samsung
 *   DPI:        dpi-1x | dpi-2x | dpi-3x | dpi-4x
 *   Standalone: pwa-standalone (si lancé en mode PWA)
 *   Orientation: orient-portrait | orient-landscape
 */

const UA = navigator.userAgent;

function detectOS(): string {
  if (/Android/i.test(UA)) return "os-android";
  if (/iPhone|iPad|iPod/i.test(UA)) return "os-ios";
  if (/Windows/i.test(UA)) return "os-windows";
  if (/Mac OS/i.test(UA)) return "os-macos";
  if (/Linux/i.test(UA)) return "os-linux";
  return "os-unknown";
}

function detectBrowser(): string {
  if (/SamsungBrowser/i.test(UA)) return "browser-samsung";
  if (/Edg\//i.test(UA)) return "browser-edge";
  if (/Chrome/i.test(UA) && !/Edg/i.test(UA)) return "browser-chrome";
  if (/Safari/i.test(UA) && !/Chrome/i.test(UA)) return "browser-safari";
  if (/Firefox/i.test(UA)) return "browser-firefox";
  return "browser-unknown";
}

function detectDeviceType(): string {
  const touch = navigator.maxTouchPoints > 0;
  /** innerWidth/innerHeight (CSS px) — aligné sur le layout ; screen.* peut être trompeur sur Android haute densité */
  const short = Math.min(window.innerWidth, window.innerHeight);
  if (!touch) return "device-desktop";
  if (short >= 600) return "device-tablet";
  return "device-mobile";
}

function detectDPI(): string {
  const dpr = window.devicePixelRatio || 1;
  if (dpr >= 3.5) return "dpi-4x";
  if (dpr >= 2.5) return "dpi-3x";
  if (dpr >= 1.5) return "dpi-2x";
  return "dpi-1x";
}

function detectStandalone(): string | null {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isStandalone ? "pwa-standalone" : null;
}

function detectOrientation(): string {
  return window.innerHeight >= window.innerWidth ? "orient-portrait" : "orient-landscape";
}

const PREFIX = "dc-"; // namespace to avoid collisions

function clearOld(el: HTMLElement) {
  const toRemove: string[] = [];
  el.classList.forEach((c) => {
    if (
      c.startsWith("os-") ||
      c.startsWith("device-") ||
      c.startsWith("browser-") ||
      c.startsWith("dpi-") ||
      c.startsWith("orient-") ||
      c === "pwa-standalone"
    ) {
      toRemove.push(c);
    }
  });
  toRemove.forEach((c) => el.classList.remove(c));
}

export function applyDeviceClasses() {
  const el = document.documentElement;
  clearOld(el);

  const classes = [
    detectOS(),
    detectBrowser(),
    detectDeviceType(),
    detectDPI(),
    detectStandalone(),
    detectOrientation(),
  ].filter(Boolean) as string[];

  el.classList.add(...classes);
}

export function listenDeviceChanges() {
  const update = () => applyDeviceClasses();

  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", update);
  const standaloneMql = window.matchMedia("(display-mode: standalone)");
  standaloneMql.addEventListener("change", update);

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener("resize", update);
  }

  return () => {
    window.removeEventListener("resize", update);
    window.removeEventListener("orientationchange", update);
    standaloneMql.removeEventListener("change", update);
    if (vv) {
      vv.removeEventListener("resize", update);
    }
  };
}