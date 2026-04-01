import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faCoins } from "@fortawesome/free-solid-svg-icons";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/** Default range: 16th of current month → 15th of next month */
function getDefaultRange(): { from: Date; to: Date } {
  const now = new Date();
  const day = now.getDate();
  let fromDate: Date;
  let toDate: Date;

  if (day >= 16) {
    // 16 of current month to 15 of next month
    fromDate = new Date(now.getFullYear(), now.getMonth(), 16);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  } else {
    // 16 of previous month to 15 of current month
    fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 16);
    toDate = new Date(now.getFullYear(), now.getMonth(), 15);
  }
  return { from: fromDate, to: toDate };
}

interface PrimeConfig {
  prime_audit_1: number;
  prime_audit_2: number;
  prime_audit_3_plus: number;
}

export function MyPrimeTracker() {
  const { user } = useAuth();
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [from, setFrom] = useState<Date>(defaultRange.from);
  const [to, setTo] = useState<Date>(defaultRange.to);
  const [config, setConfig] = useState<PrimeConfig | null>(null);
  const [auditCount, setAuditCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load user config
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
  }, [user]);

  // Load audits in date range for current user
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");

    // Get user display name to match against auditeur field
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        const displayName = profile?.display_name || user.email?.split("@")[0] || "";

        supabase
          .from("audits")
          .select("id", { count: "exact" })
          .eq("auditeur", displayName)
          .eq("statut", "OK")
          .gte("date", fromStr)
          .lte("date", toStr)
          .then(({ count }) => {
            setAuditCount(count ?? 0);
            setLoading(false);
          });
      });
  }, [user, from, to]);

  // Calculate prime
  const prime = useMemo(() => {
    if (!config) return 0;
    let total = 0;
    for (let i = 1; i <= auditCount; i++) {
      if (i === 1) total += config.prime_audit_1;
      else if (i === 2) total += config.prime_audit_2;
      else total += config.prime_audit_3_plus;
    }
    return total;
  }, [config, auditCount]);

  if (!config) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
    >
      <div className="flex items-center gap-2 mb-3">
        <FontAwesomeIcon icon={faCoins} className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Ma prime</h3>
      </div>

      {/* Date range selectors */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <DatePicker label="Du" date={from} onChange={setFrom} />
        <DatePicker label="Au" date={to} onChange={setTo} />
      </div>

      {/* Result */}
      <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{auditCount}</span> audit{auditCount > 1 ? "s" : ""} réalisé{auditCount > 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-foreground tabular-nums">
            {loading ? "…" : `${prime.toLocaleString("fr-FR")} €`}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function DatePicker({ label, date, onChange }: { label: string; date: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-8 justify-start font-normal", !date && "text-muted-foreground")}>
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
        />
      </PopoverContent>
    </Popover>
  );
}
