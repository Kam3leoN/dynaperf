import { useAuditData } from "@/hooks/useAuditData";
import { AuditTable } from "@/components/AuditTable";
import { AppLayout } from "@/components/AppLayout";
import { ExcelExport } from "@/components/ExcelExport";

export default function Registre() {
  const { audits, filters, setFilters, availableYears, addAudit, updateAudit, deleteAudit, loading } = useAuditData();

  return (
    <AppLayout filters={filters} setFilters={setFilters} availableYears={availableYears}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Chargement des audits…</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <ExcelExport audits={audits} />
          </div>
          <AuditTable audits={audits} onAdd={addAudit} onUpdate={updateAudit} onDelete={deleteAudit} />
        </div>
      )}
    </AppLayout>
  );
}
