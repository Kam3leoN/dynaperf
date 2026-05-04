import { cn } from "@/lib/utils";

/**
 * Material 3 Expressive — Split button
 * @see https://m3.material.io/components/split-button/specs
 *
 * LTR : [ leading | gap | trailing ]
 * - Leading : gros rayons à gauche (tl, bl) ; petits au joint droit (tr, br).
 * - Trailing : petits au joint gauche (tl, bl) ; gros à droite (tr, br).
 * - Menu ouvert (trailing) : trailing → cercle (`!rounded-full`) ; le joint leading reste à innerRest
 *   via `data-menu-open` sur le `group/m3split` (voir DesktopUserDock / profil dock).
 *
 * Tailwind JIT : uniquement des **littéraux** `h-[40px]`, `rounded-tl-[20px]`, etc. (pas de `` `h-[${n}px]` ``).
 */

export type M3SplitButtonSize = "xs" | "s" | "m" | "l" | "xl";

/** À fusionner sur le trailing si `data-state=open` n’atteint pas le `<button>` (Slots Radix imbriqués). */
export const M3_SPLIT_TRAILING_OPEN_CLASS = "!rounded-full";

/** Motion M3 — tokens Tailwind (`tailwind.config` + `styles/m3-motion.css`). */
export const M3_SPLIT_MOTION_STANDARD =
  "duration-m3-standard ease-m3-standard motion-reduce:duration-[1ms]";

export interface M3SplitButtonSpec {
  dp: number;
  gap: number;
  innerRest: number;
  innerHover: number;
  outerR: number;
  leadingPl: number;
  leadingPr: number;
  trailingIcon: number;
  trailingPl: number;
  trailingPr: number;
}

export const M3_SPLIT_BUTTON_SPECS: Record<M3SplitButtonSize, M3SplitButtonSpec> = {
  xs: {
    dp: 32,
    gap: 2,
    innerRest: 4,
    innerHover: 10,
    outerR: 16,
    leadingPl: 12,
    leadingPr: 8,
    trailingIcon: 18,
    trailingPl: 10,
    trailingPr: 10,
  },
  s: {
    dp: 40,
    gap: 2,
    innerRest: 4,
    innerHover: 12,
    outerR: 20,
    leadingPl: 16,
    leadingPr: 12,
    trailingIcon: 22,
    trailingPl: 13,
    trailingPr: 13,
  },
  m: {
    dp: 56,
    gap: 2,
    innerRest: 4,
    innerHover: 12,
    outerR: 28,
    leadingPl: 20,
    leadingPr: 16,
    trailingIcon: 32,
    trailingPl: 18,
    trailingPr: 18,
  },
  l: {
    dp: 96,
    gap: 2,
    innerRest: 6,
    innerHover: 16,
    outerR: 48,
    leadingPl: 32,
    leadingPr: 24,
    trailingIcon: 48,
    trailingPl: 28,
    trailingPr: 28,
  },
  xl: {
    dp: 136,
    gap: 2,
    innerRest: 8,
    innerHover: 20,
    outerR: 68,
    leadingPl: 44,
    leadingPr: 36,
    trailingIcon: 68,
    trailingPl: 40,
    trailingPr: 40,
  },
};

const segmentSurface = cn(
  "flex shrink-0 items-center justify-center border-0 text-foreground/90 shadow-sm",
  "bg-primary/[0.08] dark:bg-primary/[0.14]",
  "outline-none",
  "hover:bg-primary/[0.12] dark:hover:bg-primary/[0.2]",
  "active:bg-primary/[0.15] dark:active:bg-primary/[0.24]",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  // Pas de transition : interpoler border-radius sur 8 longhands + fond = va-et-vient au joint ;
  // interpoler primary↔destructive = flash / FOUC sur micro & co.
  "box-border !transition-none",
);

/**
 * Trailing : cercle si menu Radix ouvert (`data-state=open`) ou classe explicite
 * `M3_SPLIT_TRAILING_OPEN_CLASS` (état contrôlé parent).
 */
function trailingMenuOpenMotion(): string {
  return cn(
    "data-[state=open]:!rounded-full",
    // Si le parent groupe porte `data-menu-open`, forcer aussi le cercle (Slots sans data-state sur le bouton).
    "group-data-[menu-open]/m3split:!rounded-full",
  );
}

/** Leading : fige le joint droit à innerRest quand le menu trailing est ouvert (évite l’effet « inversé » hover vs trailing). */
function leadingJointWhenTrailingMenuOpen(innerRestPx: number): string {
  return `group-data-[menu-open]/m3split:!rounded-tr-[${innerRestPx}px] group-data-[menu-open]/m3split:!rounded-br-[${innerRestPx}px]`;
}

export function m3SplitButtonTotalWidthPx(size: M3SplitButtonSize): number {
  const s = M3_SPLIT_BUTTON_SPECS[size];
  return s.dp * 2 + s.gap;
}

const M3_SPLIT_GROUP_EXPANDED: Record<M3SplitButtonSize, string> = {
  xs: "group/m3split inline-flex h-[32px] w-[66px] shrink-0 items-stretch overflow-visible gap-[2px]",
  s: "group/m3split inline-flex h-[40px] w-[82px] shrink-0 items-stretch overflow-visible gap-[2px]",
  m: "group/m3split inline-flex h-[56px] w-[114px] shrink-0 items-stretch overflow-visible gap-[2px]",
  l: "group/m3split inline-flex h-[96px] w-[194px] shrink-0 items-stretch overflow-visible gap-[2px]",
  xl: "group/m3split inline-flex h-[136px] w-[274px] shrink-0 items-stretch overflow-visible gap-[2px]",
};

const M3_SPLIT_GROUP_COMPACT_ROW: Record<M3SplitButtonSize, string> = {
  xs: "group/m3split mx-auto flex h-[32px] w-[66px] shrink-0 items-stretch overflow-visible gap-[2px]",
  s: "group/m3split mx-auto flex h-[40px] w-[82px] shrink-0 items-stretch overflow-visible gap-[2px]",
  m: "group/m3split mx-auto flex h-[56px] w-[114px] shrink-0 items-stretch overflow-visible gap-[2px]",
  l: "group/m3split mx-auto flex h-[96px] w-[194px] shrink-0 items-stretch overflow-visible gap-[2px]",
  xl: "group/m3split mx-auto flex h-[136px] w-[274px] shrink-0 items-stretch overflow-visible gap-[2px]",
};

export function m3SplitButtonGroup(size: M3SplitButtonSize, layout: "expanded" | "compactRow"): string {
  return layout === "expanded" ? M3_SPLIT_GROUP_EXPANDED[size] : M3_SPLIT_GROUP_COMPACT_ROW[size];
}

const M3_SPLIT_LEADING_FIXED: Record<M3SplitButtonSize, string> = {
  xs: cn(
    segmentSurface,
    "h-[32px] w-[32px]",
    "rounded-tl-[16px] rounded-bl-[16px] rounded-tr-[4px] rounded-br-[4px]",
    "group-hover/m3split:rounded-tr-[10px] group-hover/m3split:rounded-br-[10px]",
    leadingJointWhenTrailingMenuOpen(4),
    "active:rounded-tr-[10px] active:rounded-br-[10px]",
  ),
  s: cn(
    segmentSurface,
    "h-[40px] w-[40px]",
    "rounded-tl-[20px] rounded-bl-[20px] rounded-tr-[4px] rounded-br-[4px]",
    "group-hover/m3split:rounded-tr-[12px] group-hover/m3split:rounded-br-[12px]",
    leadingJointWhenTrailingMenuOpen(4),
    "active:rounded-tr-[12px] active:rounded-br-[12px]",
  ),
  m: cn(
    segmentSurface,
    "h-[56px] w-[56px]",
    "rounded-tl-[28px] rounded-bl-[28px] rounded-tr-[4px] rounded-br-[4px]",
    "group-hover/m3split:rounded-tr-[12px] group-hover/m3split:rounded-br-[12px]",
    leadingJointWhenTrailingMenuOpen(4),
    "active:rounded-tr-[12px] active:rounded-br-[12px]",
  ),
  l: cn(
    segmentSurface,
    "h-[96px] w-[96px]",
    "rounded-tl-[48px] rounded-bl-[48px] rounded-tr-[6px] rounded-br-[6px]",
    "group-hover/m3split:rounded-tr-[16px] group-hover/m3split:rounded-br-[16px]",
    leadingJointWhenTrailingMenuOpen(6),
    "active:rounded-tr-[16px] active:rounded-br-[16px]",
  ),
  xl: cn(
    segmentSurface,
    "h-[136px] w-[136px]",
    "rounded-tl-[68px] rounded-bl-[68px] rounded-tr-[8px] rounded-br-[8px]",
    "group-hover/m3split:rounded-tr-[20px] group-hover/m3split:rounded-br-[20px]",
    leadingJointWhenTrailingMenuOpen(8),
    "active:rounded-tr-[20px] active:rounded-br-[20px]",
  ),
};

const M3_SPLIT_TRAILING_FIXED: Record<M3SplitButtonSize, string> = {
  xs: cn(
    segmentSurface,
    "h-[32px] w-[32px]",
    "rounded-tr-[16px] rounded-br-[16px] rounded-tl-[4px] rounded-bl-[4px]",
    "group-hover/m3split:rounded-tl-[10px] group-hover/m3split:rounded-bl-[10px]",
    "active:rounded-tl-[10px] active:rounded-bl-[10px]",
    trailingMenuOpenMotion(),
  ),
  s: cn(
    segmentSurface,
    "h-[40px] w-[40px]",
    "rounded-tr-[20px] rounded-br-[20px] rounded-tl-[4px] rounded-bl-[4px]",
    "group-hover/m3split:rounded-tl-[12px] group-hover/m3split:rounded-bl-[12px]",
    "active:rounded-tl-[12px] active:rounded-bl-[12px]",
    trailingMenuOpenMotion(),
  ),
  m: cn(
    segmentSurface,
    "h-[56px] w-[56px]",
    "rounded-tr-[28px] rounded-br-[28px] rounded-tl-[4px] rounded-bl-[4px]",
    "group-hover/m3split:rounded-tl-[12px] group-hover/m3split:rounded-bl-[12px]",
    "active:rounded-tl-[12px] active:rounded-bl-[12px]",
    trailingMenuOpenMotion(),
  ),
  l: cn(
    segmentSurface,
    "h-[96px] w-[96px]",
    "rounded-tr-[48px] rounded-br-[48px] rounded-tl-[6px] rounded-bl-[6px]",
    "group-hover/m3split:rounded-tl-[16px] group-hover/m3split:rounded-bl-[16px]",
    "active:rounded-tl-[16px] active:rounded-bl-[16px]",
    trailingMenuOpenMotion(),
  ),
  xl: cn(
    segmentSurface,
    "h-[136px] w-[136px]",
    "rounded-tr-[68px] rounded-br-[68px] rounded-tl-[8px] rounded-bl-[8px]",
    "group-hover/m3split:rounded-tl-[20px] group-hover/m3split:rounded-bl-[20px]",
    "active:rounded-tl-[20px] active:rounded-bl-[20px]",
    trailingMenuOpenMotion(),
  ),
};

export function m3SplitButtonLeadingFixed(size: M3SplitButtonSize): string {
  return M3_SPLIT_LEADING_FIXED[size];
}

export function m3SplitButtonTrailingFixed(size: M3SplitButtonSize): string {
  return M3_SPLIT_TRAILING_FIXED[size];
}

export function m3SplitButtonLeadingGrow(size: M3SplitButtonSize): string {
  return cn(
    segmentSurface,
    size === "xs" &&
      cn(
        "min-h-[32px] min-w-0 flex-1 w-auto rounded-tl-[16px] rounded-bl-[16px] rounded-tr-[4px] rounded-br-[4px] group-hover/m3split:rounded-tr-[10px] group-hover/m3split:rounded-br-[10px]",
        leadingJointWhenTrailingMenuOpen(4),
        "active:rounded-tr-[10px] active:rounded-br-[10px]",
      ),
    size === "s" &&
      cn(
        "min-h-[40px] min-w-0 flex-1 w-auto rounded-tl-[20px] rounded-bl-[20px] rounded-tr-[4px] rounded-br-[4px] group-hover/m3split:rounded-tr-[12px] group-hover/m3split:rounded-br-[12px]",
        leadingJointWhenTrailingMenuOpen(4),
        "active:rounded-tr-[12px] active:rounded-br-[12px]",
      ),
    size === "m" &&
      cn(
        "min-h-[56px] min-w-0 flex-1 w-auto rounded-tl-[28px] rounded-bl-[28px] rounded-tr-[4px] rounded-br-[4px] group-hover/m3split:rounded-tr-[12px] group-hover/m3split:rounded-br-[12px]",
        leadingJointWhenTrailingMenuOpen(4),
        "active:rounded-tr-[12px] active:rounded-br-[12px]",
      ),
    size === "l" &&
      cn(
        "min-h-[96px] min-w-0 flex-1 w-auto rounded-tl-[48px] rounded-bl-[48px] rounded-tr-[6px] rounded-br-[6px] group-hover/m3split:rounded-tr-[16px] group-hover/m3split:rounded-br-[16px]",
        leadingJointWhenTrailingMenuOpen(6),
        "active:rounded-tr-[16px] active:rounded-br-[16px]",
      ),
    size === "xl" &&
      cn(
        "min-h-[136px] min-w-0 flex-1 w-auto rounded-tl-[68px] rounded-bl-[68px] rounded-tr-[8px] rounded-br-[8px] group-hover/m3split:rounded-tr-[20px] group-hover/m3split:rounded-br-[20px]",
        leadingJointWhenTrailingMenuOpen(8),
        "active:rounded-tr-[20px] active:rounded-br-[20px]",
      ),
  );
}

export function m3SplitButtonTrailingGrow(size: M3SplitButtonSize): string {
  return cn(
    segmentSurface,
    "min-w-0 flex-1 w-auto",
    size === "xs" &&
      "min-h-[32px] rounded-tr-[16px] rounded-br-[16px] rounded-tl-[4px] rounded-bl-[4px] group-hover/m3split:rounded-tl-[10px] group-hover/m3split:rounded-bl-[10px] active:rounded-tl-[10px] active:rounded-bl-[10px]",
    size === "s" &&
      "min-h-[40px] rounded-tr-[20px] rounded-br-[20px] rounded-tl-[4px] rounded-bl-[4px] group-hover/m3split:rounded-tl-[12px] group-hover/m3split:rounded-bl-[12px] active:rounded-tl-[12px] active:rounded-bl-[12px]",
    size === "m" &&
      "min-h-[56px] rounded-tr-[28px] rounded-br-[28px] rounded-tl-[4px] rounded-bl-[4px] group-hover/m3split:rounded-tl-[12px] group-hover/m3split:rounded-bl-[12px] active:rounded-tl-[12px] active:rounded-bl-[12px]",
    size === "l" &&
      "min-h-[96px] rounded-tr-[48px] rounded-br-[48px] rounded-tl-[6px] rounded-bl-[6px] group-hover/m3split:rounded-tl-[16px] group-hover/m3split:rounded-bl-[16px] active:rounded-tl-[16px] active:rounded-bl-[16px]",
    size === "xl" &&
      "min-h-[136px] rounded-tr-[68px] rounded-br-[68px] rounded-tl-[8px] rounded-bl-[8px] group-hover/m3split:rounded-tl-[20px] group-hover/m3split:rounded-bl-[20px] active:rounded-tl-[20px] active:rounded-bl-[20px]",
    trailingMenuOpenMotion(),
  );
}

/** Icône leading (FontAwesome, etc.) — centré ; padding spec disponible via `pl`/`pr` si besoin. */
export function m3SplitButtonLeadingIconClass(size: M3SplitButtonSize): string {
  return (
    {
      xs: "h-[14px] w-[14px]",
      s: "h-[18px] w-[18px]",
      m: "h-[25px] w-[25px]",
      l: "h-[43px] w-[43px]",
      xl: "h-[61px] w-[61px]",
    } as const
  )[size];
}

/** Icône trailing (spec : ex. 22dp en small). */
export function m3SplitButtonTrailingIconClass(size: M3SplitButtonSize): string {
  return (
    {
      xs: "h-[18px] w-[18px]",
      s: "h-[22px] w-[22px]",
      m: "h-[32px] w-[32px]",
      l: "h-[48px] w-[48px]",
      xl: "h-[68px] w-[68px]",
    } as const
  )[size];
}

/** Chevron Lucide : même boîte que trailing icon size. */
export function m3SplitButtonTrailingChevronClass(size: M3SplitButtonSize): string {
  return cn(
    "shrink-0 opacity-75 !transition-none",
    {
      xs: "h-[18px] w-[18px]",
      s: "h-[22px] w-[22px]",
      m: "h-[32px] w-[32px]",
      l: "h-[48px] w-[48px]",
      xl: "h-[68px] w-[68px]",
    }[size],
  );
}

/** Rayons pour contenu interne aligné sur le 1er segment (avatar) — coins extérieurs gauche + joint droit. */
export function m3SplitButtonLeadingInnerRadiiClass(size: M3SplitButtonSize): string {
  const base = (
    {
      xs: "rounded-tl-[16px] rounded-bl-[16px] rounded-tr-[4px] rounded-br-[4px] group-hover/m3split:rounded-tr-[10px] group-hover/m3split:rounded-br-[10px]",
      s: "rounded-tl-[20px] rounded-bl-[20px] rounded-tr-[4px] rounded-br-[4px] group-hover/m3split:rounded-tr-[12px] group-hover/m3split:rounded-br-[12px]",
      m: "rounded-tl-[28px] rounded-bl-[28px] rounded-tr-[4px] rounded-br-[4px] group-hover/m3split:rounded-tr-[12px] group-hover/m3split:rounded-br-[12px]",
      l: "rounded-tl-[48px] rounded-bl-[48px] rounded-tr-[6px] rounded-br-[6px] group-hover/m3split:rounded-tr-[16px] group-hover/m3split:rounded-br-[16px]",
      xl: "rounded-tl-[68px] rounded-bl-[68px] rounded-tr-[8px] rounded-br-[8px] group-hover/m3split:rounded-tr-[20px] group-hover/m3split:rounded-br-[20px]",
    } as const
  )[size];
  const joint =
    size === "l"
      ? leadingJointWhenTrailingMenuOpen(6)
      : size === "xl"
        ? leadingJointWhenTrailingMenuOpen(8)
        : leadingJointWhenTrailingMenuOpen(4);
  return cn(base, joint, "!transition-none");
}

/** Dock & rail : taille S (40dp) par défaut. */
export const M3_SPLIT_DOCK_SIZE: M3SplitButtonSize = "s";

export function m3SplitButtonDockGroup(layout: "expanded" | "compactRow"): string {
  return m3SplitButtonGroup(M3_SPLIT_DOCK_SIZE, layout);
}

export const m3SplitButtonDock = {
  groupExpanded: m3SplitButtonDockGroup("expanded"),
  groupCompactRow: m3SplitButtonDockGroup("compactRow"),
  leadingFixed: m3SplitButtonLeadingFixed(M3_SPLIT_DOCK_SIZE),
  trailingFixed: m3SplitButtonTrailingFixed(M3_SPLIT_DOCK_SIZE),
  leadingGrow: m3SplitButtonLeadingGrow(M3_SPLIT_DOCK_SIZE),
  trailingGrow: m3SplitButtonTrailingGrow(M3_SPLIT_DOCK_SIZE),
  leadingIcon: m3SplitButtonLeadingIconClass(M3_SPLIT_DOCK_SIZE),
  trailingIcon: m3SplitButtonTrailingIconClass(M3_SPLIT_DOCK_SIZE),
  trailingChevron: m3SplitButtonTrailingChevronClass(M3_SPLIT_DOCK_SIZE),
  leadingInnerRadii: m3SplitButtonLeadingInnerRadiiClass(M3_SPLIT_DOCK_SIZE),
  totalWidthPx: m3SplitButtonTotalWidthPx(M3_SPLIT_DOCK_SIZE),
  spec: M3_SPLIT_BUTTON_SPECS[M3_SPLIT_DOCK_SIZE],
} as const;