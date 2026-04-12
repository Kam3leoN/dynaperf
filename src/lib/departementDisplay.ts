import departementsAffichage from "@/data/departements-affichage.json";

type AffichageDept = { nom: string; prefecture: string };

const AFFICHAGE = departementsAffichage as Record<string, AffichageDept>;

/**
 * Normalise un code département pour comparaisons (secteurs, clés JSON).
 */
export function normalizeDeptMatchKey(code: string): string {
  const c = code.trim().toUpperCase();
  if (c === "2A" || c === "2B") return c;
  if (/^\d$/.test(c)) return c.padStart(2, "0");
  if (/^\d{2,3}$/.test(c)) return c;
  return c;
}

/**
 * Extrait le code INSEE du département depuis une saisie libre (ex. « 28 », « 28 Chartres », « Eure-et-Loir (28) »).
 */
export function extractDepartementCode(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return null;
  const upper = t.toUpperCase();
  const m2ab = upper.match(/\b(2[AB])\b/);
  if (m2ab) return m2ab[1];
  const mDom = upper.match(/\b(97[1-6])\b/);
  if (mDom) return mDom[1];
  const m2 = upper.match(/\b(\d{2,3})\b/);
  if (m2) return normalizeDeptMatchKey(m2[1]);
  return null;
}

/**
 * Valeur stockée en base : code seul quand c’est possible (ex. `28`).
 */
export function normalizeDepartementForStorage(raw: string | null | undefined): string | null {
  const code = extractDepartementCode(raw);
  return code ?? (raw?.trim() ? raw.replace(/\s+/g, " ").trim() : null);
}

/**
 * Retourne le secteur (ligne `secteurs`) dont la liste `departements` contient ce code.
 */
export function findSecteurIdForDepartementCode(
  code: string | null | undefined,
  secteurs: { id: string; departements: string[] }[],
): string | null {
  if (!code || !secteurs?.length) return null;
  const key = normalizeDeptMatchKey(code);
  const found = secteurs.find((s) =>
    (s.departements || []).some((d) => normalizeDeptMatchKey(String(d)) === key),
  );
  return found?.id ?? null;
}

export interface DepartementLines {
  line1: string;
  line2: string;
}

/**
 * Libellés affichage type :
 * `28 Chartres`
 * `(Eure-et-Loir)`
 */
export function getDepartementDisplayLines(raw: string | null | undefined): DepartementLines | null {
  const code = extractDepartementCode(raw);
  if (!code) {
    const t = raw?.replace(/\s+/g, " ").trim();
    if (!t) return null;
    return { line1: t, line2: "" };
  }
  const info = AFFICHAGE[code];
  if (info) {
    return {
      line1: `${code} ${info.prefecture}`,
      line2: `(${info.nom})`,
    };
  }
  return { line1: code, line2: "" };
}
