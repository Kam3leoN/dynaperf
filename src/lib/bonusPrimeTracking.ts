import type { Audit } from "@/hooks/useAuditData";
import { MOIS_ORDRE } from "@/data/audits";
import type { BonusAuditTypeKey, BonusTariffDataV2, TierRates, VolumeTierRow } from "@/lib/bonusTariff";
import { mapAuditTypeEvenementToTariffKey } from "@/lib/bonusTariff";

/** Période de prime entreprise : du 16 du mois M au 15 du mois suivant (dates `YYYY-MM-DD` inclusives). */
export function getPrimePeriodIsoBounds(year: number, monthIndex0: number): { start: string; end: string } {
  const startD = new Date(year, monthIndex0, 16);
  const endD = new Date(year, monthIndex0 + 1, 15);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: iso(startD), end: iso(endD) };
}

export type PrimePeriodOption = { id: string; start: string; end: string; label: string };

export function listPrimePeriodsForYear(exerciseYear: number): PrimePeriodOption[] {
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  return MOIS_ORDRE.map((nom, idx) => {
    // Pour l'exercice N, la période "Décembre (16→15)" doit pointer sur déc. N-1 → janv. N.
    const periodYear = idx === 11 ? exerciseYear - 1 : exerciseYear;
    const { start, end } = getPrimePeriodIsoBounds(periodYear, idx);
    const s = new Date(`${start}T12:00:00`);
    const e = new Date(`${end}T12:00:00`);
    const label = `${nom} — ${fmt.format(s)} → ${fmt.format(e)}`;
    return { id: `p-${exerciseYear}-${idx}`, start, end, label };
  });
}

export function auditDateInPeriod(dateIso: string, start: string, end: string): boolean {
  return dateIso >= start && dateIso <= end;
}

/** Mois de versement déduit de la date d'audit selon la règle 16→15. */
function computeMoisVersementFromAuditDate(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  const day = d.getDate();
  const monthIndex = day >= 16 ? d.getMonth() + 1 : d.getMonth();
  const monthDate = new Date(d.getFullYear(), monthIndex, 1);
  const label = monthDate.toLocaleDateString("fr-FR", { month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Bornes inclusives de l’exercice pour le calcul des passages : 16 déc. (N−1) → 31 déc. (N). */
export function exerciseDateLowerBound(year: number): string {
  return `${year - 1}-12-16`;
}

export function exerciseDateUpperBound(year: number): string {
  return `${year}-12-31`;
}

export type AuditPrimeAllocation = {
  auditId: string;
  date: string;
  partenaire: string;
  lieu: string;
  typeEvenement: string;
  tariffKey: BonusAuditTypeKey;
  passageRank: 1 | 2 | 3;
  /** 3 = 3e et suivants. */
  moisVersement: string;
  amountEuro: number;
  passageKey: string;
};

function normalizeToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Périmètre « passage unique » : partenaire + lieu (club souvent dans le libellé lieu). */
export function buildPassageKey(partenaire: string, lieu: string): string {
  return `${normalizeToken(partenaire)}::${normalizeToken(lieu)}`;
}

function tierAmountForRank(rates: TierRates, rank: 1 | 2 | 3): number {
  if (rank === 1) return rates.first;
  if (rank === 2) return rates.second;
  return rates.third_plus;
}

/**
 * Calcule une prime indicative par audit (ordre chronologique, statut OK, clé barème reconnue).
 * Compteur de passage par couple (type barème × passage lieu partenaire).
 */
export function computeAuditPrimeAllocations(audits: Audit[], tariff: BonusTariffDataV2): AuditPrimeAllocation[] {
  const sorted = [...audits].filter((a) => a.statut === "OK").sort((a, b) => a.date.localeCompare(b.date));

  /** Nombre de passages déjà effectués avant l’audit courant, par (tariffKey|passageKey). */
  const passageCounts = new Map<string, number>();
  const out: AuditPrimeAllocation[] = [];

  for (const a of sorted) {
    const tariffKey = mapAuditTypeEvenementToTariffKey(a.typeEvenement);
    if (!tariffKey) continue;

    const passageKey = buildPassageKey(a.partenaire, a.lieu);
    const composite = `${tariffKey}|${passageKey}`;
    const prev = passageCounts.get(composite) ?? 0;
    const rank: 1 | 2 | 3 = prev === 0 ? 1 : prev === 1 ? 2 : 3;
    const rates = tariff.presentiel_by_type[tariffKey];
    const amountEuro = tierAmountForRank(rates, rank);

    passageCounts.set(composite, prev + 1);

    out.push({
      auditId: a.id,
      date: a.date,
      partenaire: a.partenaire,
      lieu: a.lieu,
      typeEvenement: a.typeEvenement,
      tariffKey,
      passageRank: rank,
      // Toujours recalculé depuis la date d'audit pour garantir la règle métier 16→15.
      moisVersement: computeMoisVersementFromAuditDate(a.date),
      amountEuro,
      passageKey,
    });
  }

  return out;
}

export type VolumeTierMatch = { tierIndex: number; condition: string; amount: number };

/**
 * Estime la prime volume selon le nombre d’audits éligibles et les libellés de condition (heuristiques FR).
 * Si plusieurs paliers correspondent, retient celui avec le montant le plus élevé.
 */
export function estimateVolumeBonus(eligibleAuditCount: number, tiers: VolumeTierRow[]): VolumeTierMatch | null {
  const candidates: VolumeTierMatch[] = [];

  for (let i = 0; i < tiers.length; i++) {
    const { condition, amount } = tiers[i];
    const c = condition.trim();
    if (!c || amount <= 0) continue;

    const range = c.match(/(\d+)\s*(?:à|a|-|–)\s*(\d+)/i);
    if (range) {
      const lo = Number.parseInt(range[1], 10);
      const hi = Number.parseInt(range[2], 10);
      if (eligibleAuditCount >= lo && eligibleAuditCount <= hi) {
        candidates.push({ tierIndex: i, condition: c, amount });
      }
      continue;
    }

    const seuilPlus =
      c.match(/(\d+)\s*(?:audits?\s*)?(?:ou\s*\+|et\s*\+)/i) ||
      c.match(/(?:≥|>=|plus\s*de\s*)(\d+)/i) ||
      c.match(/(\d+)\s*(?:et\s*plus)/i);
    if (seuilPlus) {
      const th = Number.parseInt(seuilPlus[1], 10);
      if (!Number.isNaN(th) && eligibleAuditCount >= th) {
        candidates.push({ tierIndex: i, condition: c, amount });
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((x, y) => y.amount - x.amount);
  return candidates[0]!;
}

/** Total primes « par passage » (somme des lignes audit). */
export function sumPassageAllocations(rows: AuditPrimeAllocation[]): number {
  return rows.reduce((s, r) => s + r.amountEuro, 0);
}

/** Agrège par mois de versement (libellé tel qu’en base). */
export function aggregateByMoisVersement(rows: AuditPrimeAllocation[]): { mois: string; totalEuro: number; count: number }[] {
  const map = new Map<string, { totalEuro: number; count: number }>();
  for (const r of rows) {
    const m = r.moisVersement || "—";
    const cur = map.get(m) ?? { totalEuro: 0, count: 0 };
    cur.totalEuro += r.amountEuro;
    cur.count += 1;
    map.set(m, cur);
  }
  return [...map.entries()]
    .map(([mois, v]) => ({ mois, totalEuro: v.totalEuro, count: v.count }))
    .sort((a, b) => a.mois.localeCompare(b.mois, "fr"));
}
