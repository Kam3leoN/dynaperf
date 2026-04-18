import {
  SchemeExpressive,
  Hct,
  argbFromHex,
  hexFromArgb,
  type DynamicScheme,
} from "@material/material-color-utilities";
import { hslComponentsFromArgb } from "@/theme/hslFromArgb";

/** Graine unique HCT / Material You (couleur dynamique). */
export const DYNAPERF_PRIMARY_HEX = "#0099ff";

const sourceArgb = argbFromHex(DYNAPERF_PRIMARY_HEX);
const sourceHct = Hct.fromInt(sourceArgb);

/** Schémas Material 3 Expressive dérivés de la graine primaire. */
export const schemeExpressiveLight = new SchemeExpressive(sourceHct, false, 0);
export const schemeExpressiveDark = new SchemeExpressive(sourceHct, true, 0);

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

/**
 * Pont vers les variables shadcn/Tailwind — entièrement dérivé du schéma expressif.
 */
export function schemeToShadcnBridge(scheme: DynamicScheme): Record<string, string> {
  return {
    "--background": hslComponentsFromArgb(scheme.background),
    "--foreground": hslComponentsFromArgb(scheme.onBackground),
    "--card": hslComponentsFromArgb(scheme.surfaceContainerHighest),
    "--card-foreground": hslComponentsFromArgb(scheme.onSurface),
    "--popover": hslComponentsFromArgb(scheme.surfaceContainerHigh),
    "--popover-foreground": hslComponentsFromArgb(scheme.onSurface),
    "--primary": hslComponentsFromArgb(scheme.primary),
    "--primary-foreground": hslComponentsFromArgb(scheme.onPrimary),
    "--secondary": hslComponentsFromArgb(scheme.secondaryContainer),
    "--secondary-foreground": hslComponentsFromArgb(scheme.onSecondaryContainer),
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
  const bridge = schemeToShadcnBridge(scheme);
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
