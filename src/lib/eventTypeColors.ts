/** Maps event type names to CSS variable keys for consistent coloring */
const TYPE_COLOR_MAP: Record<string, string> = {
  "RD Présentiel": "--color-rd-presentiel",
  "Club Affaires": "--color-club-affaires",
  "RD Distanciel": "--color-rd-distanciel",
  "RDV Commercial": "--color-rdv-commercial",
};

/** Direct hex colors for programmatic manipulation */
const TYPE_HEX_MAP: Record<string, string> = {
  "RD Présentiel": "#ee4540",
  "Club Affaires": "#ffbd23",
  "RD Distanciel": "#234653",
  "RDV Commercial": "#5dbcb9",
};

export function getTypeColorVar(type: string): string {
  return TYPE_COLOR_MAP[type] || "--primary";
}

export function getTypeColorHSL(type: string): string {
  return `hsl(var(${getTypeColorVar(type)}))`;
}

export function getTypeHex(type: string): string {
  return TYPE_HEX_MAP[type] || "#e0115f";
}

/** Lighten a hex color by a factor (0-1) */
function lightenHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

/** Darken a hex color by a factor (0-1) */
function darkenHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * (1 - factor));
  const dg = Math.round(g * (1 - factor));
  const db = Math.round(b * (1 - factor));
  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
}

/** Returns { min, avg, max } hex colors for a type */
export function getTypeColorTriad(type: string) {
  const hex = TYPE_HEX_MAP[type] || "#e0115f";
  return {
    min: lightenHex(hex, 0.45),
    avg: hex,
    max: darkenHex(hex, 0.3),
  };
}
