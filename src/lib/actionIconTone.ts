import type { CSSProperties } from "react";

/** Réglages optionnels des pourcentages `color-mix` (même teinte, plus ou moins de pigment). */
export type ActionIconToneMix = {
  bg: string;
  hover: string;
  bgDark: string;
  hoverDark: string;
};

/** Valeurs par défaut si tu ne passes qu’une couleur (`tone`). */
export const DEFAULT_ACTION_ICON_MIX: ActionIconToneMix = {
  bg: "14%",
  hover: "27%",
  bgDark: "28%",
  hoverDark: "40%",
};

export type ActionIconTonePreset = { tone: string } & ActionIconToneMix;

export type ActionIconVariant =
  | "default"
  | "primary"
  | "ghost"
  | "view"
  | "schedule"
  | "edit"
  | "audit"
  | "destructive"
  | "warning"
  | "success";

/** Presets métier (couleur + mix souvent utilisés pour cette action). */
export const ACTION_ICON_TONE_PRESETS: Record<ActionIconVariant, ActionIconTonePreset> = {
  default: {
    tone: "#64748b",
    bg: "12%",
    hover: "22%",
    bgDark: "28%",
    hoverDark: "40%",
  },
  primary: {
    tone: "hsl(var(--primary))",
    bg: "14%",
    hover: "26%",
    bgDark: "30%",
    hoverDark: "42%",
  },
  ghost: {
    tone: "#78716c",
    bg: "10%",
    hover: "20%",
    bgDark: "22%",
    hoverDark: "34%",
  },
  view: {
    tone: "#6750A4",
    bg: "13%",
    hover: "26%",
    bgDark: "28%",
    hoverDark: "40%",
  },
  schedule: {
    tone: "#ffc107",
    bg: "16%",
    hover: "30%",
    bgDark: "22%",
    hoverDark: "36%",
  },
  edit: {
    tone: "#607d8b",
    bg: "13%",
    hover: "26%",
    bgDark: "28%",
    hoverDark: "40%",
  },
  audit: {
    tone: "#0099ff",
    bg: "12%",
    hover: "24%",
    bgDark: "26%",
    hoverDark: "38%",
  },
  destructive: {
    tone: "#ee4540",
    bg: "12%",
    hover: "24%",
    bgDark: "26%",
    hoverDark: "38%",
  },
  warning: {
    tone: "#f59e0b",
    bg: "14%",
    hover: "28%",
    bgDark: "28%",
    hoverDark: "42%",
  },
  success: {
    tone: "#059669",
    bg: "12%",
    hover: "24%",
    bgDark: "26%",
    hoverDark: "38%",
  },
};

/**
 * Styles inline pour appliquer la mixin sur n’importe quel élément
 * (bouton custom, lien, etc.) — combiner avec la classe `action-icon-tone` dans le CSS global.
 *
 * @example Nouvelle action avec seulement une couleur (mix par défaut)
 * ```tsx
 * <button
 *   type="button"
 *   className="action-icon-tone inline-flex h-8 w-8 items-center justify-center rounded-md"
 *   style={actionIconToneStyle("#e91e63")}
 * />
 * ```
 */
export function actionIconToneStyle(
  tone: string,
  mix: Partial<ActionIconToneMix> = {},
): CSSProperties {
  const m = { ...DEFAULT_ACTION_ICON_MIX, ...mix };
  return {
    "--action-tone": tone,
    "--action-bg-mix": m.bg,
    "--action-hover-mix": m.hover,
    "--action-bg-mix-dark": m.bgDark,
    "--action-hover-mix-dark": m.hoverDark,
  } as CSSProperties;
}

/** Styles inline à partir d’un preset nommé (voir `ACTION_ICON_TONE_PRESETS`). */
export function actionIconToneStyleFromPreset(presetKey: ActionIconVariant): CSSProperties {
  const p = ACTION_ICON_TONE_PRESETS[presetKey];
  return actionIconToneStyle(p.tone, {
    bg: p.bg,
    hover: p.hover,
    bgDark: p.bgDark,
    hoverDark: p.hoverDark,
  });
}
