/**
 * Aligné avec `src/lib/clubDisplayName.ts` — toute évolution doit être reportée des deux côtés.
 */

function normalizeImportClubName(raw: string | null | undefined): string {
  let t = (raw ?? "").replace(/\s+/g, " ").trim();
  while (/^\s*dynabuy\s+club\s+/i.test(t)) {
    t = t.replace(/^\s*dynabuy\s+club\s+/i, "").replace(/\s+/g, " ").trim();
  }
  return t;
}

/** Aligné avec `stripClubNameMarketingNoise` dans `src/lib/clubDisplayName.ts`. */
function stripClubNameMarketingNoise(raw: string | null | undefined): string {
  let s = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";

  const patterns: RegExp[] = [
    /\bclub\s+(?:d[''\u2018\u2019]?\s*)?affaires\s+dynabuy\b/gi,
    /\bclub\s+(?:d[''\u2018\u2019]?\s*)?affaires\b/gi,
    /\bdynabuy\b/gi,
  ];

  for (let pass = 0; pass < 6; pass++) {
    let next = s;
    for (const re of patterns) {
      next = next.replace(re, " ");
    }
    next = next.replace(/\s+/g, " ").trim();
    if (next === s) break;
    s = next;
  }
  return s;
}

function normalizeClubNameTitleCase(raw: string | null | undefined): string {
  const t = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";

  const capToken = (s: string): string => {
    const lower = s.toLowerCase();
    if (!lower) return s;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  return t
    .split(/\s+/)
    .map((word) =>
      word.includes("-")
        ? word.split("-").map((p) => (p ? capToken(p) : p)).join("-")
        : capToken(word),
    )
    .join(" ");
}

/** Même pipeline que `normalizeClubNameForImport` côté app. */
export function normalizeClubNameForEdge(raw: string | null | undefined): string {
  return normalizeClubNameTitleCase(stripClubNameMarketingNoise(normalizeImportClubName(raw)));
}
