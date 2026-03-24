import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StepZeroForm, StepZeroData } from "@/components/audit-stepper/StepZeroForm";
import { AuditItemCard, ItemAnswer } from "@/components/audit-stepper/AuditItemCard";
import { AuditPhotoUpload } from "@/components/audit-stepper/AuditPhotoUpload";
import { fetchAuditConfig, AuditTypeConfig } from "@/data/auditItems";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MOIS_ORDRE } from "@/data/audits";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faCamera } from "@fortawesome/free-solid-svg-icons";

/** Count how many required info fields are filled */
function countInfoFilled(data: StepZeroData | undefined): number {
  if (!data) return 0;
  let count = 0;
  if (data.partenaireAudite.trim()) count++;
  if (data.auditeur.trim()) count++;
  if (data.lieu.trim()) count++;
  if (data.typeLieu.trim()) count++;
  if (data.dateEvenement) count++;
  return count;
}

const INFO_REQUIRED_FIELDS = 5; // partenaire, auditeur, lieu, typeLieu, date

export default function AuditForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeEvenement = searchParams.get("type") || "RD Présentiel";

  const [config, setConfig] = useState<AuditTypeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [phase, setPhase] = useState<"main" | "photos" | "saving">("main");
  const [stepZeroData, setStepZeroData] = useState<StepZeroData | undefined>();
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const itemsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAuditConfig(typeEvenement).then((c) => {
      setConfig(c);
      setConfigLoading(false);
    });
  }, [typeEvenement]);

  const allItems = useMemo(
    () =>
      config?.categories.flatMap((cat) =>
        cat.items.map((item) => ({ ...item, categoryName: cat.name }))
      ) ?? [],
    [config]
  );

  const totalItems = allItems.length;
  const answeredCount = Object.keys(answers).length;
  const infoFilled = countInfoFilled(stepZeroData);

  // Global progress: info fields + audit items
  const totalExpected = INFO_REQUIRED_FIELDS + totalItems;
  const totalFilled = infoFilled + answeredCount;
  const progress = totalExpected > 0 ? (totalFilled / totalExpected) * 100 : 0;

  const infoValid = infoFilled === INFO_REQUIRED_FIELDS;

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

  const handleFinish = useCallback(async () => {
    setPhase("saving");
    await saveAudit(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  const uploadPhotos = async (auditId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${auditId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("audit-photos")
        .upload(path, file, { contentType: file.type });
      if (!error) {
        const { data } = supabase.storage.from("audit-photos").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const saveAudit = async (finalAnswers: Record<string, ItemAnswer>) => {
    if (!stepZeroData || !config) return;

    const totalPoints = Object.values(finalAnswers).reduce((s, a) => s + a.score, 0);
    const noteSur10 = +((totalPoints / config.maxPoints) * 10).toFixed(2);

    const dateStr = stepZeroData.dateEvenement
      ? format(stepZeroData.dateEvenement, "yyyy-MM-dd")
      : new Date().toISOString().slice(0, 10);

    const month = stepZeroData.dateEvenement
      ? stepZeroData.dateEvenement.getMonth()
      : new Date().getMonth();
    const moisVersementIdx = Math.min(month + 1, 11);
    const moisVersement = MOIS_ORDRE[moisVersementIdx];

    const { data: auditRow, error: auditErr } = await supabase
      .from("audits")
      .insert({
        date: dateStr,
        partenaire: stepZeroData.partenaireAudite,
        lieu: stepZeroData.lieu,
        auditeur: stepZeroData.auditeur,
        type_evenement: typeEvenement,
        note: noteSur10,
        mois_versement: moisVersement,
        statut: "OK",
      })
      .select()
      .single();

    if (auditErr) {
      toast.error("Erreur lors de la création de l'audit");
      console.error(auditErr);
      setPhase("main");
      return;
    }

    let photoUrls: string[] = [];
    if (photos.length > 0) {
      photoUrls = await uploadPhotos(auditRow.id);
    }

    const itemsJson: Record<string, any> = {};
    Object.entries(finalAnswers).forEach(([id, ans]) => {
      itemsJson[id] = {
        score: ans.score,
        ...(ans.comment && { comment: ans.comment }),
        ...(ans.checklist && { checklist: ans.checklist }),
        ...(ans.rawValue !== undefined && { rawValue: ans.rawValue }),
      };
    });

    const { error: detailErr } = await supabase.from("audit_details").insert({
      audit_id: auditRow.id,
      partenaire_referent: stepZeroData.partenaireReferent || null,
      type_lieu: stepZeroData.typeLieu || null,
      qualite_lieu: stepZeroData.qualiteLieu ?? null,
      heure_evenement: stepZeroData.heureEvenement || null,
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
    });

    if (detailErr) {
      toast.error("Erreur lors de l'enregistrement des détails");
      console.error(detailErr);
      setPhase("main");
      return;
    }

    toast.success(`Audit enregistré — Note : ${noteSur10}/10`);
    navigate("/audits");
  };

  if (configLoading) {
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
      <div className="py-6 sm:py-10 max-w-2xl mx-auto px-4">
        {/* Header + progress */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="text-xs">
              {typeEvenement}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {totalFilled} / {totalExpected} champs renseignés
            </span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {phase === "photos"
              ? "Photos de l'audit"
              : phase === "saving"
              ? "Enregistrement..."
              : "Nouvel audit"}
          </h1>
          <Progress value={progress} className="mt-3 h-2" />
        </div>

        {phase === "main" && (
          <div className="space-y-8">
            {/* Section info — always visible, scrollable */}
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

            {/* Audit items — shown below info */}
            <div ref={itemsSectionRef} className="space-y-6">
              {categories.map((cat) => {
                const catItems = allItems.filter((i) => i.categoryId === cat.id);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat.id} className="space-y-3">
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
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

            {/* Action button */}
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
