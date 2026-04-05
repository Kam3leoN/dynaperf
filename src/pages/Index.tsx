import { useState, useEffect, type ReactNode } from "react";
import { useAuditData } from "@/hooks/useAuditData";
import { GlobalStats } from "@/components/GlobalStats";
import { ScoreCard } from "@/components/ScoreCard";

import { MonthlyChart } from "@/components/MonthlyChart";
import { ScoreDistributionChart } from "@/components/ScoreDistributionChart";
import { PartenaireLeaderboard } from "@/components/PartenaireLeaderboard";
import { ScoresByTypeChart } from "@/components/ScoresByTypeChart";
import { PodiumCards } from "@/components/PodiumCards";
import { AppLayout } from "@/components/AppLayout";
import { ContextSubHeader } from "@/components/context-sub-header";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/** Même recette que la barre sous l’AppBar en messagerie : bordure basse + fond flouté. */
const stickySubHeaderShellClass =
  "sticky top-0 -mx-4 border-b border-border/30 bg-background/90 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85 shell:-mx-6";

const auditsMainClassName = "!pt-0 shell:!pt-0";

type StickySectionProps = {
  id: string;
  title: string;
  /** Ordre de pile au chevauchement : section suivante au-dessus de la précédente. */
  stackIndex: number;
  children: ReactNode;
};

function AuditsStickySection({ id, title, stackIndex, children }: StickySectionProps) {
  return (
    <section id={id} className="min-w-0">
      <div
        className={stickySubHeaderShellClass}
        style={{ zIndex: 10 + stackIndex * 10 }}
      >
        <ContextSubHeader title={title} />
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

const Index = () => {
  const {
    audits, filters, setFilters, availableYears,
    scoresByType, collaborateurStats, monthlyData,
    partenaireStats, scoreDistribution, globalStats, loading,
  } = useAuditData();

  const [semainesIndisponibles, setSemainesIndisponibles] = useState(10);

  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase.rpc("get_my_config");
      const rows = data as Database["public"]["Functions"]["get_my_config"]["Returns"] | null;
      if (rows && rows.length > 0) {
        setSemainesIndisponibles(rows[0].semaines_indisponibles ?? 10);
      }
    };
    loadConfig();
  }, []);

  const objectifTotal = filters.auditeur !== "Tous"
    ? collaborateurStats.find((c) => c.nom === filters.auditeur)?.objectif ?? 0
    : collaborateurStats.reduce((sum, c) => sum + c.objectif, 0);

  return (
    <AppLayout
      filters={filters}
      setFilters={setFilters}
      availableYears={availableYears}
      mainClassName={loading ? undefined : auditsMainClassName}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Chargement des audits…</p>
        </div>
      ) : (
        <div className="space-y-5">
          <AuditsStickySection
            id="audit-dashboard-progression"
            title="Progression de l'objectif des audits"
            stackIndex={0}
          >
            <GlobalStats
              {...globalStats}
              objectifTotal={objectifTotal}
              objectifNotes={objectifTotal}
              annee={filters.annee}
              semainesIndisponibles={semainesIndisponibles}
              auditsTermines={globalStats.auditsTermines}
              auditsPlanifies={globalStats.auditsPlanifies}
            />
          </AuditsStickySection>

          <AuditsStickySection
            id="audit-dashboard-podium"
            title="Podium par type d'événement"
            stackIndex={1}
          >
            <PodiumCards data={partenaireStats} />
          </AuditsStickySection>

          <AuditsStickySection
            id="audit-dashboard-comparaison"
            title="Comparaison par type d'événement"
            stackIndex={2}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {scoresByType.map((s, i) => (
                <ScoresByTypeChart key={s.type} data={s} index={i} />
              ))}
            </div>
          </AuditsStickySection>

          <AuditsStickySection
            id="audit-dashboard-performance"
            title="Performance par type d'événement"
            stackIndex={3}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {scoresByType.map((s, i) => (
                <ScoreCard key={s.type} {...s} index={i} />
              ))}
            </div>
          </AuditsStickySection>

          <AuditsStickySection id="audit-dashboard-volume" title="Volume & distribution" stackIndex={4}>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
              <MonthlyChart data={monthlyData} />
              <ScoreDistributionChart data={scoreDistribution} />
            </div>
          </AuditsStickySection>

          <AuditsStickySection id="audit-dashboard-leaderboard" title="Leaderboard" stackIndex={5}>
            <PartenaireLeaderboard data={partenaireStats} />
          </AuditsStickySection>
        </div>
      )}
    </AppLayout>
  );
};

export default Index;
