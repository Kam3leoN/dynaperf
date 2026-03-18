import { useAuditData } from "@/hooks/useAuditData";
import { GlobalStats } from "@/components/GlobalStats";
import { ScoreCard } from "@/components/ScoreCard";
import { CollaborateurTracker } from "@/components/CollaborateurTracker";
import { MonthlyChart } from "@/components/MonthlyChart";
import { ScoreDistributionChart } from "@/components/ScoreDistributionChart";
import { PartenaireLeaderboard } from "@/components/PartenaireLeaderboard";
import { ScoresByTypeChart } from "@/components/ScoresByTypeChart";
import { AppLayout } from "@/components/AppLayout";

const Index = () => {
  const {
    audits, filters, setFilters,
    scoresByType, collaborateurStats, monthlyData,
    partenaireStats, scoreDistribution, globalStats, loading,
  } = useAuditData();

  return (
    <AppLayout audits={audits} filters={filters} setFilters={setFilters}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground font-sora">Chargement des audits…</p>
        </div>
      ) : (
        <>
          <GlobalStats {...globalStats} />
          <section>
            <h2 className="font-sora text-sm font-semibold text-foreground mb-3">Comparaison par type d'événement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {scoresByType.map((s, i) => (
                <ScoresByTypeChart key={s.type} data={s} index={i} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="font-sora text-sm font-semibold text-foreground mb-3">Performance par type d'événement</h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <CollaborateurTracker data={collaborateurStats} />
            <PartenaireLeaderboard data={partenaireStats} />
          </div>
        </>
      )}
    </AppLayout>
  );
};

export default Index;
