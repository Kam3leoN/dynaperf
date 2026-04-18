import { hexToHsl, hslToHex, hexToHslComponents } from "@/theme/colorMath";

/**
 * Thème statique M3 : une seule teinte d’ancrage (#0099ff).
 * Secondary / tertiary = rampes tonales (même teinte, tons & chroma différents).
 * Surfaces neutres = gris froid fixes (pas de schéma Material dynamique).
 */

export const BRAND_PRIMARY_HEX = "#0099ff";
export const SURFACE_WHITE_HEX = "#ffffff";

const MD_SYS_NUMERIC_KEYS = [
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
  "inverseSecondary",
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
] as const;

type MdSysKey = (typeof MD_SYS_NUMERIC_KEYS)[number];

function camelToKebab(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function mdSysVarName(key: string): string {
  return `--md-sys-color-${camelToKebab(key)}`;
}

/** Teinte d’ancrage (H) — tous les rôles colorés non-neutres en dérivent. */
function primaryHue(): number {
  return Math.round(hexToHsl(BRAND_PRIMARY_HEX).h);
}

function mdSysPaletteLight(): Record<MdSysKey, string> {
  const PH = primaryHue();
  const NH = 215;
  return {
    background: hslToHex(NH, 6, 98),
    onBackground: hslToHex(NH, 28, 11),
    surface: hslToHex(NH, 5, 97),
    surfaceDim: hslToHex(NH, 5, 93),
    surfaceBright: hslToHex(NH, 6, 99),
    surfaceContainerLowest: SURFACE_WHITE_HEX,
    surfaceContainerLow: hslToHex(NH, 5, 96),
    surfaceContainer: hslToHex(NH, 5, 94),
    surfaceContainerHigh: hslToHex(NH, 5, 92),
    surfaceContainerHighest: hslToHex(NH, 5, 89),
    onSurface: hslToHex(NH, 26, 12),
    surfaceVariant: hslToHex(NH, 6, 88),
    onSurfaceVariant: hslToHex(NH, 14, 38),
    inverseSurface: hslToHex(NH, 22, 20),
    inverseOnSurface: hslToHex(NH, 10, 95),
    outline: hslToHex(NH, 10, 48),
    outlineVariant: hslToHex(NH, 8, 80),
    shadow: "#000000",
    scrim: "#000000",
    surfaceTint: BRAND_PRIMARY_HEX,

    primary: BRAND_PRIMARY_HEX,
    primaryDim: hslToHex(PH, 80, 38),
    onPrimary: SURFACE_WHITE_HEX,
    primaryContainer: hslToHex(PH, 55, 91),
    onPrimaryContainer: hslToHex(PH, 92, 20),
    inversePrimary: hslToHex(PH, 48, 88),
    primaryFixed: hslToHex(PH, 48, 90),
    primaryFixedDim: hslToHex(PH, 42, 82),
    onPrimaryFixed: hslToHex(PH, 96, 14),
    onPrimaryFixedVariant: hslToHex(PH, 62, 28),

    secondary: hslToHex(PH, 58, 42),
    secondaryDim: hslToHex(PH, 52, 34),
    onSecondary: SURFACE_WHITE_HEX,
    secondaryContainer: hslToHex(PH, 38, 90),
    onSecondaryContainer: hslToHex(PH, 88, 22),
    secondaryFixed: hslToHex(PH, 40, 88),
    secondaryFixedDim: hslToHex(PH, 35, 78),
    onSecondaryFixed: hslToHex(PH, 96, 14),
    onSecondaryFixedVariant: hslToHex(PH, 58, 28),
    inverseSecondary: hslToHex(PH, 35, 86),

    tertiary: hslToHex(PH, 70, 54),
    tertiaryDim: hslToHex(PH, 62, 42),
    onTertiary: SURFACE_WHITE_HEX,
    tertiaryContainer: hslToHex(PH, 42, 87),
    onTertiaryContainer: hslToHex(PH, 85, 22),
    tertiaryFixed: hslToHex(PH, 44, 86),
    tertiaryFixedDim: hslToHex(PH, 38, 76),
    onTertiaryFixed: hslToHex(PH, 96, 12),
    onTertiaryFixedVariant: hslToHex(PH, 58, 26),

    error: "#ba1a1a",
    errorDim: "#93000a",
    onError: SURFACE_WHITE_HEX,
    errorContainer: "#ffdad6",
    onErrorContainer: "#410002",
  };
}

function mdSysPaletteDark(): Record<MdSysKey, string> {
  const PH = primaryHue();
  const NH = 220;
  return {
    background: hslToHex(NH, 22, 8),
    onBackground: hslToHex(215, 12, 92),
    surface: hslToHex(NH, 20, 11),
    surfaceDim: hslToHex(222, 24, 6),
    surfaceBright: hslToHex(218, 16, 14),
    surfaceContainerLowest: hslToHex(222, 22, 6),
    surfaceContainerLow: hslToHex(NH, 18, 11),
    surfaceContainer: hslToHex(218, 16, 13),
    surfaceContainerHigh: hslToHex(216, 14, 17),
    surfaceContainerHighest: hslToHex(214, 12, 20),
    onSurface: hslToHex(215, 12, 92),
    surfaceVariant: hslToHex(218, 10, 22),
    onSurfaceVariant: hslToHex(215, 12, 72),
    inverseSurface: hslToHex(215, 10, 92),
    inverseOnSurface: hslToHex(218, 24, 12),
    outline: hslToHex(215, 10, 48),
    outlineVariant: hslToHex(218, 10, 28),
    shadow: "#000000",
    scrim: "#000000",
    surfaceTint: hslToHex(PH, 100, 60),

    primary: hslToHex(PH, 100, 60),
    primaryDim: hslToHex(PH, 65, 45),
    onPrimary: hslToHex(210, 100, 8),
    primaryContainer: hslToHex(PH, 45, 26),
    onPrimaryContainer: hslToHex(PH, 100, 88),
    inversePrimary: hslToHex(PH, 40, 28),
    primaryFixed: hslToHex(PH, 48, 88),
    primaryFixedDim: hslToHex(PH, 42, 78),
    onPrimaryFixed: hslToHex(PH, 95, 12),
    onPrimaryFixedVariant: hslToHex(PH, 55, 75),

    secondary: hslToHex(PH, 58, 72),
    secondaryDim: hslToHex(PH, 48, 58),
    onSecondary: hslToHex(215, 100, 8),
    secondaryContainer: hslToHex(PH, 35, 28),
    onSecondaryContainer: hslToHex(PH, 85, 88),
    secondaryFixed: hslToHex(PH, 40, 86),
    secondaryFixedDim: hslToHex(PH, 34, 74),
    onSecondaryFixed: hslToHex(PH, 95, 10),
    onSecondaryFixedVariant: hslToHex(PH, 52, 72),
    inverseSecondary: hslToHex(PH, 32, 24),

    tertiary: hslToHex(PH, 72, 68),
    tertiaryDim: hslToHex(PH, 58, 52),
    onTertiary: hslToHex(215, 100, 8),
    tertiaryContainer: hslToHex(PH, 38, 30),
    onTertiaryContainer: hslToHex(PH, 88, 90),
    tertiaryFixed: hslToHex(PH, 42, 84),
    tertiaryFixedDim: hslToHex(PH, 36, 72),
    onTertiaryFixed: hslToHex(PH, 95, 10),
    onTertiaryFixedVariant: hslToHex(PH, 52, 78),

    error: "#ffb4ab",
    errorDim: "#ff5449",
    onError: "#690005",
    errorContainer: "#93000a",
    onErrorContainer: "#ffdad6",
  };
}

function paletteToMdSysCss(palette: Record<MdSysKey, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of MD_SYS_NUMERIC_KEYS) {
    out[mdSysVarName(key)] = palette[key];
  }
  return out;
}

/**
 * Pont shadcn/Tailwind : tons dérivés du primaire (secondary/accent = rampes tonales, pas d’autres teintes).
 */
function paletteToShadcnBridge(palette: Record<MdSysKey, string>, isDark: boolean): Record<string, string> {
  const whiteHsl = hexToHslComponents(SURFACE_WHITE_HEX);

  return {
    "--background": hexToHslComponents(palette.background),
    "--foreground": hexToHslComponents(palette.onBackground),
    "--card": isDark ? hexToHslComponents(palette.surfaceContainerHighest) : whiteHsl,
    "--card-foreground": hexToHslComponents(palette.onSurface),
    "--popover": isDark ? hexToHslComponents(palette.surfaceContainerHigh) : whiteHsl,
    "--popover-foreground": hexToHslComponents(palette.onSurface),
    "--primary": hexToHslComponents(palette.primary),
    "--primary-foreground": hexToHslComponents(palette.onPrimary),
    "--secondary": hexToHslComponents(palette.secondaryContainer),
    "--secondary-foreground": hexToHslComponents(palette.onSecondaryContainer),
    "--muted": hexToHslComponents(palette.surfaceVariant),
    "--muted-foreground": hexToHslComponents(palette.onSurfaceVariant),
    "--accent": hexToHslComponents(palette.tertiaryContainer),
    "--accent-foreground": hexToHslComponents(palette.onTertiaryContainer),
    "--destructive": hexToHslComponents(palette.error),
    "--destructive-foreground": hexToHslComponents(palette.onError),
    "--border": hexToHslComponents(palette.outlineVariant),
    "--input": hexToHslComponents(palette.outline),
    "--ring": hexToHslComponents(palette.primary),
    "--sidebar-background": hexToHslComponents(palette.surfaceContainerLow),
    "--sidebar-foreground": hexToHslComponents(palette.onSurface),
    "--sidebar-primary": hexToHslComponents(palette.primary),
    "--sidebar-primary-foreground": hexToHslComponents(palette.onPrimary),
    "--sidebar-accent": hexToHslComponents(palette.surfaceContainerHigh),
    "--sidebar-accent-foreground": hexToHslComponents(palette.onSurface),
    "--sidebar-border": hexToHslComponents(palette.outlineVariant),
    "--sidebar-ring": hexToHslComponents(palette.primary),
    "--surface-dim": hexToHslComponents(palette.surfaceDim),
    "--surface-container": hexToHslComponents(palette.surfaceContainer),
    "--surface-container-high": hexToHslComponents(palette.surfaceContainerHigh),
    "--surface-container-highest": hexToHslComponents(palette.surfaceContainerHighest),
    "--outline-variant": hexToHslComponents(palette.outlineVariant),
  };
}

export function buildFullThemeVariables(isDark: boolean): Record<string, string> {
  const palette = isDark ? mdSysPaletteDark() : mdSysPaletteLight();
  return { ...paletteToMdSysCss(palette), ...paletteToShadcnBridge(palette, isDark) };
}

export function themeColorMetaHex(isDark: boolean): string {
  return (isDark ? mdSysPaletteDark() : mdSysPaletteLight()).primary;
}

export function themeBackgroundMetaHex(isDark: boolean): string {
  return (isDark ? mdSysPaletteDark() : mdSysPaletteLight()).surface;
}

/** Compat : ancien nom exporté vers meta PWA / scripts. */
export const DYNAPERF_PRIMARY_HEX = BRAND_PRIMARY_HEX;

/**
 * Meta `theme-color` — à garder aligné avec le script anti-FOUC dans `index.html`
 * (même logique que `themeColorMetaHex` clair / sombre).
 */
export const FOUC_META_THEME_COLOR_LIGHT_HEX = BRAND_PRIMARY_HEX;
export const FOUC_META_THEME_COLOR_DARK_HEX = hslToHex(Math.round(hexToHsl(BRAND_PRIMARY_HEX).h), 100, 60);
