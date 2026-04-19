import { flushSync } from "react-dom";

/**
 * Exécute une mise à jour DOM dans une **View Transition** (morph shape / crossfade M3)
 * lorsque le navigateur le permet — sinon repli sur la mise à jour directe.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition
 */
export function runMorphTransition(update: () => void): void {
  if (typeof document === "undefined") {
    update();
    return;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void>; skipTransition: () => void };
  };
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => {
      flushSync(update);
    });
    return;
  }
  update();
}
