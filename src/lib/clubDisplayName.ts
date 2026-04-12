/**
 * Préfixe marketing souvent présent dans les imports / historique (CSV, seeds).
 * On le retire uniquement en tête de chaîne pour l’affichage.
 */
const DYNABUY_CLUB_PREFIX = /^\s*dynabuy\s+club\s+/i;

/**
 * Nom du club tel qu’affiché dans les tableaux (sans « DYNABUY CLUB » en préfixe).
 */
export function displayClubName(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "";
  const stripped = t.replace(DYNABUY_CLUB_PREFIX, "").trim();
  return stripped || t;
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
  return t;
}
