/** Maps event type names to CSS variable keys for consistent coloring */
const TYPE_COLOR_MAP: Record<string, string> = {
  "RD Présentiel": "--color-rd-presentiel",
  "Club Affaires": "--color-club-affaires",
  "RD Distanciel": "--color-rd-distanciel",
  "RDV Commercial": "--color-rdv-commercial",
};

export function getTypeColorVar(type: string): string {
  return TYPE_COLOR_MAP[type] || "--primary";
}

export function getTypeColorHSL(type: string): string {
  return `hsl(var(${getTypeColorVar(type)}))`;
}
