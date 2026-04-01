import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MyPrimeTracker } from "@/components/MyPrimeTracker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faCoins } from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface AuditRow {
  id: string;
  partenaire: string;
  type_evenement: string;
  lieu: string | null;
  date: string;
}

interface PrimeConfig {
  prime_audit_1: number;
  prime_audit_2: number;
  prime_audit_3_plus: number;
  prime_distanciel_1: number;
  prime_distanciel_2: number;
  prime_distanciel_3_plus: number;
}

function isDistanciel(type: string): boolean {
  return type.toLowerCase().includes("distanciel");
}

/**
 * Calculate prime for the Nth visit to a partner in the civil year.
 * nth is 1-based (1st visit, 2nd visit, etc.)
 */
function primeForNthVisit(nth: number, distanciel: boolean, config: PrimeConfig): number {
  if (distanciel) {
    if (nth === 1) return config.prime_distanciel_1;
    if (nth === 2) return config.prime_distanciel_2;
    return config.prime_distanciel_3_plus;
  }
  if (nth === 1) return config.prime_audit_1;
  if (nth === 2) return config.prime_audit_2;
  return config.prime_audit_3_plus;
}

/**
 * For a set of audits, calculate the total prime.
 * Primes are tiered PER PARTENAIRE PER CIVIL YEAR.
 * We need all audits of the civil year to know the rank of each visit,
 * then only sum primes for audits inside the display range.
 */
function calcPrimesForAudits(
  displayAudits: AuditRow[],
  allYearAudits: AuditRow[],
  config: PrimeConfig
): { total: number; perAudit: Map<string, number> } {
  // Build visit order per partner for the civil year (sorted by date asc)
  const partnerVisits = new Map<string, AuditRow[]>();
  for (const a of [...allYearAudits].sort((x, y) => x.date.localeCompare(y.date))) {
    if (!partnerVisits.has(a.partenaire)) partnerVisits.set(a.partenaire, []);
    partnerVisits.get(a.partenaire)!.push(a);
  }

  // Assign rank to each audit id
  const rankMap = new Map<string, number>();
  for (const [, visits] of partnerVisits) {
    visits.forEach((v, i) => rankMap.set(v.id, i + 1));
  }

  // Calculate primes only for audits in the display range
  const perAudit = new Map<string, number>();
  let total = 0;
  for (const a of displayAudits) {
    const rank = rankMap.get(a.id) ?? 1;
    const dist = isDistanciel(a.type_evenement);
    const p = primeForNthVisit(rank, dist, config);
    perAudit.set(a.id, p);
    total += p;
  }
  return { total, perAudit };
}

/** Group audits by mois_versement (billing month key "YYYY-MM") */
function groupByBillingMonth(audits: AuditRow[]): Map<string, AuditRow[]> {
  const map = new Map<string, AuditRow[]>();
  for (const a of audits) {
    const d = new Date(a.date);
    const day = d.getDate();
    const billingMonth = day >= 16
      ? new Date(d.getFullYear(), d.getMonth() + 1, 1)
      : new Date(d.getFullYear(), d.getMonth(), 1);
    const key = format(billingMonth, "yyyy-MM");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return map;
}

function DatePicker({ label, date, onChange }: { label: string; date: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-8 justify-start font-normal")}>
          <FontAwesomeIcon icon={faCalendar} className="h-3 w-3" />
          {label} {format(date, "dd/MM/yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => { if (d) { onChange(d); setOpen(false); } }}
          locale={fr}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export default function Primes() {
  const { user } = useAuth();

  const [recapFrom, setRecapFrom] = useState<Date>(() => new Date(new Date().getFullYear(), 0, 1));
  const [recapTo, setRecapTo] = useState<Date>(() => new Date());

  const [config, setConfig] = useState<PrimeConfig | null>(null);
  const [displayAudits, setDisplayAudits] = useState<AuditRow[]>([]);
  const [yearAudits, setYearAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");

  // Load config + profile
  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_my_config").then(({ data }: any) => {
      if (data && data.length > 0) {
        setConfig({
          prime_audit_1: data[0].prime_audit_1 ?? 0,
          prime_audit_2: data[0].prime_audit_2 ?? 0,
          prime_audit_3_plus: data[0].prime_audit_3_plus ?? 0,
          prime_distanciel_1: data[0].prime_distanciel_1 ?? 0,
          prime_distanciel_2: data[0].prime_distanciel_2 ?? 0,
          prime_distanciel_3_plus: data[0].prime_distanciel_3_plus ?? 0,
        });
      }
    });
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name || user.email?.split("@")[0] || "");
      });
  }, [user]);

  // Load audits: display range + full civil year for ranking
  useEffect(() => {
    if (!user || !displayName) return;
    setLoading(true);
    const fromStr = format(recapFrom, "yyyy-MM-dd");
    const toStr = format(recapTo, "yyyy-MM-dd");

    // Determine the civil year range needed (min year from recapFrom, max year from recapTo)
    const minYear = recapFrom.getFullYear();
    const maxYear = recapTo.getFullYear();
    const yearStart = `${minYear}-01-01`;
    const yearEnd = `${maxYear}-12-31`;

    Promise.all([
      // Audits in the display range
      supabase
        .from("audits")
        .select("id, partenaire, type_evenement, lieu, date")
        .eq("auditeur", displayName)
        .eq("statut", "OK")
        .gte("date", fromStr)
        .lte("date", toStr)
        .order("date", { ascending: false }),
      // All audits for the civil year(s) to compute partner visit rank
      supabase
        .from("audits")
        .select("id, partenaire, type_evenement, lieu, date")
        .eq("auditeur", displayName)
        .eq("statut", "OK")
        .gte("date", yearStart)
        .lte("date", yearEnd)
        .order("date", { ascending: true }),
    ]).then(([displayRes, yearRes]) => {
      setDisplayAudits(displayRes.data ?? []);
      setYearAudits(yearRes.data ?? []);
      setLoading(false);
    });
  }, [user, displayName, recapFrom, recapTo]);

  // Group display audits by billing month
  const monthlyGroups = useMemo(() => {
    const map = groupByBillingMonth(displayAudits);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [displayAudits]);

  // Calculate primes
  const { grandTotal, perAuditPrimes } = useMemo(() => {
    if (!config) return { grandTotal: 0, perAuditPrimes: new Map<string, number>() };
    const { total, perAudit } = calcPrimesForAudits(displayAudits, yearAudits, config);
    return { grandTotal: total, perAuditPrimes: perAudit };
  }, [displayAudits, yearAudits, config]);

  return (
    <AppLayout>
      <section className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Primes</h1>

        <MyPrimeTracker />

        {/* Monthly recap */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCoins} className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Récapitulatif par mois</h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <DatePicker label="Du" date={recapFrom} onChange={setRecapFrom} />
            <DatePicker label="Au" date={recapTo} onChange={setRecapTo} />
          </div>

          {config && !loading && (
            <div className="flex items-center justify-between rounded-xl bg-primary/5 p-3">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{displayAudits.length}</span> audit{displayAudits.length > 1 ? "s" : ""} — Total
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums">
                {grandTotal.toLocaleString("fr-FR")} €
              </span>
            </div>
          )}

          {loading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Chargement…</p>
          ) : monthlyGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Aucun audit sur cette période</p>
          ) : (
            <div className="space-y-4">
              {monthlyGroups.map(([monthKey, audits]) => {
                const monthLabel = format(new Date(monthKey + "-01"), "MMMM yyyy", { locale: fr });
                const monthPrime = audits.reduce((sum, a) => sum + (perAuditPrimes.get(a.id) ?? 0), 0);

                return (
                  <motion.div
                    key={monthKey}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/40 overflow-hidden"
                  >
                    <div className="flex items-center justify-between bg-muted/50 px-3 py-2">
                      <span className="text-xs font-semibold text-foreground capitalize">{monthLabel}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">{audits.length} audit{audits.length > 1 ? "s" : ""}</span>
                        <span className="text-sm font-bold text-foreground tabular-nums">{monthPrime.toLocaleString("fr-FR")} €</span>
                      </div>
                    </div>

                    <div className="divide-y divide-border/30 px-3">
                      {audits.map((a) => {
                        const auditPrime = perAuditPrimes.get(a.id) ?? 0;
                        return (
                          <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 py-2 text-sm">
                            <span className="font-medium text-foreground truncate">{a.partenaire}</span>
                            <span className="hidden sm:inline text-muted-foreground">—</span>
                            <span className="text-muted-foreground text-xs sm:text-sm truncate">{a.type_evenement}</span>
                            <span className="hidden sm:inline text-muted-foreground">—</span>
                            <span className="text-muted-foreground text-xs sm:text-sm truncate">{a.lieu || "—"}</span>
                            <span className="sm:ml-auto flex items-center gap-2 shrink-0">
                              <span className="text-muted-foreground text-xs sm:text-sm tabular-nums">
                                {format(new Date(a.date), "dd/MM/yyyy", { locale: fr })}
                              </span>
                              <span className="text-xs font-semibold text-foreground tabular-nums min-w-[40px] text-right">
                                {auditPrime}€
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
