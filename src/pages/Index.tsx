import { useAuditData } from "@/hooks/useAuditData";
import { FiltersBar } from "@/components/FiltersBar";
import { GlobalStats } from "@/components/GlobalStats";
import { ScoreCard } from "@/components/ScoreCard";
import { CollaborateurTracker } from "@/components/CollaborateurTracker";
import { MonthlyChart } from "@/components/MonthlyChart";
import { ScoreDistributionChart } from "@/components/ScoreDistributionChart";
import { PartenaireLeaderboard } from "@/components/PartenaireLeaderboard";
import { ScoresByTypeChart } from "@/components/ScoresByTypeChart";
import { AuditTable } from "@/components/AuditTable";
import { ExcelExport } from "@/components/ExcelExport";
import { Activity } from "lucide-react";

const Index = () => {
  const {
    audits, filters, setFilters,
    scoresByType, collaborateurStats, monthlyData,
    partenaireStats, scoreDistribution, globalStats,
    addAudit, updateAudit, deleteAudit, loading,
  } = useAuditData();

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card shadow-soft border-b border-border px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-sora text-lg font-bold text-foreground tracking-tight">AuditPulse</h1>
              <p className="text-xs text-muted-foreground">Monitoring des audits partenaires</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExcelExport audits={audits} />
            <FiltersBar filters={filters} setFilters={setFilters} />
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground font-sora">Chargement des audits…</p>
          </div>
        ) : (
          <>
            <GlobalStats {...globalStats} />
            <section>
              <h2 className="font-sora text-sm font-semibold text-foreground mb-3">Performance par type d'événement</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {scoresByType.map((s, i) => (
                  <ScoreCard key={s.type} {...s} index={i} />
                ))}
              </div>
            </section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MonthlyChart data={monthlyData} />
              <ScoresByTypeChart data={scoresByType} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ScoreDistributionChart data={scoreDistribution} />
              <CollaborateurTracker data={collaborateurStats} />
            </div>
            <PartenaireLeaderboard data={partenaireStats} />
            <AuditTable
              audits={audits}
              onAdd={addAudit}
              onUpdate={updateAudit}
              onDelete={deleteAudit}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
