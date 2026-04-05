import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faCoins } from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { DEFAULT_PRIME_CONFIG, PrimeConfig, getFormatPrimes, parsePrimeConfig, buildRankMap, UserCustomPrime, getPrimeValues } from "@/lib/primeUtils";

/** Default range: 16th of current month → 15th of next month */
function getDefaultRange(): { from: Date; to: Date } {
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

interface AuditRow {
  id: string;
  partenaire: string;
  type_evenement: string;
  lieu: string | null;
  date: string;
  custom_prime_id: string | null;
}

export function MyPrimeTracker() {
  const { user } = useAuth();
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [from, setFrom] = useState<Date>(defaultRange.from);
  const [to, setTo] = useState<Date>(defaultRange.to);
  const [config, setConfig] = useState<PrimeConfig>(DEFAULT_PRIME_CONFIG);
  const [customPrimes, setCustomPrimes] = useState<UserCustomPrime[]>([]);
  const [rangeAudits, setRangeAudits] = useState<AuditRow[]>([]);
  const [yearAudits, setYearAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_my_config").then(({ data }) => {
      const rows = data as Database["public"]["Functions"]["get_my_config"]["Returns"] | null;
      setConfig(rows && rows.length > 0 ? parsePrimeConfig(rows[0]) : DEFAULT_PRIME_CONFIG);
    });
    supabase.from("user_custom_primes").select("id, label, prime_1, prime_2, prime_3_plus").eq("user_id", user.id)
      .then(({ data }) => setCustomPrimes((data ?? []) as UserCustomPrime[]));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");
    const minYear = from.getFullYear();
    const maxYear = to.getFullYear();
    const yearStart = `${minYear}-01-01`;
    const yearEnd = `${maxYear}-12-31`;

    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()
      .then(({ data: profile }) => {
        const displayName = profile?.display_name || user.email?.split("@")[0] || "";
        Promise.all([
          supabase.from("audits").select("id, partenaire, type_evenement, lieu, date, custom_prime_id")
            .eq("auditeur", displayName).eq("statut", "OK")
            .gte("date", fromStr).lte("date", toStr).order("date", { ascending: true }),
          supabase.from("audits").select("id, partenaire, type_evenement, lieu, date, custom_prime_id")
            .eq("auditeur", displayName).eq("statut", "OK")
            .gte("date", yearStart).lte("date", yearEnd).order("date", { ascending: true }),
        ]).then(([rangeRes, yearRes]) => {
          setRangeAudits((rangeRes.data ?? []) as AuditRow[]);
          setYearAudits((yearRes.data ?? []) as AuditRow[]);
          setLoading(false);
        });
      });
  }, [user, from, to]);

  const prime = useMemo(() => {
    if (yearAudits.length === 0) return 0;
    const rankMap = buildRankMap(yearAudits);
    const rangeIds = new Set(rangeAudits.map((a) => a.id));
    let total = 0;
    for (const a of yearAudits) {
      if (!rangeIds.has(a.id)) continue;
      const rank = rankMap.get(a.id) ?? 1;
      const [p1, p2, p3] = getPrimeValues(a, config, customPrimes);
      if (rank === 1) total += p1;
      else if (rank === 2) total += p2;
      else total += p3;
    }
    return total;
  }, [config, customPrimes, rangeAudits, yearAudits]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <FontAwesomeIcon icon={faCoins} className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Ma prime</h3>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <DatePicker label="Du" date={from} onChange={setFrom} />
        <DatePicker label="Au" date={to} onChange={setTo} />
      </div>
      <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{rangeAudits.length}</span> audit{rangeAudits.length > 1 ? "s" : ""} réalisé{rangeAudits.length > 1 ? "s" : ""}
        </div>
        <span className="text-lg font-bold text-foreground tabular-nums">
          {loading ? "…" : `${prime.toLocaleString("fr-FR")} €`}
        </span>
      </div>
    </motion.div>
  );
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
          locale={fr} initialFocus />
      </PopoverContent>
    </Popover>
  );
}
