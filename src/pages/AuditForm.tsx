import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StepZeroForm, StepZeroData } from "@/components/audit-stepper/StepZeroForm";
import { AuditItemCard, ItemAnswer } from "@/components/audit-stepper/AuditItemCard";
import { AuditPhotoUpload } from "@/components/audit-stepper/AuditPhotoUpload";
import { fetchAuditConfig, fetchAuditConfigById, AuditTypeConfig } from "@/data/auditItems";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MOIS_ORDRE } from "@/data/audits";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faCamera } from "@fortawesome/free-solid-svg-icons";

export default function AuditForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { auditId } = useParams<{ auditId: string }>();
  const typeEvenement = searchParams.get("type") || "RD Présentiel";
  const typeId = searchParams.get("typeId") || "";
  const isEditMode = !!auditId;

  const [config, setConfig] = useState<AuditTypeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [phase, setPhase] = useState<"main" | "photos" | "saving">("main");
  const [stepZeroData, setStepZeroData] = useState<StepZeroData | undefined>();
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [signatureAuditeur, setSignatureAuditeur] = useState<string | null>(null);
  const [signatureAudite, setSignatureAudite] = useState<string | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);
  const [requiredFieldIds, setRequiredFieldIds] = useState<string[]>([]);
  const itemsSectionRef = useRef<HTMLDivElement>(null);

  // Load required custom field IDs for progress tracking
  useEffect(() => {
    supabase
      .from("audit_type_custom_fields")
      .select("id")
      .eq("audit_type_key", typeEvenement)
      .eq("is_required", true)
      .then(({ data }) => setRequiredFieldIds(data?.map((f) => f.id) ?? []));
  }, [typeEvenement]);

  // Load config - prefer typeId if provided, fallback to typeKey
  useEffect(() => {
    const loadConfig = typeId
      ? fetchAuditConfigById(typeId)
      : fetchAuditConfig(typeEvenement);
    loadConfig.then((c) => {
      setConfig(c);
      setConfigLoading(false);
    });
  }, [typeEvenement, typeId]);

  // Load existing audit data for edit mode
  useEffect(() => {
    if (!isEditMode || !auditId || editLoaded) return;
    
    const loadExistingAudit = async () => {
      const [{ data: audit }, { data: detail }] = await Promise.all([
        supabase.from("audits").select("*").eq("id", auditId).single(),
        supabase.from("audit_details").select("*").eq("audit_id", auditId).single(),
      ]);

      if (audit) {
        const customFieldValues = (detail?.items as any)?.__custom_fields || {};
        
        setStepZeroData({
          partenaireAudite: audit.partenaire,
          partenaireReferent: detail?.partenaire_referent || "",
          auditeur: audit.auditeur,
          lieu: audit.lieu || "",
          typeLieu: detail?.type_lieu || "",
          dateEvenement: new Date(audit.date),
          heureEvenement: detail?.heure_evenement || "",
          heureDebutPrevue: detail?.heure_debut_prevue || "",
          heureFinPrevue: detail?.heure_fin_prevue || "",
          heureDebutReelle: detail?.heure_debut_reelle || "",
          heureFinReelle: detail?.heure_fin_reelle || "",
          nomClub: detail?.nom_club || undefined,
          qualiteLieu: detail?.qualite_lieu ?? undefined,
          nbAdherents: detail?.nb_adherents ?? undefined,
          nbInvites: detail?.nb_invites ?? undefined,
          nbNoShow: detail?.nb_no_show ?? undefined,
          nbParticipants: detail?.nb_participants ?? undefined,
          nbRdvPris: detail?.nb_rdv_pris ?? undefined,
          customFieldValues,
        });

        if (detail?.items) {
          const itemsData = detail.items as Record<string, any>;
          const loadedAnswers: Record<string, ItemAnswer> = {};
          Object.entries(itemsData).forEach(([id, ans]) => {
            if (id === "__custom_fields") return;
            loadedAnswers[id] = {
              score: ans.score ?? 0,
              touched: true,
              comment: ans.comment,
              checklist: ans.checklist,
              rawValue: ans.rawValue,
              notApplicable: ans.notApplicable ?? false,
            };
          });
          setAnswers(loadedAnswers);
        }

        if (detail?.photos) {
          setExistingPhotos(detail.photos as string[]);
        }
        if ((detail as any)?.signature_auditeur) setSignatureAuditeur((detail as any).signature_auditeur);
        if ((detail as any)?.signature_audite) setSignatureAudite((detail as any).signature_audite);
      }
      setEditLoaded(true);
    };
    loadExistingAudit();
  }, [isEditMode, auditId, editLoaded]);

  const allItems = useMemo(
    () =>
      config?.categories.flatMap((cat) =>
        cat.items.map((item) => ({ ...item, categoryName: cat.name }))
      ) ?? [],
    [config]
  );

  const totalItems = allItems.length;
  const answeredCount = Object.values(answers).filter((a) => a.touched).length;

  // Count filled required custom fields
  const infoFilled = requiredFieldIds.filter((id) => {
    const val = stepZeroData?.customFieldValues?.[id];
    return val !== undefined && val !== null && val !== "";
  }).length;

  const totalExpected = requiredFieldIds.length + totalItems;
  const totalFilled = infoFilled + answeredCount;
  const progress = totalExpected > 0 ? (totalFilled / totalExpected) * 100 : 0;

  const infoValid = requiredFieldIds.length === 0 || infoFilled === requiredFieldIds.length;

  const handleStepZeroChange = useCallback((data: StepZeroData) => {
    setStepZeroData(data);
  }, []);

  const handleItemChange = useCallback((itemId: string, answer: ItemAnswer) => {
    setAnswers((prev) => ({ ...prev, [itemId]: answer }));
  }, []);

  const handleGoToPhotos = useCallback(() => {
    setPhase("photos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handlePhotosBack = useCallback(() => {
    setPhase("main");
  }, []);

  const handleFinish = async () => {
    try {
      setPhase("saving");
      await saveAudit(answers);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement des photos de l'audit");
      setPhase("main");
    }
  };

  const uploadPhotos = async (id: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("audit-photos")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      urls.push(path);
    }
    return urls;
  };

  const saveAudit = async (finalAnswers: Record<string, ItemAnswer>) => {
    if (!stepZeroData || !config) return;

    const applicableAnswers = Object.entries(finalAnswers).filter(([, a]) => !a.notApplicable);
    const totalPoints = applicableAnswers.reduce((s, [, a]) => s + a.score, 0);
    const applicableMaxPoints = allItems.filter(i => !finalAnswers[i.id]?.notApplicable).reduce((s, i) => s + i.maxPoints, 0);
    const noteSur10 = applicableMaxPoints > 0 ? +((totalPoints / applicableMaxPoints) * 10).toFixed(2) : 0;

    const dateStr = stepZeroData.dateEvenement
      ? format(stepZeroData.dateEvenement, "yyyy-MM-dd")
      : new Date().toISOString().slice(0, 10);

    const month = stepZeroData.dateEvenement
      ? stepZeroData.dateEvenement.getMonth()
      : new Date().getMonth();
    const moisVersementIdx = Math.min(month + 1, 11);
    const moisVersement = MOIS_ORDRE[moisVersementIdx];

    const auditPayload = {
      date: dateStr,
      partenaire: stepZeroData.partenaireAudite || "—",
      lieu: stepZeroData.lieu,
      auditeur: stepZeroData.auditeur || "—",
      type_evenement: typeEvenement,
      note: noteSur10,
      mois_versement: moisVersement,
      statut: "OK" as const,
    };

    let targetAuditId: string;

    if (isEditMode && auditId) {
      const { error: auditErr } = await supabase
        .from("audits")
        .update(auditPayload)
        .eq("id", auditId);
      if (auditErr) {
        toast.error("Erreur lors de la modification de l'audit");
        console.error(auditErr);
        setPhase("main");
        return;
      }
      targetAuditId = auditId;
    } else {
      const { data: auditRow, error: auditErr } = await supabase
        .from("audits")
        .insert(auditPayload)
        .select()
        .single();
      if (auditErr) {
        toast.error("Erreur lors de la création de l'audit");
        console.error(auditErr);
        setPhase("main");
        return;
      }
      targetAuditId = auditRow.id;
    }

    let photoUrls: string[] = [...existingPhotos];
    if (photos.length > 0) {
      const newUrls = await uploadPhotos(targetAuditId);
      photoUrls = [...photoUrls, ...newUrls];
    }

    const itemsJson: Record<string, any> = {};
    Object.entries(finalAnswers).forEach(([id, ans]) => {
      itemsJson[id] = {
        score: ans.score,
        ...(ans.comment && { comment: ans.comment }),
        ...(ans.checklist && { checklist: ans.checklist }),
        ...(ans.rawValue !== undefined && { rawValue: ans.rawValue }),
        ...(ans.notApplicable && { notApplicable: true }),
      };
    });
    if (stepZeroData.customFieldValues && Object.keys(stepZeroData.customFieldValues).length > 0) {
      itemsJson["__custom_fields"] = stepZeroData.customFieldValues;
    }

    const detailPayload = {
      audit_id: targetAuditId,
      partenaire_referent: stepZeroData.partenaireReferent || null,
      type_lieu: stepZeroData.typeLieu || null,
      qualite_lieu: stepZeroData.qualiteLieu ?? null,
      heure_evenement: stepZeroData.heureEvenement || null,
      heure_debut_prevue: stepZeroData.heureDebutPrevue || null,
      heure_fin_prevue: stepZeroData.heureFinPrevue || null,
      heure_debut_reelle: stepZeroData.heureDebutReelle || null,
      heure_fin_reelle: stepZeroData.heureFinReelle || null,
      nom_club: stepZeroData.nomClub || null,
      nb_adherents: stepZeroData.nbAdherents ?? null,
      nb_invites: stepZeroData.nbInvites ?? null,
      nb_no_show: stepZeroData.nbNoShow ?? null,
      nb_participants: stepZeroData.nbParticipants ?? null,
      nb_rdv_pris: stepZeroData.nbRdvPris ?? null,
      items: itemsJson,
      total_points: totalPoints,
      note_sur_10: noteSur10,
      photos: photoUrls,
      signature_auditeur: signatureAuditeur,
      signature_audite: signatureAudite,
    } as any;

    if (isEditMode) {
      const { data: existingDetail } = await supabase
        .from("audit_details")
        .select("id")
        .eq("audit_id", targetAuditId)
        .single();

      if (existingDetail) {
        const { error: detailErr } = await supabase
          .from("audit_details")
          .update(detailPayload)
          .eq("audit_id", targetAuditId);
        if (detailErr) {
          toast.error("Erreur lors de la modification des détails");
          console.error(detailErr);
          setPhase("main");
          return;
        }
      } else {
        const { error: detailErr } = await supabase.from("audit_details").insert(detailPayload);
        if (detailErr) {
          toast.error("Erreur lors de l'enregistrement des détails");
          console.error(detailErr);
          setPhase("main");
          return;
        }
      }
    } else {
      const { error: detailErr } = await supabase.from("audit_details").insert(detailPayload);
      if (detailErr) {
        toast.error("Erreur lors de l'enregistrement des détails");
        console.error(detailErr);
        setPhase("main");
        return;
      }
    }

    toast.success(isEditMode ? `Audit modifié — Note : ${noteSur10}/10` : `Audit enregistré — Note : ${noteSur10}/10`);
    navigate("/audits");
  };

  if (configLoading || (isEditMode && !editLoaded)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground animate-pulse">Chargement de la grille d'audit…</p>
        </div>
      </AppLayout>
    );
  }

  if (!config) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-muted-foreground">
            Aucune grille d'audit configurée pour « {typeEvenement} ».
          </p>
          <button onClick={() => navigate("/audits/new")} className="text-primary underline text-sm">
            Retour
          </button>
        </div>
      </AppLayout>
    );
  }

  const categories = config.categories;

  return (
    <AppLayout>
      {/* Sticky progress bar */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2.5 -mx-4 lg:-mx-6 mb-6">
        <div className="flex items-center gap-3 mb-1.5">
          <Badge variant="outline" className="text-xs">
            {typeEvenement}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {totalFilled} / {totalExpected} champs renseignés
          </span>
          <span className="ml-auto text-xs font-semibold text-foreground tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      <div className="px-0">
        <h1 className="text-xl font-semibold text-foreground mb-6">
          {phase === "photos"
            ? "Photos de l'audit"
            : phase === "saving"
            ? "Enregistrement..."
            : isEditMode
            ? "Modifier l'audit"
            : "Nouvel audit"}
        </h1>

        {phase === "main" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-4">
                Informations générales
              </h2>
              <StepZeroForm
                typeEvenement={typeEvenement}
                initialData={stepZeroData}
                onSubmit={handleStepZeroChange}
                hideSubmitButton
              />
            </div>

            <div ref={itemsSectionRef} className="space-y-6">
              {categories.map((cat) => {
                const catItems = allItems.filter((i) => i.categoryId === cat.id);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat.id} className="space-y-3">
                    <h2 className="text-base sm:text-lg font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                      {cat.name}
                    </h2>
                    {catItems.map((item) => {
                      const globalIdx = allItems.findIndex((i) => i.id === item.id);
                      return (
                        <AuditItemCard
                          key={item.id}
                          item={item}
                          index={globalIdx}
                          categoryName={cat.name}
                          answer={answers[item.id]}
                          onChange={(ans) => handleItemChange(item.id, ans)}
                          stepZeroData={stepZeroData}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* ── Score live par catégorie ── */}
            {config && categories.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                  Résultats
                </h2>
                <div className="flex gap-3 flex-wrap mb-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1 tabular-nums">
                    Total : {Object.entries(answers).filter(([,a]) => !a.notApplicable).reduce((s, [,a]) => s + a.score, 0)} / {allItems.filter(i => !answers[i.id]?.notApplicable).reduce((s, i) => s + i.maxPoints, 0)} pts
                  </Badge>
                  <Badge variant="secondary" className="text-sm px-3 py-1 tabular-nums">
                    Note : {(() => {
                      const appMax = allItems.filter(i => !answers[i.id]?.notApplicable).reduce((s, i) => s + i.maxPoints, 0);
                      const appScore = Object.entries(answers).filter(([,a]) => !a.notApplicable).reduce((s, [,a]) => s + a.score, 0);
                      return appMax > 0 ? ((appScore / appMax) * 10).toFixed(1) : "—";
                    })()}/10
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const catItems = allItems.filter((i) => i.categoryId === cat.id);
                    if (catItems.length === 0) return null;
                    const catMaxPoints = catItems.filter(i => !answers[i.id]?.notApplicable).reduce((sum, i) => sum + i.maxPoints, 0);
                    const catObtained = catItems.filter(i => !answers[i.id]?.notApplicable).reduce((sum, i) => sum + (answers[i.id]?.score ?? 0), 0);
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
                            className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] tabular-nums text-muted-foreground text-right">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="pt-4 border-t border-border">
              <Button
                onClick={handleGoToPhotos}
                disabled={!infoValid}
                className="w-full gap-1.5"
              >
                <FontAwesomeIcon icon={faCamera} className="h-3.5 w-3.5" />
                Photos & Finaliser
                <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
              </Button>
              {!infoValid && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Remplis les champs obligatoires (*) pour continuer
                </p>
              )}
            </div>
          </div>
        )}

        {phase === "photos" && (
          <AuditPhotoUpload
            photos={photos}
            onChange={setPhotos}
            onSubmit={handleFinish}
            onBack={handlePhotosBack}
            uploading={false}
            auditeurName={stepZeroData?.auditeur || ""}
            partenaireName={stepZeroData?.partenaireAudite || ""}
            signatureAuditeur={signatureAuditeur}
            onSignatureAuditeurChange={setSignatureAuditeur}
            signatureAudite={signatureAudite}
            onSignatureAuditeChange={setSignatureAudite}
          />
        )}

        {phase === "saving" && (
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground animate-pulse">
              Enregistrement de l'audit en cours…
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
