import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MyPrimeTracker } from "@/components/MyPrimeTracker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";

interface AuditRow {
  id: string;
  partenaire: string;
  type_evenement: string;
  lieu: string | null;
  date: string;
}

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

export default function Primes() {
  const { user } = useAuth();
  const range = useMemo(() => getDefaultRange(), []);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fromStr = format(range.from, "yyyy-MM-dd");
    const toStr = format(range.to, "yyyy-MM-dd");

    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        const displayName = profile?.display_name || user.email?.split("@")[0] || "";

        supabase
          .from("audits")
          .select("id, partenaire, type_evenement, lieu, date")
          .eq("auditeur", displayName)
          .eq("statut", "OK")
          .gte("date", fromStr)
          .lte("date", toStr)
          .order("date", { ascending: false })
          .then(({ data }) => {
            setAudits(data ?? []);
            setLoading(false);
          });
      });
  }, [user, range]);

  return (
    <AppLayout>
      <section className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Primes</h1>
        <MyPrimeTracker />

        {/* Audit list */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faClipboardList} className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Audits réalisés</h3>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Chargement…</p>
          ) : audits.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Aucun audit sur cette période</p>
          ) : (
            <div className="divide-y divide-border/40">
              {audits.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 py-2.5 text-sm"
                >
                  <span className="font-medium text-foreground truncate">
                    {a.partenaire}
                  </span>
                  <span className="text-muted-foreground text-xs sm:text-sm truncate">
                    {a.type_evenement}
                  </span>
                  <span className="text-muted-foreground text-xs sm:text-sm truncate">
                    {a.lieu || "—"}
                  </span>
                  <span className="text-muted-foreground text-xs sm:text-sm tabular-nums sm:ml-auto shrink-0">
                    {format(new Date(a.date), "dd/MM/yyyy", { locale: fr })}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
