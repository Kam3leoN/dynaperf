import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [editAuditId, setEditAuditId] = useState<string | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open plan dialog from URL
  useEffect(() => {
    if (searchParams.get("plan") === "1") {
      setPlanOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handlePlanCreated = () => {
    window.location.reload();
  };

  const handleEditPlan = (auditId: string) => {
    setEditAuditId(auditId);
    setPlanOpen(true);
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
            <Button variant="outline" size="sm" className="gap-1.5 rounded-md" onClick={() => { setEditAuditId(undefined); setPlanOpen(true); }}>
              <FontAwesomeIcon icon={faCalendarPlus} className="h-4 w-4 text-amber-500" />
              Planifier
            </Button>
            <ExcelExport audits={audits} />
          </div>
          <AuditTable audits={audits} onAdd={addAudit} onUpdate={updateAudit} onDelete={deleteAudit} onEditPlan={handleEditPlan} />
        </div>
      )}
      <PlanAuditDialog open={planOpen} onOpenChange={(o) => { setPlanOpen(o); if (!o) setEditAuditId(undefined); }} onCreated={handlePlanCreated} editAuditId={editAuditId} />
    </AppLayout>
  );
}
