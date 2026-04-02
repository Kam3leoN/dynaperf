import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

interface AuditTypeVersion {
  id: string;
  key: string;
  label: string;
  version: number;
  version_label: string | null;
  is_active: boolean;
}

export default function AuditVersionSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeKey = searchParams.get("type") || "";
  const [versions, setVersions] = useState<AuditTypeVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!typeKey) return;
    supabase
      .from("audit_types")
      .select("id, key, label, version, version_label, is_active")
      .eq("key", typeKey)
      .order("version", { ascending: false })
      .then(({ data }) => {
        setVersions(data || []);
        setLoading(false);
        // If only one version, skip directly to form
        if (data && data.length === 1) {
          navigate(`/audits/new/form?type=${encodeURIComponent(typeKey)}&typeId=${data[0].id}`, { replace: true });
        }
      });
  }, [typeKey, navigate]);

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
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 gap-1.5 text-muted-foreground"
            onClick={() => navigate("/audits/new")}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
            Retour
          </Button>
          <h2 className="text-xl font-semibold text-foreground">Choisir la grille</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Sélectionnez la version de la grille pour « {versions[0]?.label || typeKey} »
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => navigate(`/audits/new/form?type=${encodeURIComponent(typeKey)}&typeId=${v.id}`)}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.98] text-left"
            >
              <div className="flex items-center gap-2 w-full">
                <FontAwesomeIcon icon={faLayerGroup} className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {v.version_label || `V${v.version}`}
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
                {v.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
