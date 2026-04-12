/**
 * Préfixe marketing souvent présent dans les imports / historique (CSV, seeds).
 * On le retire uniquement en tête de chaîne pour l’affichage.
 */
const DYNABUY_CLUB_PREFIX = /^\s*dynabuy\s+club\s+/i;

/**
 * Nom du club à l’écran : sans préfixe marketing + casse titre (ex. DOMONT PROS BÂTIMENT → Domont Pros Bâtiment).
 */
export function displayClubName(raw: string | null | undefined): string {
  const t = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const withoutPrefix = normalizeImportClubName(raw);
  const base = trimClubNameSeparatorsEnds(withoutPrefix || t);
  return normalizeClubNameTitleCase(stripClubNameMarketingNoise(base));
}

/**
 * Initiales pour avatar (2 caractères) à partir du nom affiché.
 */
export function clubNameInitials(raw: string | null | undefined): string {
  const d = displayClubName(raw);
  const src = d.length >= 2 ? d : (raw ?? "").trim();
  return src.substring(0, 2).toUpperCase();
}

/**
 * Nom stocké après import CSV : retire les préfixes « DYNABUY CLUB » répétés en tête et normalise les espaces.
 */
export function normalizeImportClubName(raw: string | null | undefined): string {
  let t = (raw ?? "").replace(/\s+/g, " ").trim();
  while (/^\s*dynabuy\s+club\s+/i.test(t)) {
    t = t.replace(/^\s*dynabuy\s+club\s+/i, "").replace(/\s+/g, " ").trim();
  }
  return trimClubNameSeparatorsEnds(t);
}

/**
 * Retire des fragments marketing (toutes casses) : « club affaires », « club d’affaires », « dynabuy », combinaisons.
 * Plusieurs passes pour gérer des répétitions ou l’ordre variable des segments.
 */
export function stripClubNameMarketingNoise(raw: string | null | undefined): string {
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
  return trimClubNameSeparatorsEnds(s);
}

/**
 * Après découpe « Dynabuy Club - … », retire les tirets / espaces résiduels en tête et fin
 * (ex. « - Mellois en Poitou » → « Mellois en Poitou »).
 */
export function trimClubNameSeparatorsEnds(raw: string | null | undefined): string {
  let s = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const reLead = /^[\s\-–—:·]+/;
  const reTail = /[\s\-–—:·]+$/;
  for (let i = 0; i < 8; i++) {
    const next = s.replace(reLead, "").replace(reTail, "").replace(/\s+/g, " ").trim();
    if (next === s) break;
    s = next;
  }
  return s;
}

/**
 * Première lettre de chaque mot en majuscule, le reste en minuscules (FR / accents Unicode).
 * Sous-mots séparés par un tiret traités chacun (ex. Saint-Nazaire).
 */
export function normalizeClubNameTitleCase(raw: string | null | undefined): string {
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

/**
 * Import CSV : préfixe DYNABUY retiré, fragments marketing supprimés, puis casse « titre ».
 */
export function normalizeClubNameForImport(raw: string | null | undefined): string {
  return normalizeClubNameTitleCase(
    stripClubNameMarketingNoise(normalizeImportClubName(raw)),
  );
}
