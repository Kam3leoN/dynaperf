/**
 * Carte bas d’écran partagée : dock utilisateur (lg) et zone de saisie messagerie.
 * Hauteur fixe h-16 (64px, border-box, bordure 2px) pour texte / emojis confortables.
 */
export const bottomBarChromeClassName =
  "box-border flex h-16 min-h-16 max-h-16 shrink-0 items-center gap-1.5 overflow-hidden rounded-sm border-2 border-border bg-card/95 px-2 py-1.5 backdrop-blur-md";

/**
 * Carte de saisie messagerie : hauteur min alignée dock ; le plafond et le scroll sont gérés dans `RichTextEditor` (`autoGrow`).
 */
export const messageComposerChromeClassName =
  "box-border flex w-full min-h-16 shrink-0 items-end gap-1.5 rounded-sm border-2 border-border bg-card/95 px-2 py-1.5 backdrop-blur-md";
