/**
 * Split bouton dock — **Material 3 Expressive**, taille **S (40dp)**.
 * Implémentation complète : `src/lib/m3SplitButton.ts` (XS → XL, tokens, motion).
 */

export {
  M3_SPLIT_TRAILING_OPEN_CLASS,
  M3_SPLIT_BUTTON_SPECS,
  M3_SPLIT_MOTION_STANDARD,
  M3_SPLIT_DOCK_SIZE,
  m3SplitButtonDock,
  m3SplitButtonGroup,
  m3SplitButtonLeadingFixed,
  m3SplitButtonTrailingFixed,
  m3SplitButtonLeadingGrow,
  m3SplitButtonTrailingGrow,
  m3SplitButtonLeadingIconClass,
  m3SplitButtonTrailingIconClass,
  m3SplitButtonTrailingChevronClass,
  m3SplitButtonLeadingInnerRadiiClass,
  m3SplitButtonTotalWidthPx,
  type M3SplitButtonSize,
  type M3SplitButtonSpec,
} from "./m3SplitButton";

import { m3SplitButtonDock } from "./m3SplitButton";
import { cn } from "@/lib/utils";

/** @deprecated Utiliser `m3SplitButtonDock` */
export const m3DockSplitGroup = {
  expanded: m3SplitButtonDock.groupExpanded,
  compactRow: m3SplitButtonDock.groupCompactRow,
} as const;

export const m3DockSplitSegmentFirst = m3SplitButtonDock.leadingFixed;
export const m3DockSplitSegmentSecond = m3SplitButtonDock.trailingFixed;
export const m3DockSplitSegmentFirstGrow = m3SplitButtonDock.leadingGrow;
export const m3DockSplitSegmentSecondGrow = m3SplitButtonDock.trailingGrow;

/** Micro muet / sourd — états hover/active explicites pour écraser le segment primary (évite flash au clic). */
export const m3DockSplitDanger = cn(
  "bg-destructive/15 text-destructive",
  "hover:bg-destructive/25 dark:hover:bg-destructive/30",
  "active:bg-destructive/25 dark:active:bg-destructive/35",
);

export const m3DockSplitIconMd = m3SplitButtonDock.leadingIcon;
export const m3DockSplitChevronMd = m3SplitButtonDock.trailingChevron;
