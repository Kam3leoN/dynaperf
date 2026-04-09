import { useState, useEffect } from "react";
import { resolveAuditPhotoUrls } from "@/lib/storageUtils";
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
import { ReportSignatures } from "@/components/ReportSignatures";
import { cn } from "@/lib/utils";
import { RichHtmlView } from "@/components/ui/rich-html-view";

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
  items: Record<string, { score: number; comment?: string; checklist?: boolean[]; rawValue?: number; notApplicable?: boolean }>;
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
  signature_auditeur: string | null;
  signature_audite: string | null;
}

interface CustomFieldDef {
  id: string;
  field_label: string;
  field_type: string;
  field_options: Record<string, any> | null;
  sort_order: number;
  col_span: number;
}

export function AuditDetailView({ auditId, typeEvenement, open, onClose, partenaire, date, lieu, auditeur, note }: AuditDetailViewProps) {
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [config, setConfig] = useState<AuditTypeConfig | null>(null);
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    Promise.all([
      supabase.from("audit_details").select("*").eq("audit_id", auditId).single(),
      fetchAuditConfig(typeEvenement),
      supabase.from("audit_type_custom_fields").select("*").eq("audit_type_key", typeEvenement).order("sort_order"),
    ]).then(async ([{ data: detailRow }, cfg, { data: fields }]) => {
      if (detailRow) {
        const rawPhotos = (detailRow.photos as string[]) ?? [];
        const resolvedPhotos = await resolveAuditPhotoUrls(rawPhotos);
        setDetail({
          ...detailRow,
          items: (detailRow.items as DetailData["items"]) ?? {},
          photos: resolvedPhotos,
        });
      }
      setConfig(cfg);
      setCustomFields((fields as CustomFieldDef[]) || []);
      setLoading(false);
    });
  }, [open, auditId, typeEvenement]);

  const allItems = config?.categories.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, categoryName: cat.name }))
  ) ?? [];

  // Helper to check if an item is marked as N/A
  const isItemNA = (itemId: string) => detail?.items[itemId]?.notApplicable === true;

  // Get custom field values from items JSON
  const itemsPayload = detail?.items as Record<string, unknown> | undefined;
  const customFieldValues: Record<string, any> =
    (itemsPayload?.__custom_fields as Record<string, any> | undefined) || {};

  // Helper to get display value for a custom field
  const getFieldDisplayValue = (field: CustomFieldDef): string | null => {
    const val = customFieldValues[field.id];
    if (val === undefined || val === null || val === "") return null;

    switch (field.field_type) {
      case "qualite_lieu_rating":
      case "qualite_rating":
      case "rating": {
        const n = typeof val === "number" ? val : parseInt(val) || 0;
        return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
      }
      case "stat_percent":
        return `${val} %`;
      case "stat_sum": {
        const prefix = val > 0 ? "+" : "";
        return `${prefix}${val}`;
      }
      case "stat_diff":
        return `${val}`;
      case "date_picker":
        if (val instanceof Date) return val.toLocaleDateString("fr-FR");
        if (typeof val === "string") {
          try { return new Date(val).toLocaleDateString("fr-FR"); } catch { return val; }
        }
        return String(val);
      case "checkbox":
        return Array.isArray(val) ? val.join(", ") : String(val);
      default:
        return String(val);
    }
  };

  // Determine field display type
  const isStatField = (ft: string) => ["number", "stat_percent", "stat_sum", "stat_diff"].includes(ft);

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
            {/* ── Informations générales (dynamic) ── */}
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-4">
                Informations générales
              </h2>

              {customFields.length > 0 ? (
                <>
                  {/* Info fields (non-stat) */}
                  {(() => {
                    const infoFields = customFields.filter(f => !isStatField(f.field_type));
                    if (infoFields.length === 0) return null;
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
                        {infoFields.map(f => {
                          const displayVal = getFieldDisplayValue(f);
                          return <InfoField key={f.id} label={f.field_label} value={displayVal} />;
                        })}
                      </div>
                    );
                  })()}

                  {/* Stat fields */}
                  {(() => {
                    const statFields = customFields.filter(f => isStatField(f.field_type));
                    if (statFields.length === 0) return null;
                    return (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground mb-3">Statistiques de l'événement</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                          {statFields.map(f => {
                            const val = customFieldValues[f.id];
                            if (val === undefined || val === null || val === "") return null;
                            return <StatField key={f.id} label={f.field_label} value={val} fieldType={f.field_type} />;
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                /* Fallback: legacy hardcoded fields for old audits */
                <>
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
                    </div>
                  )}
                </>
              )}

            </div>

            {/* ── Items par catégorie ── */}
            {config?.categories.map((cat) => {
              const catItems = allItems.filter((i) => i.categoryId === cat.id);
              if (catItems.length === 0) return null;
              const applicableItems = catItems.filter(i => !isItemNA(i.id));
              const catMaxPoints = applicableItems.reduce((sum, i) => sum + i.maxPoints, 0);
              const catObtained = applicableItems.reduce((sum, i) => sum + (detail.items[i.id]?.score ?? 0), 0);
              return (
                <div key={cat.id} className="space-y-3">
                  <h2 className="text-base sm:text-lg font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center justify-between gap-2">
                    <span>{cat.name}</span>
                    <Badge variant="outline" className="text-[11px] tabular-nums font-semibold">{catObtained}/{catMaxPoints} pts</Badge>
                  </h2>
                  {catItems.map((item) => {
                    const answer = detail.items[item.id];
                    const na = answer?.notApplicable === true;
                    const score = answer?.score ?? 0;
                    const isMax = !na && score === item.maxPoints;
                    const hasScore = !na && score > 0;
                    const isAutoFilled = !!item.autoField;

                    return (
                      <Card key={item.id} className={cn(
                        "transition-all border-l-4",
                        na ? "border-l-border opacity-60" :
                        isMax ? "border-l-emerald-500" : hasScore ? "border-l-amber-500" : "border-l-border"
                      )}>
                        <CardContent className="p-3 sm:p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="text-sm sm:text-base font-semibold text-muted-foreground font-mono">
                              {allItems.findIndex((i) => i.id === item.id) + 1}.
                            </span>
                            <span className="text-sm sm:text-base font-semibold text-foreground leading-tight">{item.title}</span>
                            <span className="flex-1" />
                            <Badge className={cn(
                              "text-xs sm:text-sm",
                              na ? "bg-muted text-muted-foreground" :
                              isMax ? "bg-emerald-600 text-white" : hasScore ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                            )}>
                              {na ? "N/A" : `${score}/${item.maxPoints} pts`}
                            </Badge>
                            {isAutoFilled && !na && (
                              <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                                <FontAwesomeIcon icon={faLock} className="h-2 w-2" /> Auto
                              </Badge>
                            )}
                          </div>

                          {/* Description, condition, barème */}
                          {(item.description || item.condition || item.scoringRules) && (
                            <div className="rounded-md border border-border bg-muted/30 p-2.5 sm:p-3 space-y-1.5">
                              {item.description && (
                                <RichHtmlView content={item.description} className="text-xs sm:text-sm text-muted-foreground" />
                              )}
                              {item.condition && (
                                <div className="flex items-start gap-1.5 text-xs sm:text-sm text-foreground/70 leading-relaxed">
                                  <FontAwesomeIcon icon={faCircleInfo} className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <RichHtmlView content={item.condition} className="flex-1 min-w-0" />
                                </div>
                              )}
                              {item.scoringRules && (
                                <RichHtmlView
                                  content={item.scoringRules}
                                  className="text-xs sm:text-sm text-foreground/70 pt-1.5 border-t border-border"
                                />
                              )}
                            </div>
                          )}
                          {item.interets && (
                            <div className="rounded-md border border-border bg-emerald-500/5 p-2.5">
                              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block mb-0.5">Quel intérêt ?</span>
                              <RichHtmlView content={item.interets} className="text-xs sm:text-sm text-foreground/80" />
                            </div>
                          )}
                          {item.commentYParvenir && (
                            <div className="rounded-md border border-border bg-blue-500/5 p-2.5">
                              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 block mb-0.5">Comment y parvenir ?</span>
                              <RichHtmlView content={item.commentYParvenir} className="text-xs sm:text-sm text-foreground/80" />
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
                              <RichHtmlView content={answer.comment} className="text-sm text-foreground" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })}

            {/* ── Score global + par catégorie ── */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                Résultats
              </h2>
              <div className="flex gap-3 flex-wrap">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  Total : {detail.total_points ?? "—"} pts
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  Note : {detail.note_sur_10 ?? "—"}/10
                </Badge>
              </div>

              {config && config.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.categories.map((cat) => {
                    const catItems = allItems.filter((i) => i.categoryId === cat.id);
                    const applicableCatItems = catItems.filter(i => !isItemNA(i.id));
                    const catMaxPoints = applicableCatItems.reduce((sum, i) => sum + i.maxPoints, 0);
                    const catObtained = applicableCatItems.reduce((sum, i) => sum + (detail.items[i.id]?.score ?? 0), 0);
                    const pct = catMaxPoints > 0 ? Math.round((catObtained / catMaxPoints) * 100) : 0;
                    return (
                      <div key={cat.id} className="flex-1 min-w-[140px] rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                        <p className="text-[11px] font-medium text-muted-foreground truncate">{cat.name}</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-bold tabular-nums text-foreground">{catObtained}</span>
                          <span className="text-xs text-muted-foreground">/ {catMaxPoints} pts</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-destructive"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] tabular-nums text-muted-foreground text-right">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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

            <ReportSignatures
              signers={[
                {
                  label: "Auditeur",
                  name: auditeur,
                  signature: detail.signature_auditeur,
                },
                {
                  label: "Partenaire audité",
                  name: partenaire,
                  signature: detail.signature_audite,
                },
              ]}
            />
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

function StatField({ label, value, fieldType }: { label: string; value: number | string; fieldType?: string }) {
  const isPercent = fieldType === "stat_percent";
  const isSum = fieldType === "stat_sum";
  const numVal = typeof value === "number" ? value : parseFloat(String(value)) || 0;

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
      <p className={cn(
        "text-lg font-bold tabular-nums",
        isSum ? (numVal > 0 ? "text-emerald-600 dark:text-emerald-400" : numVal < 0 ? "text-destructive" : "text-foreground") : "text-foreground"
      )}>
        {isPercent ? `${value} %` : isSum && numVal > 0 ? `+${value}` : String(value)}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
