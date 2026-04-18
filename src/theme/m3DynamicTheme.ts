import {
  SchemeExpressive,
  Hct,
  argbFromHex,
  hexFromArgb,
  customColor,
  type DynamicScheme,
  type CustomColorGroup,
} from "@material/material-color-utilities";
import { hslComponentsFromArgb } from "@/theme/hslFromArgb";

/** Graine primaire DynaPerf (Material You). */
export const DYNAPERF_PRIMARY_HEX = "#ee4540";
/** Graine secondaire (HCT) — base #cdeaf2, harmonisée au primaire. */
export const DYNAPERF_SECONDARY_HEX = "#cdeaf2";

const sourceArgb = argbFromHex(DYNAPERF_PRIMARY_HEX);
const sourceHct = Hct.fromInt(sourceArgb);

/** Schémas Material 3 Expressive (dynamic color). */
export const schemeExpressiveLight = new SchemeExpressive(sourceHct, false, 0);
export const schemeExpressiveDark = new SchemeExpressive(sourceHct, true, 0);

/** Couleur secondaire personnalisée (blend harmonisé). */
export const secondaryCustomGroup: CustomColorGroup = customColor(sourceArgb, {
  name: "secondary",
  value: argbFromHex(DYNAPERF_SECONDARY_HEX),
  blend: true,
});

const MD_SYS_NUMERIC_KEYS: (keyof DynamicScheme)[] = [
  "background",
  "onBackground",
  "surface",
  "surfaceDim",
  "surfaceBright",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "onSurface",
  "surfaceVariant",
  "onSurfaceVariant",
  "inverseSurface",
  "inverseOnSurface",
  "outline",
  "outlineVariant",
  "shadow",
  "scrim",
  "surfaceTint",
  "primary",
  "primaryDim",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "inversePrimary",
  "primaryFixed",
  "primaryFixedDim",
  "onPrimaryFixed",
  "onPrimaryFixedVariant",
  "secondary",
  "secondaryDim",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "secondaryFixed",
  "secondaryFixedDim",
  "onSecondaryFixed",
  "onSecondaryFixedVariant",
  "tertiary",
  "tertiaryDim",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "tertiaryFixed",
  "tertiaryFixedDim",
  "onTertiaryFixed",
  "onTertiaryFixedVariant",
  "error",
  "errorDim",
  "onError",
  "errorContainer",
  "onErrorContainer",
];

function camelToKebab(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function mdSysVarName(key: string): string {
  return `--md-sys-color-${camelToKebab(key)}`;
}

/**
 * Sérialise un DynamicScheme en variables CSS Material Web (`--md-sys-color-*`, valeurs hex).
 */
export function schemeToMdSysColors(scheme: DynamicScheme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of MD_SYS_NUMERIC_KEYS) {
    const v = (scheme as unknown as Record<string, unknown>)[key as string];
    if (typeof v === "number") {
      out[mdSysVarName(key as string)] = hexFromArgb(v);
    }
  }
  return out;
}

/** Applique la couleur secondaire harmonisée (remplace les rôles secondary* du schéma). */
export function applySecondaryCustomToMdSys(
  vars: Record<string, string>,
  group: CustomColorGroup,
  isDark: boolean,
): void {
  const g = isDark ? group.dark : group.light;
  vars["--md-sys-color-secondary"] = hexFromArgb(g.color);
  vars["--md-sys-color-on-secondary"] = hexFromArgb(g.onColor);
  vars["--md-sys-color-secondary-container"] = hexFromArgb(g.colorContainer);
  vars["--md-sys-color-on-secondary-container"] = hexFromArgb(g.onColorContainer);
}

/**
 * Pont vers les variables shadcn/Tailwind (`hsl(var(--primary))`, etc.).
 */
export function schemeToShadcnBridge(scheme: DynamicScheme, secondary: CustomColorGroup, isDark: boolean): Record<string, string> {
  const sec = isDark ? secondary.dark : secondary.light;
  return {
    "--background": hslComponentsFromArgb(scheme.background),
    "--foreground": hslComponentsFromArgb(scheme.onBackground),
    "--card": hslComponentsFromArgb(scheme.surfaceContainerHighest),
    "--card-foreground": hslComponentsFromArgb(scheme.onSurface),
    "--popover": hslComponentsFromArgb(scheme.surfaceContainerHigh),
    "--popover-foreground": hslComponentsFromArgb(scheme.onSurface),
    "--primary": hslComponentsFromArgb(scheme.primary),
    "--primary-foreground": hslComponentsFromArgb(scheme.onPrimary),
    "--secondary": hslComponentsFromArgb(sec.colorContainer),
    "--secondary-foreground": hslComponentsFromArgb(sec.onColorContainer),
    "--muted": hslComponentsFromArgb(scheme.surfaceVariant),
    "--muted-foreground": hslComponentsFromArgb(scheme.onSurfaceVariant),
    "--accent": hslComponentsFromArgb(scheme.tertiaryContainer),
    "--accent-foreground": hslComponentsFromArgb(scheme.onTertiaryContainer),
    "--destructive": hslComponentsFromArgb(scheme.error),
    "--destructive-foreground": hslComponentsFromArgb(scheme.onError),
    "--border": hslComponentsFromArgb(scheme.outlineVariant),
    "--input": hslComponentsFromArgb(scheme.outline),
    "--ring": hslComponentsFromArgb(scheme.primary),
    "--sidebar-background": hslComponentsFromArgb(scheme.surfaceContainerLow),
    "--sidebar-foreground": hslComponentsFromArgb(scheme.onSurface),
    "--sidebar-primary": hslComponentsFromArgb(scheme.primary),
    "--sidebar-primary-foreground": hslComponentsFromArgb(scheme.onPrimary),
    "--sidebar-accent": hslComponentsFromArgb(scheme.surfaceContainerHigh),
    "--sidebar-accent-foreground": hslComponentsFromArgb(scheme.onSurface),
    "--sidebar-border": hslComponentsFromArgb(scheme.outlineVariant),
    "--sidebar-ring": hslComponentsFromArgb(scheme.primary),
    "--surface-dim": hslComponentsFromArgb(scheme.surfaceDim),
    "--surface-container": hslComponentsFromArgb(scheme.surfaceContainer),
    "--surface-container-high": hslComponentsFromArgb(scheme.surfaceContainerHigh),
    "--surface-container-highest": hslComponentsFromArgb(scheme.surfaceContainerHighest),
    "--outline-variant": hslComponentsFromArgb(scheme.outlineVariant),
  };
}

export function buildFullThemeVariables(isDark: boolean): Record<string, string> {
  const scheme = isDark ? schemeExpressiveDark : schemeExpressiveLight;
  const md = schemeToMdSysColors(scheme);
  applySecondaryCustomToMdSys(md, secondaryCustomGroup, isDark);
  const bridge = schemeToShadcnBridge(scheme, secondaryCustomGroup, isDark);
  return { ...md, ...bridge };
}

/** Couleur pour meta theme-color / manifest (PWA). */
export function themeColorMetaHex(isDark: boolean): string {
  const scheme = isDark ? schemeExpressiveDark : schemeExpressiveLight;
  return hexFromArgb(scheme.primary);
}

export function themeBackgroundMetaHex(isDark: boolean): string {
  const scheme = isDark ? schemeExpressiveDark : schemeExpressiveLight;
  return hexFromArgb(scheme.surface);
}
