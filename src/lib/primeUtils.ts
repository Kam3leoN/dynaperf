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

export const DEFAULT_PRIME_CONFIG: PrimeConfig = {
  prime_audit_1: 75,
  prime_audit_2: 10,
  prime_audit_3_plus: 5,
  prime_distanciel_1: 10,
  prime_distanciel_2: 5,
  prime_distanciel_3_plus: 0,
  prime_club_1: 75,
  prime_club_2: 10,
  prime_club_3_plus: 5,
  prime_rdv_1: 75,
  prime_rdv_2: 10,
  prime_rdv_3_plus: 5,
  prime_suivi_1: 75,
  prime_suivi_2: 10,
  prime_suivi_3_plus: 5,
  prime_mep_1: 75,
  prime_mep_2: 10,
  prime_mep_3_plus: 5,
  prime_evenementiel_1: 75,
  prime_evenementiel_2: 10,
  prime_evenementiel_3_plus: 5,
};

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
  const toAmount = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    prime_audit_1: toAmount(d?.prime_audit_1, DEFAULT_PRIME_CONFIG.prime_audit_1),
    prime_audit_2: toAmount(d?.prime_audit_2, DEFAULT_PRIME_CONFIG.prime_audit_2),
    prime_audit_3_plus: toAmount(d?.prime_audit_3_plus, DEFAULT_PRIME_CONFIG.prime_audit_3_plus),
    prime_distanciel_1: toAmount(d?.prime_distanciel_1, DEFAULT_PRIME_CONFIG.prime_distanciel_1),
    prime_distanciel_2: toAmount(d?.prime_distanciel_2, DEFAULT_PRIME_CONFIG.prime_distanciel_2),
    prime_distanciel_3_plus: toAmount(d?.prime_distanciel_3_plus, DEFAULT_PRIME_CONFIG.prime_distanciel_3_plus),
    prime_club_1: toAmount(d?.prime_club_1, DEFAULT_PRIME_CONFIG.prime_club_1),
    prime_club_2: toAmount(d?.prime_club_2, DEFAULT_PRIME_CONFIG.prime_club_2),
    prime_club_3_plus: toAmount(d?.prime_club_3_plus, DEFAULT_PRIME_CONFIG.prime_club_3_plus),
    prime_rdv_1: toAmount(d?.prime_rdv_1, DEFAULT_PRIME_CONFIG.prime_rdv_1),
    prime_rdv_2: toAmount(d?.prime_rdv_2, DEFAULT_PRIME_CONFIG.prime_rdv_2),
    prime_rdv_3_plus: toAmount(d?.prime_rdv_3_plus, DEFAULT_PRIME_CONFIG.prime_rdv_3_plus),
    prime_suivi_1: toAmount(d?.prime_suivi_1, DEFAULT_PRIME_CONFIG.prime_suivi_1),
    prime_suivi_2: toAmount(d?.prime_suivi_2, DEFAULT_PRIME_CONFIG.prime_suivi_2),
    prime_suivi_3_plus: toAmount(d?.prime_suivi_3_plus, DEFAULT_PRIME_CONFIG.prime_suivi_3_plus),
    prime_mep_1: toAmount(d?.prime_mep_1, DEFAULT_PRIME_CONFIG.prime_mep_1),
    prime_mep_2: toAmount(d?.prime_mep_2, DEFAULT_PRIME_CONFIG.prime_mep_2),
    prime_mep_3_plus: toAmount(d?.prime_mep_3_plus, DEFAULT_PRIME_CONFIG.prime_mep_3_plus),
    prime_evenementiel_1: toAmount(d?.prime_evenementiel_1, DEFAULT_PRIME_CONFIG.prime_evenementiel_1),
    prime_evenementiel_2: toAmount(d?.prime_evenementiel_2, DEFAULT_PRIME_CONFIG.prime_evenementiel_2),
    prime_evenementiel_3_plus: toAmount(d?.prime_evenementiel_3_plus, DEFAULT_PRIME_CONFIG.prime_evenementiel_3_plus),
  };
}

/**
 * Build a rank map: for each audit id, what is its Nth visit rank
 * for the same partner AND same event type (format key) within the civil year.
 * This means 1 RD + 1 Club at the same partner = each is 1st visit (not cumulative).
 */
/** A custom prime record from user_custom_primes */
export interface UserCustomPrime {
  id: string;
  label: string;
  prime_1: number;
  prime_2: number;
  prime_3_plus: number;
}

/** Get prime values for an audit, using custom_prime_id if available */
export function getPrimeValues(
  audit: { custom_prime_id?: string | null; type_evenement: string },
  config: PrimeConfig,
  customPrimes: UserCustomPrime[] = [],
): [number, number, number] {
  if (audit.custom_prime_id) {
    const cp = customPrimes.find((p) => p.id === audit.custom_prime_id);
    if (cp) return [cp.prime_1, cp.prime_2, cp.prime_3_plus];
  }
  return getFormatPrimes(audit.type_evenement, config);
}

/** Calculate prime for the Nth visit, with optional custom prime override */
export function primeForNthVisitWithCustom(
  nth: number,
  audit: { custom_prime_id?: string | null; type_evenement: string },
  config: PrimeConfig,
  customPrimes: UserCustomPrime[] = [],
): number {
  const [p1, p2, p3] = getPrimeValues(audit, config, customPrimes);
  if (nth === 1) return p1;
  if (nth === 2) return p2;
  return p3;
}

export function buildRankMap(yearAudits: { id: string; partenaire: string; type_evenement: string; lieu?: string | null; date: string }[]): Map<string, number> {
  const sorted = [...yearAudits].sort((a, b) => a.date.localeCompare(b.date));
  // Key: "partner|formatKey|lieu" → ordered list of audit ids
  const groups = new Map<string, string[]>();
  for (const a of sorted) {
    const lieu = (a.lieu || "").trim().toLowerCase();
    const key = `${a.partenaire}|${getFormatKey(a.type_evenement)}|${lieu}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a.id);
  }
  const rankMap = new Map<string, number>();
  for (const [, ids] of groups) {
    ids.forEach((id, i) => rankMap.set(id, i + 1));
  }
  return rankMap;
}
