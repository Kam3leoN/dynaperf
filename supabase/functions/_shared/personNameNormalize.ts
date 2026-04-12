/**
 * Aligné avec `src/lib/personNameNormalize.ts` — toute évolution de règle doit être reportée des deux côtés.
 */
export function normalizePresidentImportName(raw: string | null | undefined): string {
  let t = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const idx = t.indexOf("/");
  if (idx === -1) return t;
  const nomFamille = t.slice(0, idx).trim();
  const prenom = t.slice(idx + 1).trim();
  if (!prenom && !nomFamille) return "";
  if (!nomFamille) return prenom;
  if (!prenom) return nomFamille;
  return `${prenom} ${nomFamille}`;
}
