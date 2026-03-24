import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fetchAuditConfig, AuditTypeConfig } from "@/data/auditItems";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark, faLock, faCircleInfo, faImage } from "@fortawesome/free-solid-svg-icons";
import { AuditPdfExport } from "@/components/AuditPdfExport";
import { cn } from "@/lib/utils";

interface AuditDetailViewProps {
  auditId: string;
  typeEvenement: string;
  open: boolean;
  onClose: () => void;
  partenaire?: string;
  date?: string;
  lieu?: string | null;
  auditeur?: string;
  note?: number | null;
}

interface DetailData {
  items: Record<string, { score: number; comment?: string; checklist?: boolean[]; rawValue?: number }>;
  total_points: number | null;
  note_sur_10: number | null;
  partenaire_referent: string | null;
  type_lieu: string | null;
  heure_evenement: string | null;
  nom_club: string | null;
  qualite_lieu: number | null;
  nb_adherents: number | null;
  nb_invites: number | null;
  nb_no_show: number | null;
  nb_participants: number | null;
  nb_rdv_pris: number | null;
  photos: string[] | null;
}

export function AuditDetailView({ auditId, typeEvenement, open, onClose, partenaire, date, lieu, auditeur, note }: AuditDetailViewProps) {
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [config, setConfig] = useState<AuditTypeConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    Promise.all([
      supabase.from("audit_details").select("*").eq("audit_id", auditId).single(),
      fetchAuditConfig(typeEvenement),
    ]).then(([{ data: detailRow }, cfg]) => {
      if (detailRow) {
        setDetail({
          ...detailRow,
          items: (detailRow.items as any) ?? {},
          photos: (detailRow.photos as string[]) ?? [],
        });
      }
      setConfig(cfg);
      setLoading(false);
    });
  }, [open, auditId, typeEvenement]);

  const allItems = config?.categories.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, categoryName: cat.name }))
  ) ?? [];

  const ratioInvParticipants =
    detail?.nb_invites && detail?.nb_participants && detail.nb_participants > 0
      ? ((detail.nb_invites / detail.nb_participants) * 100).toFixed(1)
      : null;
  const ratioRdvInvites =
    detail?.nb_rdv_pris != null && detail?.nb_invites && detail.nb_invites > 0
      ? ((detail.nb_rdv_pris / detail.nb_invites) * 100).toFixed(1)
      : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <DialogTitle>Détail de l'audit</DialogTitle>
            <AuditPdfExport
              auditId={auditId}
              partenaire={partenaire ?? ""}
              typeEvenement={typeEvenement}
              date={date ?? ""}
              lieu={lieu}
              auditeur={auditeur ?? ""}
              note={note}
            />
          </div>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground animate-pulse py-8 text-center text-sm">
            Chargement…
          </p>
        ) : !detail ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Aucun détail trouvé pour cet audit.
          </p>
        ) : (
          <div className="space-y-6">
            {/* ── Informations générales ── */}
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-4">
                Informations générales
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
                <InfoField label="Partenaire audité" value={partenaire} />
                <InfoField label="Partenaire référent" value={detail.partenaire_referent} />
                <InfoField label="Auditeur" value={auditeur} />
                <InfoField label="Ville" value={lieu} />
                <InfoField label="Lieu" value={detail.type_lieu} />
                <InfoField label="Qualité du lieu" value={detail.qualite_lieu != null ? `${"★".repeat(detail.qualite_lieu)}${"☆".repeat(5 - detail.qualite_lieu)}` : null} />
                <InfoField label="Date" value={date} />
                <InfoField label="Heure" value={detail.heure_evenement} />
                {detail.nom_club && <InfoField label="Club" value={detail.nom_club} />}
              </div>

              {/* Stats */}
              {(detail.nb_adherents != null || detail.nb_invites != null || detail.nb_participants != null) && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Statistiques de l'événement</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                    {detail.nb_adherents != null && <StatField label="Adhérents" value={detail.nb_adherents} />}
                    {detail.nb_invites != null && <StatField label="Invités" value={detail.nb_invites} />}
                    {detail.nb_no_show != null && <StatField label="No-show" value={detail.nb_no_show} />}
                    {detail.nb_participants != null && <StatField label="Participants" value={detail.nb_participants} />}
                    {detail.nb_rdv_pris != null && <StatField label="RDV pris" value={detail.nb_rdv_pris} />}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Ratio invités / participants</p>
                      <p className="text-lg font-semibold tabular-nums">{ratioInvParticipants ? `${ratioInvParticipants}%` : "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Ratio RDV pris / invités</p>
                      <p className="text-lg font-semibold tabular-nums">{ratioRdvInvites ? `${ratioRdvInvites}%` : "—"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Score global */}
              <div className="mt-4 flex gap-3 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  Total : {detail.total_points ?? "—"} pts
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Note : {detail.note_sur_10 ?? "—"}/10
                </Badge>
              </div>
            </div>

            {/* ── Items par catégorie ── */}
            {config?.categories.map((cat) => {
              const catItems = allItems.filter((i) => i.categoryId === cat.id);
              if (catItems.length === 0) return null;
              return (
                <div key={cat.id} className="space-y-3">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                    {cat.name}
                  </h2>
                  {catItems.map((item) => {
                    const answer = detail.items[item.id];
                    const score = answer?.score ?? 0;
                    const isMax = score === item.maxPoints;
                    const hasScore = score > 0;
                    const isAutoFilled = !!item.autoField;

                    return (
                      <Card key={item.id} className={cn(
                        "transition-all border-l-4",
                        isMax ? "border-l-emerald-500" : hasScore ? "border-l-amber-500" : "border-l-border"
                      )}>
                        <CardContent className="p-3 sm:p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5">
                                <span className="text-[11px] sm:text-xs text-muted-foreground font-mono">
                                  {allItems.findIndex((i) => i.id === item.id) + 1}.
                                </span>
                                <Badge variant="secondary" className="text-[10px]">{item.categoryName}</Badge>
                                <Badge className={cn(
                                  "text-[10px]",
                                  isMax ? "bg-emerald-600 text-white" : hasScore ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                                )}>
                                  {score}/{item.maxPoints} pts
                                </Badge>
                                {isAutoFilled && (
                                  <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                    <FontAwesomeIcon icon={faLock} className="h-2 w-2" /> Auto
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight">{item.title}</h3>
                            </div>
                            <div className="flex-shrink-0">
                              {isMax ? (
                                <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <FontAwesomeIcon icon={faXmark} className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          </div>

                          {/* Description & condition */}
                          {(item.description || item.condition) && (
                            <div className="rounded-md border border-border bg-muted/30 p-2.5 sm:p-3 space-y-1.5">
                              {item.description && (
                                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{item.description}</p>
                              )}
                              {item.condition && (
                                <div className="flex items-start gap-1.5 text-xs sm:text-sm text-foreground/70 leading-relaxed">
                                  <FontAwesomeIcon icon={faCircleInfo} className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span className="whitespace-pre-line">{item.condition}</span>
                                </div>
                              )}
                              {item.scoringRules && (
                                <p className="text-xs sm:text-sm text-foreground/70 pt-1.5 border-t border-border whitespace-pre-line leading-relaxed">
                                  {item.scoringRules}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Checklist display */}
                          {item.inputType === "checklist" && item.checklistItems && answer?.checklist && (
                            <div className="space-y-1.5">
                              {item.checklistItems.map((label, idx) => {
                                const checked = answer.checklist?.[idx] ?? false;
                                return (
                                  <div key={idx} className={cn(
                                    "flex items-start gap-2.5 rounded-md border p-2.5 text-xs sm:text-sm",
                                    checked ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"
                                  )}>
                                    <FontAwesomeIcon
                                      icon={checked ? faCheck : faXmark}
                                      className={cn("h-3 w-3 mt-0.5", checked ? "text-emerald-500" : "text-muted-foreground")}
                                    />
                                    <span className="leading-relaxed">{label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Number value */}
                          {item.inputType === "number" && answer?.rawValue !== undefined && (
                            <div className="rounded-md border border-border bg-muted/30 p-2.5">
                              <span className="text-xs text-muted-foreground">Valeur saisie : </span>
                              <span className="text-sm font-semibold">{answer.rawValue}</span>
                            </div>
                          )}

                          {/* Comment */}
                          {answer?.comment && (
                            <div className="rounded-md border border-border bg-muted/20 p-2.5">
                              <span className="text-xs text-muted-foreground block mb-0.5">Commentaire</span>
                              <p className="text-sm text-foreground">{answer.comment}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })}

            {/* ── Photos ── */}
            {detail.photos && detail.photos.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                  <FontAwesomeIcon icon={faImage} className="h-3.5 w-3.5" />
                  Photos ({detail.photos.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {detail.photos.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={url}
                        alt={`Photo ${idx + 1}`}
                        className="rounded-lg border border-border object-cover w-full aspect-video hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
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

function StatField({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
      <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
