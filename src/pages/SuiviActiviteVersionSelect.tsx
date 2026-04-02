import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons";

interface SuiviVersion {
  config_version: number;
  config_version_label: string | null;
  is_active: boolean;
  count: number;
}

export default function SuiviActiviteVersionSelect() {
  const navigate = useNavigate();
  const [versions, setVersions] = useState<SuiviVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("suivi_activite_items_config")
      .select("config_version, config_version_label, is_active")
      .order("config_version", { ascending: false })
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        // Group by config_version
        const map = new Map<number, SuiviVersion>();
        data.forEach((row) => {
          const existing = map.get(row.config_version);
          if (existing) {
            existing.count++;
          } else {
            map.set(row.config_version, {
              config_version: row.config_version,
              config_version_label: row.config_version_label,
              is_active: row.is_active,
              count: 1,
            });
          }
        });
        const versionsList = Array.from(map.values());
        setVersions(versionsList);
        setLoading(false);
        // If only one version, skip directly
        if (versionsList.length === 1) {
          navigate(`/activite/new?version=${versionsList[0].config_version}`, { replace: true });
        }
      });
  }, [navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground animate-pulse">Chargement…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-10 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-xl font-semibold text-foreground">Choisir la grille</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Sélectionnez la version du suivi d'activité
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {versions.map((v) => (
            <button
              key={v.config_version}
              onClick={() => navigate(`/activite/new?version=${v.config_version}`)}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.98] text-left"
            >
              <div className="flex items-center gap-2 w-full">
                <FontAwesomeIcon icon={faLayerGroup} className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {v.config_version_label || `V${v.config_version}`}
                </span>
                {v.is_active && (
                  <Badge className="ml-auto text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
                    Active
                  </Badge>
                )}
                {!v.is_active && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    Archivée
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {v.count} critères
              </p>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
