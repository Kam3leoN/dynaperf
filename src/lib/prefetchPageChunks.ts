/**
 * Précharge les modules des pages (chunks Vite) en tâche de fond après le premier rendu,
 * pour que les navigations suivantes ne déclenchent plus Suspense / écran plein.
 */
export function prefetchPageChunksDeferred(): void {
  const importers = Object.values(
    import.meta.glob("../pages/**/*.tsx"),
  ) as Array<() => Promise<unknown>>;

  if (importers.length === 0) return;

  let index = 0;
  const BATCH = 4;

  const runBatch = () => {
    const end = Math.min(index + BATCH, importers.length);
    for (; index < end; index++) {
      void importers[index]();
    }
    if (index < importers.length) {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(runBatch, { timeout: 5000 });
      } else {
        window.setTimeout(runBatch, 120);
      }
    }
  };

  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(runBatch, { timeout: 6000 });
  } else {
    window.setTimeout(runBatch, 800);
  }
}
