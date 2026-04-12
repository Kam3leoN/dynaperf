/**
 * Formats d’export type Dynabuy : « NOM/Prénom » ou « NOM / Prénom » → « Prénom NOM ».
 * Sans slash, la chaîne est seulement nettoyée (espaces).
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
