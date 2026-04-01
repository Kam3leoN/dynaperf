/** Shared prime configuration and utility functions */

export interface PrimeConfig {
  prime_audit_1: number;
  prime_audit_2: number;
  prime_audit_3_plus: number;
  prime_distanciel_1: number;
  prime_distanciel_2: number;
  prime_distanciel_3_plus: number;
  prime_club_1: number;
  prime_club_2: number;
  prime_club_3_plus: number;
  prime_rdv_1: number;
  prime_rdv_2: number;
  prime_rdv_3_plus: number;
  prime_suivi_1: number;
  prime_suivi_2: number;
  prime_suivi_3_plus: number;
  prime_mep_1: number;
  prime_mep_2: number;
  prime_mep_3_plus: number;
  prime_evenementiel_1: number;
  prime_evenementiel_2: number;
  prime_evenementiel_3_plus: number;
}

/** Format keys used in the admin UI */
export const FORMAT_KEYS = [
  { key: "audit", label: "RD Présentiel" },
  { key: "distanciel", label: "RD Distanciel" },
  { key: "club", label: "Club Affaires" },
  { key: "rdv", label: "RDV Commercial" },
  { key: "suivi", label: "Suivi Activité" },
  { key: "mep", label: "Mise en place" },
  { key: "evenementiel", label: "RD Événementielle" },
] as const;

type FormatKey = typeof FORMAT_KEYS[number]["key"];

/** Map a type_evenement string to the correct format key */
export function getFormatKey(typeEvenement: string): FormatKey {
  const t = typeEvenement.toLowerCase();
  if (t.includes("distanciel")) return "distanciel";
  if (t.includes("club")) return "club";
  if (t.includes("rdv") || t.includes("commercial")) return "rdv";
  if (t.includes("suivi")) return "suivi";
  if (t.includes("mise en place") || t.includes("mep")) return "mep";
  if (t.includes("événementiel") || t.includes("evenementiel") || t.includes("événementielle") || t.includes("evenementielle")) return "evenementiel";
  return "audit"; // RD Présentiel by default
}

/** Get the [1st, 2nd, 3rd+] prime values for a given event type */
export function getFormatPrimes(typeEvenement: string, config: PrimeConfig): [number, number, number] {
  const key = getFormatKey(typeEvenement);
  switch (key) {
    case "distanciel": return [config.prime_distanciel_1, config.prime_distanciel_2, config.prime_distanciel_3_plus];
    case "club": return [config.prime_club_1, config.prime_club_2, config.prime_club_3_plus];
    case "rdv": return [config.prime_rdv_1, config.prime_rdv_2, config.prime_rdv_3_plus];
    case "suivi": return [config.prime_suivi_1, config.prime_suivi_2, config.prime_suivi_3_plus];
    case "mep": return [config.prime_mep_1, config.prime_mep_2, config.prime_mep_3_plus];
    case "evenementiel": return [config.prime_evenementiel_1, config.prime_evenementiel_2, config.prime_evenementiel_3_plus];
    default: return [config.prime_audit_1, config.prime_audit_2, config.prime_audit_3_plus];
  }
}

/** Calculate prime for the Nth visit to a partner FOR THE SAME event type */
export function primeForNthVisit(nth: number, typeEvenement: string, config: PrimeConfig): number {
  const [p1, p2, p3] = getFormatPrimes(typeEvenement, config);
  if (nth === 1) return p1;
  if (nth === 2) return p2;
  return p3;
}

/** Parse config from get_my_config RPC result */
export function parsePrimeConfig(d: any): PrimeConfig {
  return {
    prime_audit_1: d.prime_audit_1 ?? 0, prime_audit_2: d.prime_audit_2 ?? 0, prime_audit_3_plus: d.prime_audit_3_plus ?? 0,
    prime_distanciel_1: d.prime_distanciel_1 ?? 0, prime_distanciel_2: d.prime_distanciel_2 ?? 0, prime_distanciel_3_plus: d.prime_distanciel_3_plus ?? 0,
    prime_club_1: d.prime_club_1 ?? 0, prime_club_2: d.prime_club_2 ?? 0, prime_club_3_plus: d.prime_club_3_plus ?? 0,
    prime_rdv_1: d.prime_rdv_1 ?? 0, prime_rdv_2: d.prime_rdv_2 ?? 0, prime_rdv_3_plus: d.prime_rdv_3_plus ?? 0,
    prime_suivi_1: d.prime_suivi_1 ?? 0, prime_suivi_2: d.prime_suivi_2 ?? 0, prime_suivi_3_plus: d.prime_suivi_3_plus ?? 0,
    prime_mep_1: d.prime_mep_1 ?? 0, prime_mep_2: d.prime_mep_2 ?? 0, prime_mep_3_plus: d.prime_mep_3_plus ?? 0,
    prime_evenementiel_1: d.prime_evenementiel_1 ?? 0, prime_evenementiel_2: d.prime_evenementiel_2 ?? 0, prime_evenementiel_3_plus: d.prime_evenementiel_3_plus ?? 0,
  };
}

/**
 * Build a rank map: for each audit id, what is its Nth visit rank
 * for the same partner AND same event type (format key) within the civil year.
 * This means 1 RD + 1 Club at the same partner = each is 1st visit (not cumulative).
 */
export function buildRankMap(yearAudits: { id: string; partenaire: string; type_evenement: string; date: string }[]): Map<string, number> {
  const sorted = [...yearAudits].sort((a, b) => a.date.localeCompare(b.date));
  // Key: "partner|formatKey" → ordered list of audit ids
  const groups = new Map<string, string[]>();
  for (const a of sorted) {
    const key = `${a.partenaire}|${getFormatKey(a.type_evenement)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a.id);
  }
  const rankMap = new Map<string, number>();
  for (const [, ids] of groups) {
    ids.forEach((id, i) => rankMap.set(id, i + 1));
  }
  return rankMap;
}
