import type { Json } from "@/integrations/supabase/types";

export const TARIFF_VERSION = 2 as const;

/** Clés dans `presentiel_by_type`. */
export const BONUS_AUDIT_TYPE_KEYS = ["rdp", "rdd", "rde", "rco", "caf", "mep"] as const;
export type BonusAuditTypeKey = (typeof BONUS_AUDIT_TYPE_KEYS)[number];

export type TierRates = { first: number; second: number; third_plus: number };
export type VolumeTierRow = { condition: string; amount: number };
export type CaTierRow = { condition: string; amount: number };

export type BonusTariffDataV2 = {
  version: typeof TARIFF_VERSION;
  presentiel_by_type: Record<BonusAuditTypeKey, TierRates>;
  volume_tiers: VolumeTierRow[];
  ca_tiers: CaTierRow[];
};

export type AuditLayoutEntry =
  | { kind: "group"; groupKey: string; label: string }
  | { kind: "row"; key: BonusAuditTypeKey; label: string; indent?: boolean };

export const BONUS_AUDIT_LAYOUT: AuditLayoutEntry[] = [
  { kind: "group", groupKey: "rd", label: "Rencontre dirigeants (RD)" },
  { kind: "row", key: "rdp", label: "Rencontre Dirigeants Présentiel (RDP)", indent: true },
  { kind: "row", key: "rdd", label: "Rencontre Dirigeants Distanciel (RDD)", indent: true },
  { kind: "row", key: "rde", label: "Rencontre Dirigeants Événementiel (RDE)", indent: true },
  { kind: "row", key: "rco", label: "Rendez-Vous Commercial (RCO)" },
  { kind: "row", key: "caf", label: "Club d’affaires (CAF)" },
  { kind: "row", key: "mep", label: "Mise en place (MEP)" },
];

/** Libellés courts pour tableaux / exports. */
export const BONUS_TYPE_LABELS: Record<BonusAuditTypeKey, string> = {
  rdp: "RDP",
  rdd: "RDD",
  rde: "RDE",
  rco: "RCO",
  caf: "CAF",
  mep: "MEP",
};

export function formatTariffKeyLabel(key: BonusAuditTypeKey): string {
  return BONUS_TYPE_LABELS[key];
}

export const DEFAULT_RD_PRESENTIEL: TierRates = { first: 75, second: 10, third_plus: 0 };
export const DEFAULT_RD_DISTANCIEL: TierRates = { first: 10, second: 0, third_plus: 0 };

const DEFAULT_VOLUME_TIERS: VolumeTierRow[] = [
  { condition: "155 à 174 audits individuels réalisés dans l’année", amount: 500 },
  { condition: "175 audits ou plus dans l’année", amount: 1000 },
  { condition: "", amount: 0 },
];

const DEFAULT_CA_TIERS: CaTierRow[] = [
  { condition: "0% à 4,99%", amount: 0 },
  { condition: "5% à 9,99%", amount: 500 },
  { condition: "10% à 19,99%", amount: 1000 },
  { condition: "20% et +", amount: 1500 },
];

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return 0;
}

function parseTierRow(row: Record<string, unknown>): TierRates {
  return {
    first: num(row.first),
    second: num(row.second),
    third_plus: num(row.third_plus),
  };
}

const LEGACY_KEY_MAP: Record<string, BonusAuditTypeKey> = {
  rd: "rdp",
  club: "caf",
  mep: "mep",
  rdv_co: "rco",
  event: "rde",
};

export function emptyTariffDefaults(): BonusTariffDataV2 {
  const presentiel_by_type = {} as Record<BonusAuditTypeKey, TierRates>;
  for (const k of BONUS_AUDIT_TYPE_KEYS) {
    presentiel_by_type[k] = { ...DEFAULT_RD_PRESENTIEL };
  }
  presentiel_by_type.rdd = { ...DEFAULT_RD_DISTANCIEL };

  return {
    version: TARIFF_VERSION,
    presentiel_by_type,
    volume_tiers: DEFAULT_VOLUME_TIERS.map((x) => ({ ...x })),
    ca_tiers: DEFAULT_CA_TIERS.map((x) => ({ ...x })),
  };
}

/**
 * Mappe le libellé `audits.type_evenement` vers une clé barème primes.
 */
export function mapAuditTypeEvenementToTariffKey(typeEvenement: string): BonusAuditTypeKey | null {
  const t = typeEvenement.trim().toLowerCase();
  if (!t) return null;
  if (t.includes("rd") && t.includes("présentiel")) return "rdp";
  if (t.includes("rd") && (t.includes("distanciel") || t.includes("visio"))) return "rdd";
  if (t.includes("événement") || t.includes("evenement")) return "rde";
  if (t.includes("rdv") || (t.includes("commercial") && !t.includes("club"))) return "rco";
  if (t.includes("club")) return "caf";
  if (t.includes("mep") || t.includes("mise en place")) return "mep";
  return null;
}

export function parseBonusTariffJson(raw: Json): BonusTariffDataV2 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyTariffDefaults();
  }
  const o = raw as Record<string, unknown>;

  if (num(o.version) === TARIFF_VERSION && o.presentiel_by_type && typeof o.presentiel_by_type === "object") {
    const pt = o.presentiel_by_type as Record<string, Record<string, unknown>>;

    const ptKeys = Object.keys(pt);
    const hasNewSchema = BONUS_AUDIT_TYPE_KEYS.some((k) => ptKeys.includes(k));
    const hasLegacyKeys = Object.keys(LEGACY_KEY_MAP).some((k) => ptKeys.includes(k));

    const presentiel_by_type = {} as Record<BonusAuditTypeKey, TierRates>;
    for (const k of BONUS_AUDIT_TYPE_KEYS) {
      presentiel_by_type[k] = { ...DEFAULT_RD_PRESENTIEL };
    }
    presentiel_by_type.rdd = { ...DEFAULT_RD_DISTANCIEL };

    if (hasNewSchema) {
      for (const k of BONUS_AUDIT_TYPE_KEYS) {
        const row = pt[k];
        if (row && typeof row === "object") {
          presentiel_by_type[k] = parseTierRow(row as Record<string, unknown>);
        }
      }
    } else if (hasLegacyKeys) {
      for (const [legacy, target] of Object.entries(LEGACY_KEY_MAP)) {
        const row = pt[legacy];
        if (row && typeof row === "object") {
          presentiel_by_type[target] = parseTierRow(row as Record<string, unknown>);
        }
      }
      const visRaw = o.visio as Record<string, unknown> | undefined;
      if (visRaw && typeof visRaw === "object") {
        const first = num(visRaw.first);
        const sp = num(visRaw.second_plus);
        presentiel_by_type.rdd = { first, second: sp, third_plus: sp };
      }
    } else {
      for (const k of BONUS_AUDIT_TYPE_KEYS) {
        const row = pt[k];
        if (row && typeof row === "object") {
          presentiel_by_type[k] = parseTierRow(row as Record<string, unknown>);
        }
      }
    }

    let volume_tiers: VolumeTierRow[] = [];
    if (Array.isArray(o.volume_tiers)) {
      volume_tiers = o.volume_tiers.map((item) => {
        if (!item || typeof item !== "object") return { condition: "", amount: 0 };
        const it = item as Record<string, unknown>;
        return {
          condition: typeof it.condition === "string" ? it.condition : "",
          amount: num(it.amount),
        };
      });
    }
    while (volume_tiers.length < 3) volume_tiers.push({ condition: "", amount: 0 });
    volume_tiers = volume_tiers.slice(0, 3);

    let ca_tiers: CaTierRow[] = [];
    if (Array.isArray(o.ca_tiers)) {
      ca_tiers = o.ca_tiers.map((item) => {
        if (!item || typeof item !== "object") return { condition: "", amount: 0 };
        const it = item as Record<string, unknown>;
        return {
          condition: typeof it.condition === "string" ? it.condition : "",
          amount: num(it.amount),
        };
      });
    }
    while (ca_tiers.length < 4) ca_tiers.push({ condition: "", amount: 0 });
    ca_tiers = ca_tiers.slice(0, 4);

    if (ca_tiers.every((x) => !x.condition.trim() && x.amount === 0)) {
      ca_tiers = DEFAULT_CA_TIERS.map((x) => ({ ...x }));
    }

    return { version: TARIFF_VERSION, presentiel_by_type, volume_tiers, ca_tiers };
  }

  if ("tier_1" in o || "tier_2" in o || "tier_3" in o) {
    const base = emptyTariffDefaults();
    base.volume_tiers = [
      { condition: "Palier volume 1 — précise la condition métier", amount: num(o.tier_1) },
      { condition: "Palier volume 2 — précise la condition métier", amount: num(o.tier_2) },
      { condition: "Palier volume 3+ — précise la condition métier", amount: num(o.tier_3) },
    ];
    return base;
  }

  return emptyTariffDefaults();
}

export function serializeBonusTariff(data: BonusTariffDataV2): Json {
  return {
    version: data.version,
    presentiel_by_type: data.presentiel_by_type,
    volume_tiers: data.volume_tiers,
    ca_tiers: data.ca_tiers,
  } as unknown as Json;
}
