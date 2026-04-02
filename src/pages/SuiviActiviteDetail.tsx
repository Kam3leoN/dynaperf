import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { fetchSuiviItemsConfig, SuiviItemConfig } from "@/data/suiviActiviteItems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SuiviActivitePdfDetail } from "@/components/SuiviActivitePdfDetail";
import { ReportSignatures } from "@/components/ReportSignatures";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheck, faXmark, faMinus, faCircleInfo } from "@fortawesome/free-solid-svg-icons";

interface SuiviRow {
  id: string;
  date: string;
  agence: string;
  agence_referente: string | null;
  suivi_par: string;
  items: Record<string, { status: string; observation?: string }>;
  total_items_valides: number | null;
  total_items: number | null;
  nb_contrats_total: number | null;
  nb_contrats_depuis_dernier: number | null;
  observations: string | null;
  signature_auditeur: string | null;
  signature_audite: string | null;
}

export default function SuiviActiviteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [suivi, setSuivi] = useState<SuiviRow | null>(null);
  const [itemsConfig, setItemsConfig] = useState<SuiviItemConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("suivi_activite").select("*").eq("id", id).single(),
      fetchSuiviItemsConfig(),
    ]).then(([{ data }, config]) => {
      if (data) {
        setSuivi({ ...data, items: (data.items as any) ?? {} });
      }
      setItemsConfig(config);
      setLoading(false);
    });
  }, [id]);

  const categories = useMemo(() => {
    const cats: { name: string; items: SuiviItemConfig[] }[] = [];
    const seen = new Set<string>();
    for (const item of itemsConfig) {
      if (!seen.has(item.categorie)) {
        seen.add(item.categorie);
        cats.push({ name: item.categorie, items: [] });
      }
      cats.find((c) => c.name === item.categorie)!.items.push(item);
    }
    return cats;
  }, [itemsConfig]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground animate-pulse">Chargement…</p>
        </div>
      </AppLayout>
    );
  }

  if (!suivi) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">Suivi introuvable.</p>
          <Button variant="outline" onClick={() => navigate("/activite")}>Retour</Button>
        </div>
      </AppLayout>
    );
  }

  const rate = suivi.total_items ? Math.round(((suivi.total_items_valides ?? 0) / suivi.total_items) * 100) : 0;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/activite")} className="gap-1.5">
              <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /> Retour
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Détail du suivi</h1>
          </div>
          <SuiviActivitePdfDetail suiviId={suivi.id} />
        </div>

        {/* ── Informations générales ── */}
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-4">
            Informations générales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
            <InfoField label="Partenaire accompagné" value={suivi.agence} />
            <InfoField label="Partenaire référent" value={suivi.agence_referente} />
            <InfoField label="Suivi réalisé par" value={suivi.suivi_par} />
            <InfoField label="Date" value={format(new Date(suivi.date), "dd MMMM yyyy", { locale: fr })} />
            <InfoField label="Contrats total (année)" value={String(suivi.nb_contrats_total ?? 0)} />
            <InfoField label="Contrats depuis dernier" value={String(suivi.nb_contrats_depuis_dernier ?? 0)} />
          </div>
          <div className="mt-3 flex gap-3 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {suivi.total_items_valides ?? 0}/{suivi.total_items ?? 0} validés
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Taux : {rate}%
            </Badge>
          </div>
        </div>

        {/* ── Items par catégorie ── */}
        {categories.map((cat) => (
          <div key={cat.name} className="space-y-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
              {cat.name}
            </h2>
            {cat.items.map((item) => {
              const ans = suivi.items[item.id] ?? { status: null };
              const isFait = ans.status === "fait";
              const isPasFait = ans.status === "pas_fait";
              const isNc = ans.status === "nc";

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "transition-all border-l-4",
                    isFait ? "border-l-emerald-500"
                      : isPasFait ? "border-l-destructive"
                      : isNc ? "border-l-muted-foreground"
                      : "border-l-border"
                  )}
                >
                  <CardContent className="p-3 sm:p-4 space-y-3">
                    {/* Title row */}
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground font-mono mt-0.5">{item.numero}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="secondary" className="text-[10px]">{item.categorie}</Badge>
                          <Badge
                            className={cn(
                              "text-[10px]",
                              isFait ? "bg-emerald-600 text-white"
                                : isPasFait ? "bg-destructive text-destructive-foreground"
                                : isNc ? "bg-muted text-muted-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {isFait ? "Fait" : isPasFait ? "Pas fait" : isNc ? "Non applicable" : "—"}
                          </Badge>
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight">{item.titre}</h3>
                      </div>
                      <div className="flex-shrink-0">
                        {isFait ? (
                          <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-emerald-500" />
                        ) : isPasFait ? (
                          <FontAwesomeIcon icon={faXmark} className="h-4 w-4 text-destructive" />
                        ) : isNc ? (
                          <FontAwesomeIcon icon={faMinus} className="h-4 w-4 text-muted-foreground" />
                        ) : null}
                      </div>
                    </div>

                    {/* Description */}
                    {(item.conditions || item.interets) && (
                      <div className="rounded-md border border-border bg-muted/30 p-2.5 sm:p-3 space-y-1.5">
                        {item.conditions && (
                          <div className="flex items-start gap-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            <FontAwesomeIcon icon={faCircleInfo} className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{item.conditions}</span>
                          </div>
                        )}
                        {item.interets && (
                          <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">{item.interets}</p>
                        )}
                      </div>
                    )}

                    {/* Conseils */}
                    {item.conseils && (
                      <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                        <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed">
                          💡 {item.conseils}
                        </p>
                      </div>
                    )}

                    {/* Observation */}
                    {ans.observation && (
                      <div className="rounded-md border border-border bg-muted/20 p-2.5">
                        <span className="text-xs text-muted-foreground block mb-0.5">Observation</span>
                        <p className="text-sm text-foreground">{ans.observation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}

        {/* ── Observations globales ── */}
        {suivi.observations && (
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-4">
              Observations générales
            </h2>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-sm text-foreground whitespace-pre-line">{suivi.observations}</p>
            </div>
          </div>
        )}

        <ReportSignatures
          signers={[
            {
              label: "Auditeur",
              name: suivi.suivi_par,
              signature: suivi.signature_auditeur,
            },
            {
              label: "Partenaire audité",
              name: suivi.agence,
              signature: suivi.signature_audite,
            },
          ]}
        />
      </div>
    </AppLayout>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
