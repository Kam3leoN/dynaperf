import { useAuditData } from "@/hooks/useAuditData";
import { AuditTable } from "@/components/AuditTable";
import { AppLayout } from "@/components/AppLayout";

export default function Registre() {
  const { audits, filters, setFilters, addAudit, updateAudit, deleteAudit, loading } = useAuditData();

  return (
    <AppLayout audits={audits} filters={filters} setFilters={setFilters}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Chargement des audits…</p>
        </div>
      ) : (
        <AuditTable audits={audits} onAdd={addAudit} onUpdate={updateAudit} onDelete={deleteAudit} />
      )}
    </AppLayout>
  );
}
