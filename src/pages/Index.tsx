import { useAuditData } from "@/hooks/useAuditData";
import { GlobalStats } from "@/components/GlobalStats";
import { ScoreCard } from "@/components/ScoreCard";

import { MonthlyChart } from "@/components/MonthlyChart";
import { ScoreDistributionChart } from "@/components/ScoreDistributionChart";
import { PartenaireLeaderboard } from "@/components/PartenaireLeaderboard";
import { ScoresByTypeChart } from "@/components/ScoresByTypeChart";
import { PodiumCards } from "@/components/PodiumCards";
import { AppLayout } from "@/components/AppLayout";

const StrokeTitle = ({ text }: { text: string }) => (
  <span className="stroke-title" data-text={text}>
    <span className="span-text">{text}</span>
  </span>
);

const Index = () => {
  const {
    audits, filters, setFilters,
    scoresByType, collaborateurStats, monthlyData,
    partenaireStats, scoreDistribution, globalStats, loading,
  } = useAuditData();

  const objectifTotal = filters.auditeur !== "Tous"
    ? collaborateurStats.find((c) => c.nom === filters.auditeur)?.objectif ?? 0
    : collaborateurStats.reduce((sum, c) => sum + c.objectif, 0);

  return (
    <AppLayout audits={audits} filters={filters} setFilters={setFilters}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Chargement des audits…</p>
        </div>
      ) : (
        <>
          <GlobalStats
            {...globalStats}
            objectifTotal={objectifTotal}
            objectifNotes={objectifTotal}
          />
          <section>
            <h2 className="mb-3"><StrokeTitle text="Podium par type d'événement" /></h2>
            <PodiumCards data={partenaireStats} />
          </section>
          <section>
            <h2 className="mb-3"><StrokeTitle text="Comparaison par type d'événement" /></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {scoresByType.map((s, i) => (
                <ScoresByTypeChart key={s.type} data={s} index={i} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3"><StrokeTitle text="Performance par type d'événement" /></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {scoresByType.map((s, i) => (
                <ScoreCard key={s.type} {...s} index={i} />
              ))}
            </div>
          </section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <MonthlyChart data={monthlyData} />
            <ScoreDistributionChart data={scoreDistribution} />
          </div>
          <PartenaireLeaderboard data={partenaireStats} />
        </>
      )}
    </AppLayout>
  );
};

export default Index;
