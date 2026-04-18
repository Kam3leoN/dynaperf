import { useEffect, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  buildFullThemeVariables,
  themeBackgroundMetaHex,
  themeColorMetaHex,
} from "@/theme/m3DynamicTheme";

const THEME_COLOR_SELECTOR = 'meta[name="theme-color"]';

/**
 * Applique les variables HCT / MD3 Expressive sur `:root` et synchronise le meta theme-color PWA.
 */
export function M3ThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    const vars = buildFullThemeVariables(isDark);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
    }

    const meta = document.querySelector(THEME_COLOR_SELECTOR);
    if (meta) {
      meta.setAttribute("content", themeColorMetaHex(isDark));
    }

    root.style.setProperty("--m3-pwa-background", themeBackgroundMetaHex(isDark));
  }, [resolvedTheme]);

  return <>{children}</>;
}
