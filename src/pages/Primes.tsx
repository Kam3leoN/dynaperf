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
import { DEFAULT_PRIME_CONFIG, PrimeConfig, parsePrimeConfig, primeForNthVisitWithCustom, buildRankMap, UserCustomPrime } from "@/lib/primeUtils";
import { Badge } from "@/components/ui/badge";
import iconCompact from "@/assets/icon-compact.svg";
import iconExtended from "@/assets/icon-extended.svg";

interface AuditRow {
  id: string;
  partenaire: string;
  type_evenement: string;
  lieu: string | null;
  date: string;
  custom_prime_id: string | null;
}

function groupByBillingMonth(audits: AuditRow[]): Map<string, AuditRow[]> {
  const map = new Map<string, AuditRow[]>();
  for (const a of audits) {
    const d = new Date(a.date);
    const billingMonth = d.getDate() >= 16
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
        <Calendar mode="single" selected={date}
          onSelect={(d) => { if (d) { onChange(d); setOpen(false); } }}
          locale={fr} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}

export default function Primes() {
  const { user } = useAuth();
  const [recapFrom, setRecapFrom] = useState<Date>(() => new Date(new Date().getFullYear(), 0, 1));
  const [recapTo, setRecapTo] = useState<Date>(() => new Date());
  const [config, setConfig] = useState<PrimeConfig>(DEFAULT_PRIME_CONFIG);
  const [customPrimes, setCustomPrimes] = useState<UserCustomPrime[]>([]);
  const [displayAudits, setDisplayAudits] = useState<AuditRow[]>([]);
  const [yearAudits, setYearAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [viewMode, setViewMode] = useState<"compact" | "extended">("extended");

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_my_config").then(({ data }: any) => {
      setConfig(data && data.length > 0 ? parsePrimeConfig(data[0]) : DEFAULT_PRIME_CONFIG);
    });
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name || user.email?.split("@")[0] || ""));
    supabase.from("user_custom_primes").select("id, label, prime_1, prime_2, prime_3_plus").eq("user_id", user.id)
      .then(({ data }) => setCustomPrimes((data ?? []) as UserCustomPrime[]));
  }, [user]);

  useEffect(() => {
    if (!user || !displayName) return;
    setLoading(true);
    const fromStr = format(recapFrom, "yyyy-MM-dd");
    const toStr = format(recapTo, "yyyy-MM-dd");
    const minYear = recapFrom.getFullYear();
    const maxYear = recapTo.getFullYear();

    Promise.all([
      supabase.from("audits").select("id, partenaire, type_evenement, lieu, date, custom_prime_id")
        .eq("auditeur", displayName).eq("statut", "OK")
        .gte("date", fromStr).lte("date", toStr).order("date", { ascending: false }),
      supabase.from("audits").select("id, partenaire, type_evenement, lieu, date, custom_prime_id")
        .eq("auditeur", displayName).eq("statut", "OK")
        .gte("date", `${minYear}-01-01`).lte("date", `${maxYear}-12-31`)
        .order("date", { ascending: true }),
    ]).then(([displayRes, yearRes]) => {
      setDisplayAudits((displayRes.data ?? []) as AuditRow[]);
      setYearAudits((yearRes.data ?? []) as AuditRow[]);
      setLoading(false);
    });
  }, [user, displayName, recapFrom, recapTo]);

  const monthlyGroups = useMemo(() => {
    const map = groupByBillingMonth(displayAudits);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [displayAudits]);

  const { grandTotal, perAuditPrimes, perAuditRanks } = useMemo(() => {
    const rankMap = buildRankMap(yearAudits);
    const perAudit = new Map<string, number>();
    const perRank = new Map<string, number>();
    let total = 0;
    for (const a of displayAudits) {
      const rank = rankMap.get(a.id) ?? 1;
      const p = primeForNthVisitWithCustom(rank, a, config, customPrimes);
      perAudit.set(a.id, p);
      perRank.set(a.id, rank);
      total += p;
    }
    return { grandTotal: total, perAuditPrimes: perAudit, perAuditRanks: perRank };
  }, [displayAudits, yearAudits, config, customPrimes]);

  return (
    <AppLayout>
      <section className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Primes</h1>
        <MyPrimeTracker />

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
              <span className="text-lg font-bold text-foreground tabular-nums">{grandTotal.toLocaleString("fr-FR")} €</span>
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
                  <motion.div key={monthKey} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/40 overflow-hidden">
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
                        const rank = perAuditRanks.get(a.id) ?? 1;
                        const rankLabel = rank === 1 ? "1er" : `${rank}e`;
                        const rankColorClass = rank === 1
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : rank === 2
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                        return (
                          <div key={a.id} className="py-3 space-y-1.5">
                            <p className="text-sm font-semibold text-foreground">{a.partenaire}</p>
                            <p className="text-xs text-muted-foreground">{a.lieu || "—"}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="tabular-nums text-muted-foreground">
                                {format(new Date(a.date), "dd/MM/yyyy", { locale: fr })}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-sm bg-secondary font-medium">{a.type_evenement}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold tabular-nums text-foreground">{auditPrime}€</span>
                              <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 rounded-sm font-medium border-0", rankColorClass)}>
                                {rankLabel}
                              </Badge>
                            </div>
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
