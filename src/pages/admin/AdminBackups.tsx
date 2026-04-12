import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDatabase, faDownload, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { downloadSqlBackupFile, runBackupAllJson, runSqlBackupToStorage } from "@/lib/adminBackups";

/**
 * Super-admin : sauvegardes JSON / SQL (Storage) et téléchargement d’un dump `.sql`.
 */
export default function AdminBackups() {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdmin(user);
  const [loadingJson, setLoadingJson] = useState(false);
  const [loadingSqlStorage, setLoadingSqlStorage] = useState(false);
  const [loadingSqlDownload, setLoadingSqlDownload] = useState(false);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-semibold tracking-tight">Sauvegardes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Réservé au super administrateur.</p>
      </div>
    );
  }

  const onJson = async () => {
    setLoadingJson(true);
    try {
      const r = await runBackupAllJson();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de sauvegarde");
    }
    setLoadingJson(false);
  };

  const onSqlStorage = async () => {
    setLoadingSqlStorage(true);
    try {
      const r = await runSqlBackupToStorage();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur dump SQL");
    }
    setLoadingSqlStorage(false);
  };

  const onSqlDownload = async () => {
    setLoadingSqlDownload(true);
    try {
      const r = await downloadSqlBackupFile();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur téléchargement SQL");
    }
    setLoadingSqlDownload(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sauvegardes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Export JSON vers le stockage, dump SQL (INSERT) vers le stockage ou fichier téléchargé. Les sauvegardes
          automatiques quotidiennes peuvent être déclenchées par GitHub Actions ou pg_cron (voir la doc du dépôt).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sauvegarde JSON</CardTitle>
          <CardDescription>
            Export des tables applicatives en JSON sous <code className="text-xs">avatars/backups/</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void onJson()}
            disabled={loadingJson}
          >
            <FontAwesomeIcon icon={loadingJson ? faSpinner : faDownload} className={loadingJson ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
            Lancer la sauvegarde JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dump SQL (stockage)</CardTitle>
          <CardDescription>
            Génère des INSERT pour le schéma <code className="text-xs">public</code> et enregistre le fichier sous{" "}
            <code className="text-xs">avatars/backups/sql/</code>. Nécessite le secret Edge{" "}
            <code className="text-xs">SUPABASE_DB_URL</code> (port 5432).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void onSqlStorage()}
            disabled={loadingSqlStorage}
          >
            <FontAwesomeIcon
              icon={loadingSqlStorage ? faSpinner : faDatabase}
              className={loadingSqlStorage ? "h-3 w-3 animate-spin" : "h-3 w-3"}
            />
            Créer le dump sur le stockage
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Télécharger le dump SQL</CardTitle>
          <CardDescription>
            Télécharge immédiatement un fichier <code className="text-xs">.sql</code> (données INSERT). Même prérequis
            Postgres direct que ci-dessus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-2"
            onClick={() => void onSqlDownload()}
            disabled={loadingSqlDownload}
          >
            <FontAwesomeIcon
              icon={loadingSqlDownload ? faSpinner : faDownload}
              className={loadingSqlDownload ? "h-3 w-3 animate-spin" : "h-3 w-3"}
            />
            Télécharger le fichier SQL
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
