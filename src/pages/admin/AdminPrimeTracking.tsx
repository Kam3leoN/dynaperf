import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import type { Audit } from "@/hooks/useAuditData";
import {
  MOIS_ORDRE,
  DEFAULT_PRIME_TRACKING_AUDITEUR,
  AUDITEURS_RETIRED_FROM_LISTS,
} from "@/data/audits";
import {
  parseBonusTariffJson,
  emptyTariffDefaults,
  formatTariffKeyLabel,
  BONUS_AUDIT_LAYOUT,
  type BonusTariffDataV2,
  type BonusAuditTypeKey,
} from "@/lib/bonusTariff";
import {
  aggregateByMoisVersement,
  auditDateInPeriod,
  computeAuditPrimeAllocations,
  estimateVolumeBonus,
  exerciseDateLowerBound,
  exerciseDateUpperBound,
  listPrimePeriodsForYear,
  sumPassageAllocations,
} from "@/lib/bonusPrimeTracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faFilterCircleXmark, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FILTER_ALL = "__all__";

function dbToAudit(row: {
  id: string;
  date: string;
  partenaire: string;
  lieu?: string | null;
  auditeur: string;
  type_evenement: string;
  note: number | null;
  mois_versement: string;
  statut: string;
}): Audit {
  return {
    id: row.id,
    date: row.date,
    partenaire: row.partenaire,
    lieu: row.lieu || "",
    auditeur: row.auditeur,
    typeEvenement: row.type_evenement,
    note: row.note,
    moisVersement: row.mois_versement,
    statut: row.statut as "OK" | "NON",
  };
}

function moisSortIndex(mois: string): number {
  const i = MOIS_ORDRE.indexOf(mois as (typeof MOIS_ORDRE)[number]);
  return i >= 0 ? i : 999;
}

function monthLabelFromIsoDate(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  const month = d.toLocaleDateString("fr-FR", { month: "long" });
  return month.charAt(0).toUpperCase() + month.slice(1);
}

const TYPE_ROWS = BONUS_AUDIT_LAYOUT.filter(
  (x): x is { kind: "row"; key: BonusAuditTypeKey; label: string } => x.kind === "row",
);

/**
 * Suivi indicatif des primes : ventilation par audit et par mois de versement, filtres période 16→15 et type.
 */
export default function AdminPrimeTracking() {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdmin(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const ys: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 5; y--) ys.push(y);
    return ys;
  }, [currentYear]);

  const initialYear = Number.parseInt(searchParams.get("year") ?? "", 10);
  const initialPeriodFilter = searchParams.get("period") ?? FILTER_ALL;
  const initialMonthFilter = searchParams.get("month") ?? FILTER_ALL;
  const initialTypeFilter = searchParams.get("type") ?? FILTER_ALL;
  const initialAuditeur = searchParams.get("auditeur") ?? "";

  const [year, setYear] = useState(Number.isFinite(initialYear) ? initialYear : currentYear);
  const [auditeur, setAuditeur] = useState<string>(initialAuditeur);
  const [allAudits, setAllAudits] = useState<Audit[]>([]);
  const [tariff, setTariff] = useState<BonusTariffDataV2>(() => emptyTariffDefaults());
  const [tariffLoaded, setTariffLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const [periodFilter, setPeriodFilter] = useState<string>(initialPeriodFilter);
  const [moisVersementFilter, setMoisVersementFilter] = useState<string>(initialMonthFilter);
  const [typeFilter, setTypeFilter] = useState<string>(initialTypeFilter);

  const loadAudits = useCallback(async () => {
    const { data, error } = await supabase.from("audits").select("*").order("date", { ascending: true });
    if (error) {
      toast.error("Erreur chargement audits");
      console.error(error);
      setAllAudits([]);
      return;
    }
    setAllAudits((data || []).map(dbToAudit));
  }, []);

  const loadTariff = useCallback(async () => {
    setTariffLoaded(false);
    const { data, error } = await supabase.from("bonus_prime_tariffs").select("tariff_data").eq("year", year).maybeSingle();
    if (error) {
      toast.error(error.message);
      setTariff(emptyTariffDefaults());
      setTariffLoaded(true);
      return;
    }
    if (!data) {
      setTariff(emptyTariffDefaults());
      setTariffLoaded(true);
      return;
    }
    setTariff(parseBonusTariffJson(data.tariff_data));
    setTariffLoaded(true);
  }, [year]);

  useEffect(() => {
    if (!user || !isSuperAdmin) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await loadAudits();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isSuperAdmin, loadAudits]);

  useEffect(() => {
    if (!user || !isSuperAdmin) return;
    void loadTariff();
  }, [user, isSuperAdmin, loadTariff]);

  const auditeurs = useMemo(() => {
    const retired = new Set(AUDITEURS_RETIRED_FROM_LISTS.map((x) => x.toLowerCase()));
    const set = new Set<string>();
    for (const a of allAudits) {
      const n = a.auditeur?.trim();
      if (!n || retired.has(n.toLowerCase())) continue;
      set.add(n);
    }
    return [...set].sort((x, y) => x.localeCompare(y, "fr"));
  }, [allAudits]);

  useEffect(() => {
    if (auditeurs.length === 0) return;
    if (!auditeur || !auditeurs.includes(auditeur)) {
      const preferred =
        auditeurs.find((n) => n === DEFAULT_PRIME_TRACKING_AUDITEUR) ?? auditeurs[0] ?? "";
      setAuditeur(preferred);
    }
  }, [auditeurs, auditeur]);

  /** Exercice N : audits du 16 déc. (N−1) au 31 déc. (N) pour enchaîner correctement les passages (début janvier). */
  const auditsExerciseWindow = useMemo(() => {
    const lo = exerciseDateLowerBound(year);
    const hi = exerciseDateUpperBound(year);
    return allAudits.filter((a) => {
      if (a.date < lo || a.date > hi) return false;
      if (auditeur && a.auditeur !== auditeur) return false;
      return true;
    });
  }, [allAudits, year, auditeur]);

  const allocations = useMemo(
    () => computeAuditPrimeAllocations(auditsExerciseWindow, tariff),
    [auditsExerciseWindow, tariff],
  );

  const primePeriods = useMemo(() => listPrimePeriodsForYear(year), [year]);

  useEffect(() => {
    if (periodFilter !== FILTER_ALL && !primePeriods.some((p) => p.id === periodFilter)) {
      setPeriodFilter(FILTER_ALL);
    }
  }, [periodFilter, primePeriods]);

  useEffect(() => {
    if (moisVersementFilter !== FILTER_ALL && !MOIS_ORDRE.includes(moisVersementFilter as (typeof MOIS_ORDRE)[number])) {
      setMoisVersementFilter(FILTER_ALL);
    }
  }, [moisVersementFilter]);

  useEffect(() => {
    if (typeFilter !== FILTER_ALL && !TYPE_ROWS.some((row) => row.key === typeFilter)) {
      setTypeFilter(FILTER_ALL);
    }
  }, [typeFilter]);

  const periodBounds = useMemo(() => {
    if (periodFilter === FILTER_ALL) return null;
    return primePeriods.find((p) => p.id === periodFilter) ?? null;
  }, [periodFilter, primePeriods]);

  const filteredAllocations = useMemo(() => {
    return allocations.filter((r) => {
      if (periodBounds && !auditDateInPeriod(r.date, periodBounds.start, periodBounds.end)) return false;
      if (moisVersementFilter !== FILTER_ALL && monthLabelFromIsoDate(r.date) !== moisVersementFilter) return false;
      if (typeFilter !== FILTER_ALL && r.tariffKey !== typeFilter) return false;
      return true;
    });
  }, [allocations, periodBounds, moisVersementFilter, typeFilter]);

  const hasActiveFilters =
    periodFilter !== FILTER_ALL || moisVersementFilter !== FILTER_ALL || typeFilter !== FILTER_ALL;

  const passageTotal = useMemo(() => sumPassageAllocations(filteredAllocations), [filteredAllocations]);

  const eligibleVolumeCount = filteredAllocations.length;

  const volumeMatch = useMemo(
    () => estimateVolumeBonus(eligibleVolumeCount, tariff.volume_tiers),
    [eligibleVolumeCount, tariff.volume_tiers],
  );

  const byMois = useMemo(() => {
    const rows = aggregateByMoisVersement(filteredAllocations);
    return [...rows].sort((a, b) => moisSortIndex(a.mois) - moisSortIndex(b.mois));
  }, [filteredAllocations]);

  const primePassageTitle = useMemo(() => {
    if (periodBounds) {
      const end = new Date(`${periodBounds.end}T12:00:00`);
      const month = end.toLocaleDateString("fr-FR", { month: "long" });
      const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
      return `Primes ${monthLabel} ${end.getFullYear()}`;
    }
    if (moisVersementFilter !== FILTER_ALL) {
      return `Primes ${moisVersementFilter} ${year}`;
    }
    return `Primes ${year}`;
  }, [periodBounds, moisVersementFilter, year]);

  const resetFilters = () => {
    setPeriodFilter(FILTER_ALL);
    setMoisVersementFilter(FILTER_ALL);
    setTypeFilter(FILTER_ALL);
  };

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("year", String(year));
    if (auditeur) next.set("auditeur", auditeur);
    else next.delete("auditeur");
    if (periodFilter !== FILTER_ALL) next.set("period", periodFilter);
    else next.delete("period");
    if (moisVersementFilter !== FILTER_ALL) next.set("month", moisVersementFilter);
    else next.delete("month");
    if (typeFilter !== FILTER_ALL) next.set("type", typeFilter);
    else next.delete("type");

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [year, auditeur, periodFilter, moisVersementFilter, typeFilter, searchParams, setSearchParams]);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-semibold tracking-tight">Suivi primes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Réservé au super administrateur.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <FontAwesomeIcon icon={faChartLine} className="text-primary" aria-hidden />
            Suivi des primes
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/primes/overview">Barèmes annuels</Link>
          </Button>
        </div>
      </div>

      {loading || !tariffLoaded ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paramètres et filtres</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-6 gap-y-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="suivi-year">Année</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number.parseInt(v, 10))}>
                  <SelectTrigger id="suivi-year" className="h-10 w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="suivi-auditeur">Auditeur</Label>
                {auditeurs.length === 0 ? (
                  <p id="suivi-auditeur" className="text-sm text-muted-foreground">
                    Aucun audit en base.
                  </p>
                ) : (
                  <Select value={auditeur} onValueChange={setAuditeur}>
                    <SelectTrigger id="suivi-auditeur" className="h-10 w-[190px]">
                      <SelectValue placeholder="Choisir…" />
                    </SelectTrigger>
                    <SelectContent>
                      {auditeurs.map((nom) => (
                        <SelectItem key={nom} value={nom}>
                          {nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
            <CardHeader className="border-t border-border/60 py-4 flex flex-col gap-2 space-y-0 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Filtres du tableau</CardTitle>
              </div>
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={resetFilters} disabled={!hasActiveFilters}>
                <FontAwesomeIcon icon={faFilterCircleXmark} className="h-3 w-3" aria-hidden />
                Réinitialiser
              </Button>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-6 gap-y-3 pt-0">
              <div className="space-y-1">
                <Label htmlFor="filter-period">Période prime (16 → 15)</Label>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger id="filter-period" className="h-10 w-[min(100%,260px)]">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Toutes les périodes</SelectItem>
                    {primePeriods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-mois-v">Mois complet (audits réalisés)</Label>
                <Select value={moisVersementFilter} onValueChange={setMoisVersementFilter}>
                  <SelectTrigger id="filter-mois-v" className="h-10 w-[170px]">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Tous les mois</SelectItem>
                    {MOIS_ORDRE.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-type">Type barème</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="filter-type" className="h-10 w-[min(100%,230px)]">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Tous les types</SelectItem>
                    {TYPE_ROWS.map((row) => (
                      <SelectItem key={row.key} value={row.key}>
                        {formatTariffKeyLabel(row.key)} — {row.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Audits</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">{eligibleVolumeCount}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">{primePassageTitle}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">{passageTotal.toFixed(2)} €</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Prime volume annuel</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">
                {(volumeMatch?.amount ?? 0).toFixed(2)} €
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Primes</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">
                {(passageTotal + (volumeMatch?.amount ?? 0)).toFixed(2)} €
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détail par audit</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {filteredAllocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun audit pour ces filtres.</p>
              ) : (
                <table className="w-full min-w-[840px] text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">Date</th>
                      <th className="py-2 pr-2 font-medium">Partenaire</th>
                      <th className="py-2 pr-2 font-medium">Lieu</th>
                      <th className="py-2 pr-2 font-medium">Type</th>
                      <th className="py-2 pr-2 font-medium">Barème</th>
                      <th className="py-2 pr-2 font-medium">Passage</th>
                      <th className="py-2 pr-2 font-medium">Mois versement</th>
                      <th className="py-2 font-medium text-right">Prime (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllocations.map((r) => (
                      <tr key={r.auditId} className="border-b border-border/60">
                        <td className="py-2 pr-2 whitespace-nowrap">{r.date}</td>
                        <td className={cn("py-2 pr-2 max-w-[140px] truncate", "sm:max-w-[180px]")} title={r.partenaire}>
                          {r.partenaire}
                        </td>
                        <td className={cn("py-2 pr-2 max-w-[120px] truncate", "sm:max-w-[160px]")} title={r.lieu}>
                          {r.lieu || "—"}
                        </td>
                        <td className="py-2 pr-2">{r.typeEvenement}</td>
                        <td className="py-2 pr-2 font-medium">{formatTariffKeyLabel(r.tariffKey)}</td>
                        <td className="py-2 pr-2 tabular-nums">
                          {r.passageRank === 3 ? "3e+" : r.passageRank === 2 ? "2e" : "1er"}
                        </td>
                        <td className="py-2 pr-2">{r.moisVersement}</td>
                        <td className="py-2 text-right tabular-nums font-medium">{r.amountEuro.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Répartition par mois de versement</CardTitle>
              <CardDescription>Selon les filtres actifs.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {byMois.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune ligne pour cette sélection.</p>
              ) : (
                <table className="w-full min-w-[320px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Mois</th>
                      <th className="py-2 pr-3 font-medium">Nb audits</th>
                      <th className="py-2 font-medium">Montant (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMois.map((row) => (
                      <tr key={row.mois} className="border-b border-border/60">
                        <td className="py-2 pr-3">{row.mois}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.count}</td>
                        <td className="py-2 tabular-nums font-medium">{row.totalEuro.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
