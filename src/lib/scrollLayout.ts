/**
 * Remonte la vue en haut : `<main id="layout-main-scroll">`, puis `#root`,
 * `document.scrollingElement` et `window` — le défilement effectif n’est pas toujours porté par `<main>` seul.
 */
export function scrollLayoutMainToTop(behavior: ScrollBehavior = "smooth"): void {
  const opts: ScrollToOptions = { top: 0, left: 0, behavior };

  const main = document.getElementById("layout-main-scroll") as HTMLElement | null;
  main?.scrollTo(opts);
  // Certains WebKit ignorent `scrollTo` sur un conteneur `overflow:auto` ; `scrollTop` reste fiable en instantané.
  if (behavior === "instant" && main) {
    main.scrollTop = 0;
  }

  const root = document.getElementById("root") as HTMLElement | null;
  root?.scrollTo(opts);
  if (behavior === "instant" && root) {
    root.scrollTop = 0;
  }

  document.scrollingElement?.scrollTo(opts);
  if (behavior === "instant" && document.scrollingElement) {
    (document.scrollingElement as HTMLElement).scrollTop = 0;
  }

  window.scrollTo(opts);
}

function hasNestedScrolledRegion(main: HTMLElement): boolean {
  const nodes = main.getElementsByTagName("*");
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i] as HTMLElement;
    if (el.scrollTop <= 0) continue;
    const { overflowY } = window.getComputedStyle(el);
    if (overflowY !== "auto" && overflowY !== "scroll" && overflowY !== "overlay") continue;
    if (el.scrollHeight > el.clientHeight) return true;
  }
  return false;
}

/**
 * Remonte **tout** : sous-zones scrollables dans le `<main>` (cartes, champs longs),
 * puis `<main>`, `#root`, `document.scrollingElement` et `window`.
 */
export function scrollEntireLayoutToTop(behavior: ScrollBehavior = "instant"): void {
  const opts: ScrollToOptions = { top: 0, left: 0, behavior };
  const main = document.getElementById("layout-main-scroll") as HTMLElement | null;
  if (main) {
    const nodes = main.getElementsByTagName("*");
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i] as HTMLElement;
      if (el.scrollTop <= 0) continue;
      const { overflowY } = window.getComputedStyle(el);
      if (overflowY !== "auto" && overflowY !== "scroll" && overflowY !== "overlay") continue;
      if (el.scrollHeight <= el.clientHeight) continue;
      if (behavior === "instant") {
        el.scrollTop = 0;
      } else {
        el.scrollTo(opts);
      }
    }
  }
  scrollLayoutMainToTop(behavior);
}

/**
 * Comme `scrollEntireLayoutToTop("smooth")`, mais renvoie une promesse résolue **après** la fin du défilement
 * (pour pouvoir fermer le menu sans couper l’animation). Respecte `prefers-reduced-motion` (instantané).
 */
export function scrollEntireLayoutToTopAsync(): Promise<void> {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const behavior: ScrollBehavior = reduced ? "instant" : "smooth";

  const main = document.getElementById("layout-main-scroll") as HTMLElement | null;
  const hadMainScroll = (main?.scrollTop ?? 0) > 1;
  const hadNested = main ? hasNestedScrolledRegion(main) : false;
  const hadViewportScroll = window.scrollY > 1;
  const hadSomethingToAnimate = hadMainScroll || hadNested || hadViewportScroll;

  scrollEntireLayoutToTop(behavior);

  if (behavior === "instant") {
    return Promise.resolve();
  }

  if (!hadSomethingToAnimate) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(fallbackTimer);
      main?.removeEventListener("scrollend", onMainScrollEnd);
      resolve();
    };

    const fallbackMs = hadMainScroll || hadViewportScroll ? 950 : 650;
    const fallbackTimer = window.setTimeout(finish, fallbackMs);

    function onMainScrollEnd(this: HTMLElement, e: Event) {
      if (e.target !== main) return;
      /* Petit délai pour laisser finir les scrolls imbriqués (cartes). */
      window.setTimeout(finish, 140);
    }

    if ((hadMainScroll || hadViewportScroll) && main) {
      main.addEventListener("scrollend", onMainScrollEnd);
    }
  });
}
