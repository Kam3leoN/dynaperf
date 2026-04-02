/**
 * Détecte le système, le navigateur et la résolution (DPI)
 * et pose des classes CSS sur <html> pour un styling adaptatif.
 *
 * Classes ajoutées :
 *   OS:         os-android | os-ios | os-windows | os-macos | os-linux
 *   Type:       device-mobile | device-tablet | device-desktop
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
  const short = Math.min(window.screen.width, window.screen.height);
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
    (navigator as any).standalone === true;
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
  window.matchMedia("(display-mode: standalone)").addEventListener("change", update);

  return () => {
    window.removeEventListener("resize", update);
    window.removeEventListener("orientationchange", update);
  };
}