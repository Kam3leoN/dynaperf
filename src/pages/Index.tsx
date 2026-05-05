import { type ReactNode } from "react";
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
    scoresByType, monthlyData,
    partenaireStats, scoreDistribution, globalStats, loading,
  } = useAuditData();

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
            title="Vue d'ensemble des audits"
            stackIndex={0}
          >
            <GlobalStats
              {...globalStats}
              annee={filters.annee}
              periodMode={filters.periodMode}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
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
