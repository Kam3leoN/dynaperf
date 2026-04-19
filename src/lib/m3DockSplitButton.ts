import { cn } from "@/lib/utils";

/**
 * Split bouton dock — 36×36 par segment, **2px** entre les deux segments du même split, joint interne 4px, extérieurs 18px (demi-pill).
 * L’espacement **entre** les groupes (profil / micro / audio) est géré dans `DesktopUserDock` (4px).
 * Fond **primary** très léger : un peu plus dense en clair, plus doux en sombre — pas de bordure, l’écart entre segments fait la démarcation.
 *
 * Les rayons sont en **littéraux** (pas `rounded-full`) pour que les 4px internes restent visibles.
 */
export const m3DockSplitGroup = {
  expanded: "inline-flex h-9 w-[74px] shrink-0 items-stretch gap-[2px] overflow-visible",
  compactRow: "flex h-9 w-full min-w-0 items-stretch gap-[2px] overflow-visible",
} as const;

const segmentSurface = cn(
  "flex h-9 shrink-0 items-center justify-center border-0 text-foreground/90 shadow-sm",
  "bg-primary/[0.08] dark:bg-primary/[0.14]",
  "transition-colors outline-none",
  "hover:bg-primary/[0.12] dark:hover:bg-primary/[0.2]",
  "active:bg-primary/[0.15] dark:active:bg-primary/[0.24]",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "box-border",
);

/** Extérieur gauche 18px, intérieur droit 4px */
export const m3DockSplitSegmentFirst = cn(
  segmentSurface,
  "w-9 rounded-tl-[18px] rounded-bl-[18px] rounded-tr-[4px] rounded-br-[4px]",
);

/** Intérieur gauche 4px, extérieur droit 18px */
export const m3DockSplitSegmentSecond = cn(
  segmentSurface,
  "w-9 rounded-tl-[4px] rounded-bl-[4px] rounded-tr-[18px] rounded-br-[18px]",
);

export const m3DockSplitSegmentFirstGrow = cn(
  segmentSurface,
  "min-w-0 flex-1 w-auto rounded-tl-[18px] rounded-bl-[18px] rounded-tr-[4px] rounded-br-[4px]",
);

export const m3DockSplitSegmentSecondGrow = cn(
  segmentSurface,
  "min-w-0 flex-1 w-auto rounded-tl-[4px] rounded-bl-[4px] rounded-tr-[18px] rounded-br-[18px]",
);

/** Micro muet / sourd */
export const m3DockSplitDanger = "bg-destructive/15 text-destructive hover:bg-destructive/25";

export const m3DockSplitIconMd = "h-[14px] w-[14px]";
export const m3DockSplitChevronMd = "h-3.5 w-3.5 opacity-75";
