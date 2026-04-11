/**
 * Indique si la couleur de fond du QR doit être traitée comme transparente (SVG / export).
 */
export function isTransparentBgColor(value: string | undefined | null): boolean {
  const t = (value ?? "").trim().toLowerCase();
  if (t === "transparent") return true;
  if (t === "rgba(0, 0, 0, 0)" || t === "rgba(0,0,0,0)") return true;
  return false;
}
