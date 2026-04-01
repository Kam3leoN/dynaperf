import { useState } from "react";
import { useAuditData } from "@/hooks/useAuditData";
import { AuditTable } from "@/components/AuditTable";
import { AppLayout } from "@/components/AppLayout";
import { ExcelExport } from "@/components/ExcelExport";
import { PlanAuditDialog } from "@/components/PlanAuditDialog";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarPlus } from "@fortawesome/free-solid-svg-icons";

export default function Registre() {
  const { audits, filters, setFilters, availableYears, addAudit, updateAudit, deleteAudit, loading } = useAuditData();
  const [planOpen, setPlanOpen] = useState(false);

  // Force reload by re-fetching — simple approach: window reload after plan
  const handlePlanCreated = () => {
    window.location.reload();
  };

  return (
    <AppLayout filters={filters} setFilters={setFilters} availableYears={availableYears}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Chargement des audits…</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-md" onClick={() => setPlanOpen(true)}>
              <FontAwesomeIcon icon={faCalendarPlus} className="h-4 w-4 text-amber-500" />
              Planifier
            </Button>
            <ExcelExport audits={audits} />
          </div>
          <AuditTable audits={audits} onAdd={addAudit} onUpdate={updateAudit} onDelete={deleteAudit} />
        </div>
      )}
      <PlanAuditDialog open={planOpen} onOpenChange={setPlanOpen} onCreated={handlePlanCreated} />
    </AppLayout>
  );
}
