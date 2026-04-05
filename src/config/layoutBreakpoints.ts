/**
 * Breakpoints du **shell application** (rail 80px, navigation secondaire, aside membres,
 * dock profil, bottom nav).
 *
 * **Téléphone réel vs DevTools** : les media queries et `shell:` utilisent des **px CSS**
 * (viewport logique), pas le `devicePixelRatio`. Un Pixel 9 Pro en portrait ≈ 400px de large
 * logique ; si tu vois un rendu « bureau », vérifie **Chrome → menu du site → désactiver
 * « Version pour ordinateur »**, taille du texte système, et cache / SW (`?dp-sw-reset=1`).
 *
 * Doit rester aligné avec :
 * - le screen Tailwind `shell` / `lg` à **1024px** (`tailwind.config.ts`) ;
 * - `@media (max-width: 1023.98px)` dans `src/index.css` ;
 * - `matchMedia` dans `ResponsiveShellContext` et `use-mobile`.
 *
 * Composants à garder cohérents (utilitaires `shell:` ou équivalent) :
 * - `src/components/AppLayout.tsx`
 * - `src/components/BottomNav.tsx`
 * - `src/components/AppNavRail.tsx`
 * - `src/components/AppSecondaryNav.tsx`
 * - `src/components/DesktopUserDock.tsx`
 */

/** Largeur min-viewport (px) pour le layout « bureau » (rails visibles, pas de bottom nav). */
export const SHELL_BREAKPOINT_PX = 1024 as const;

/**
 * Vue « étroite » : même sens que `max-lg` / bottom nav visible.
 * 1023.98px évite l’ambiguïté exactement à 1024px entre CSS et navigateurs.
 */
export const SHELL_MAX_WIDTH_MEDIA_QUERY = "(max-width: 1023.98px)" as const;

/** Media query inverse (min-width shell bureau). */
export const SHELL_MIN_WIDTH_MEDIA_QUERY = `(min-width: ${SHELL_BREAKPOINT_PX}px)` as const;
