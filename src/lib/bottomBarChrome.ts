/** Fond commun cartes bas d’écran (dock, messagerie). */
const CHROME_SURFACE =
  "rounded-sm border-2 border-border bg-card/95 backdrop-blur-md";

/**
 * Dock utilisateur shell — rail **étendu** (une ligne, ~h-14 : pseudo + splits type Discord).
 */
export const desktopUserDockChromeRowClassName =
  "box-border flex h-14 min-h-14 max-h-14 shrink-0 flex-row items-stretch gap-0 overflow-hidden px-1.5 py-1 " +
  CHROME_SURFACE;

/**
 * Dock utilisateur shell — rail **compact** (historique) : carte colonne avec bords arrondis.
 * Le dock compact actuel (`DesktopUserDock`) n’utilise plus ce wrapper ; conservé pour réutilisation éventuelle.
 */
export const desktopUserDockChromeColumnClassName =
  "box-border flex flex-col h-auto min-h-0 shrink-0 gap-0 overflow-visible p-0 w-full min-w-0 " +
  "rounded-xl border-2 border-border bg-card/95 backdrop-blur-md";

/**
 * Rayon haut avatar lorsque le profil est dans une carte `desktopUserDockChromeColumnClassName`.
 * Sans carte, l’avatar suit les coins du segment M3 dans `AppLayout`.
 */
export const desktopDockCompactAvatarTopRadiusClassName = "rounded-t-[calc(1.25rem-2px)]";

/**
 * @deprecated Utiliser {@link desktopUserDockChromeRowClassName} — alias historique.
 */
export const bottomBarChromeClassName = desktopUserDockChromeRowClassName;

/**
 * Carte de saisie messagerie : hauteur min alignée dock ; le plafond et le scroll sont gérés dans `RichTextEditor` (`autoGrow`).
 */
export const messageComposerChromeClassName =
  "box-border flex w-full min-h-16 shrink-0 items-end gap-1.5 rounded-sm border-2 border-border bg-card/95 px-2 py-1.5 backdrop-blur-md";
