/**
 * Prépare le SVG pour un rendu avec `fill: currentColor` (couleur via style parent).
 */
export function preparePresenceSvgMarkup(markup: string): string {
  const trimmed = markup.trim();
  if (!trimmed.includes("<svg")) return "";
  const noScripts = trimmed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  let s = noScripts.replace(/^<\?xml[^?]*\?>\s*/i, "");
  if (!s.includes('fill="') && !s.includes("fill='")) {
    s = s.replace(/<svg\b/i, '<svg fill="currentColor" ');
  } else {
    s = s.replace(/\sfill="[^"]*"/gi, ' fill="currentColor"').replace(/\sfill='[^']*'/gi, " fill='currentColor'");
  }
  return s;
}
