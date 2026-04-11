import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDatabase, faDownload, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { readEdgeFunctionErrorMessage } from "@/lib/readEdgeFunctionError";

async function toastEdgeInvokeFailure(
  res: { data: unknown; error: unknown; response?: Response },
  fallback: string,
): Promise<boolean> {
  const dataErr =
    res.data && typeof res.data === "object" && res.data !== null && typeof (res.data as { error?: unknown }).error === "string"
      ? (res.data as { error: string }).error
      : null;
  if (!res.error && !dataErr) return false;
  const detail = (await readEdgeFunctionErrorMessage(res)) ?? dataErr;
  toast.error(detail?.trim() ? detail : fallback);
  return true;
}

export function BackupButton() {
  const [loading, setLoading] = useState(false);
  const handleBackup = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("backup-all");
      if (res.data?.success) {
        toast.success(`Sauvegarde réussie : ${res.data.file}`);
      } else {
        if (!(await toastEdgeInvokeFailure(res, "Erreur de sauvegarde"))) {
          toast.error((res.data as { error?: string } | null)?.error || "Erreur de sauvegarde");
        }
      }
    } catch {
      toast.error("Erreur de sauvegarde");
    }
    setLoading(false);
  };
  return (
    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleBackup} disabled={loading}>
      <FontAwesomeIcon icon={loading ? faSpinner : faDownload} className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Sauvegarder</span>
    </Button>
  );
}

export function SqlBackupButton() {
  const [loading, setLoading] = useState(false);
  const handleSqlBackup = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("sql-backup");
      if (res.data && typeof res.data === "object" && (res.data as { success?: boolean }).success) {
        const d = res.data as { file?: string; path?: string };
        toast.success(`Dump SQL créé : ${d.file ?? d.path ?? "OK"}`);
      } else {
        if (!(await toastEdgeInvokeFailure(res, "Erreur dump SQL"))) {
          toast.error((res.data as { error?: string } | null)?.error || "Erreur dump SQL");
        }
      }
    } catch {
      toast.error("Erreur dump SQL");
    }
    setLoading(false);
  };
  return (
    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleSqlBackup} disabled={loading} title="Dump SQL (INSERT) vers Storage backups/sql/">
      <FontAwesomeIcon icon={loading ? faSpinner : faDatabase} className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Dump SQL</span>
    </Button>
  );
}
