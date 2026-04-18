import { blueFromArgb, greenFromArgb, redFromArgb } from "@material/material-color-utilities";

/**
 * Composantes HSL pour variables Tailwind/shadcn (`hsl(var(--x))` → `--x` = "H S% L%").
 */
export function hslComponentsFromArgb(argb: number): string {
  const r = redFromArgb(argb) / 255;
  const g = greenFromArgb(argb) / 255;
  const b = blueFromArgb(argb) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
