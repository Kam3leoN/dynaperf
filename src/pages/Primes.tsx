import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MyPrimeTracker } from "@/components/MyPrimeTracker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faCalendar, faCoins } from "@fortawesome/free-solid-svg-icons";
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
}

/** Billing cycle range: 16th → 15th */
function getDefaultRange() {
  const now = new Date();
  const day = now.getDate();
  if (day >= 16) {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 16),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 15),
    };
  }
  return {
    from: new Date(now.getFullYear(), now.getMonth() - 1, 16),
    to: new Date(now.getFullYear(), now.getMonth(), 15),
  };
}

/** Calculate prime for N audits */
function calcPrime(count: number, config: PrimeConfig): number {
  let total = 0;
  for (let i = 1; i <= count; i++) {
    if (i === 1) total += config.prime_audit_1;
    else if (i === 2) total += config.prime_audit_2;
    else total += config.prime_audit_3_plus;
  }
  return total;
}

/** Group audits by mois_versement (billing month key "YYYY-MM") */
function groupByBillingMonth(audits: AuditRow[]): Map<string, AuditRow[]> {
  const map = new Map<string, AuditRow[]>();
  for (const a of audits) {
    const d = new Date(a.date);
    const day = d.getDate();
    // If date is 16+ → billing month is next month; otherwise current month
    let billingMonth: Date;
    if (day >= 16) {
      billingMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    } else {
      billingMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    }
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
  const defaultRange = useMemo(() => getDefaultRange(), []);

  // Recap date range — default to start of year → today
  const [recapFrom, setRecapFrom] = useState<Date>(() => new Date(new Date().getFullYear(), 0, 1));
  const [recapTo, setRecapTo] = useState<Date>(() => new Date());

  const [config, setConfig] = useState<PrimeConfig | null>(null);
  const [allAudits, setAllAudits] = useState<AuditRow[]>([]);
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

  // Load audits for recap range
  useEffect(() => {
    if (!user || !displayName) return;
    setLoading(true);
    const fromStr = format(recapFrom, "yyyy-MM-dd");
    const toStr = format(recapTo, "yyyy-MM-dd");

    supabase
      .from("audits")
      .select("id, partenaire, type_evenement, lieu, date")
      .eq("auditeur", displayName)
      .eq("statut", "OK")
      .gte("date", fromStr)
      .lte("date", toStr)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setAllAudits(data ?? []);
        setLoading(false);
      });
  }, [user, displayName, recapFrom, recapTo]);

  // Group by billing month
  const monthlyGroups = useMemo(() => {
    const map = groupByBillingMonth(allAudits);
    // Sort keys descending
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [allAudits]);

  const grandTotal = useMemo(() => {
    if (!config) return 0;
    return monthlyGroups.reduce((sum, [, audits]) => sum + calcPrime(audits.length, config), 0);
  }, [monthlyGroups, config]);

  return (
    <AppLayout>
      <section className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Primes</h1>

        {/* Current billing cycle tracker */}
        <MyPrimeTracker />

        {/* Monthly recap */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCoins} className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Récapitulatif par mois</h3>
          </div>

          {/* Date range selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <DatePicker label="Du" date={recapFrom} onChange={setRecapFrom} />
            <DatePicker label="Au" date={recapTo} onChange={setRecapTo} />
          </div>

          {/* Grand total */}
          {config && !loading && (
            <div className="flex items-center justify-between rounded-xl bg-primary/5 p-3">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{allAudits.length}</span> audit{allAudits.length > 1 ? "s" : ""} — Total
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
                const monthPrime = config ? calcPrime(audits.length, config) : 0;

                return (
                  <motion.div
                    key={monthKey}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/40 overflow-hidden"
                  >
                    {/* Month header */}
                    <div className="flex items-center justify-between bg-muted/50 px-3 py-2">
                      <span className="text-xs font-semibold text-foreground capitalize">{monthLabel}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">{audits.length} audit{audits.length > 1 ? "s" : ""}</span>
                        <span className="text-sm font-bold text-foreground tabular-nums">{monthPrime.toLocaleString("fr-FR")} €</span>
                      </div>
                    </div>

                    {/* Audit rows */}
                    <div className="divide-y divide-border/30 px-3">
                      {audits.map((a, i) => (
                        <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 py-2 text-sm">
                          <span className="font-medium text-foreground truncate">{a.partenaire}</span>
                          <span className="hidden sm:inline text-muted-foreground">—</span>
                          <span className="text-muted-foreground text-xs sm:text-sm truncate">{a.type_evenement}</span>
                          <span className="hidden sm:inline text-muted-foreground">—</span>
                          <span className="text-muted-foreground text-xs sm:text-sm truncate">{a.lieu || "—"}</span>
                          <span className="text-muted-foreground text-xs sm:text-sm tabular-nums sm:ml-auto shrink-0">
                            {format(new Date(a.date), "dd/MM/yyyy", { locale: fr })}
                          </span>
                        </div>
                      ))}
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
