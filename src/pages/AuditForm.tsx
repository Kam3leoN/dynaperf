import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StepZeroForm, StepZeroData } from "@/components/audit-stepper/StepZeroForm";
import { AuditItemDialog, ItemAnswer } from "@/components/audit-stepper/AuditItemDialog";
import { fetchAuditConfig, AuditTypeConfig, AuditItemDef } from "@/data/auditItems";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MOIS_ORDRE } from "@/data/audits";

export default function AuditForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeEvenement = searchParams.get("type") || "RD Présentiel";

  const [config, setConfig] = useState<AuditTypeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [phase, setPhase] = useState<"info" | "items" | "saving">("info");
  const [stepZeroData, setStepZeroData] = useState<StepZeroData | undefined>();
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({});

  // Load config from DB
  useEffect(() => {
    fetchAuditConfig(typeEvenement).then((c) => {
      setConfig(c);
      setConfigLoading(false);
    });
  }, [typeEvenement]);

  // Flatten items across categories
  const allItems: (AuditItemDef & { categoryName: string })[] =
    config?.categories.flatMap((cat) =>
      cat.items.map((item) => ({ ...item, categoryName: cat.name }))
    ) ?? [];

  const totalItems = allItems.length;
  const progress = phase === "info" ? 0 : ((currentItemIdx + 1) / totalItems) * 100;

  const handleStepZeroSubmit = useCallback((data: StepZeroData) => {
    setStepZeroData(data);
    setPhase("items");
    setCurrentItemIdx(0);
  }, []);

  const handleItemSubmit = useCallback(
    async (answer: ItemAnswer) => {
      const newAnswers = { ...answers, [allItems[currentItemIdx].id]: answer };
      setAnswers(newAnswers);

      if (currentItemIdx < totalItems - 1) {
        setCurrentItemIdx(currentItemIdx + 1);
      } else {
        setPhase("saving");
        await saveAudit(newAnswers);
      }
    },
    [answers, currentItemIdx, totalItems, allItems]
  );

  const handleBack = useCallback(() => {
    if (currentItemIdx === 0) {
      setPhase("info");
    } else {
      setCurrentItemIdx(currentItemIdx - 1);
    }
  }, [currentItemIdx]);

  const saveAudit = async (finalAnswers: Record<string, ItemAnswer>) => {
    if (!stepZeroData || !config) return;

    const totalPoints = Object.values(finalAnswers).reduce((s, a) => s + a.score, 0);
    const noteSur10 = +(totalPoints / config.maxPoints * 10).toFixed(2);

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
      setPhase("items");
      return;
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
    });

    if (detailErr) {
      toast.error("Erreur lors de l'enregistrement des détails");
      console.error(detailErr);
      setPhase("items");
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
          <p className="text-muted-foreground">Aucune grille d'audit configurée pour « {typeEvenement} ».</p>
          <button onClick={() => navigate("/audits/new")} className="text-primary underline text-sm">
            Retour
          </button>
        </div>
      </AppLayout>
    );
  }

  const currentItem = allItems[currentItemIdx];

  return (
    <AppLayout>
      <div className="py-8 sm:py-12 max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className="text-xs">
              {typeEvenement}
            </Badge>
            {phase === "items" && currentItem && (
              <>
                <Badge variant="secondary" className="text-xs">
                  {currentItem.categoryName}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Item {currentItemIdx + 1} / {totalItems}
                </span>
              </>
            )}
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {phase === "info"
              ? "Informations générales"
              : phase === "saving"
              ? "Enregistrement..."
              : currentItem?.title ?? ""}
          </h1>
          {phase === "items" && (
            <Progress value={progress} className="mt-3 h-2" />
          )}
        </div>

        {phase === "info" && (
          <StepZeroForm
            typeEvenement={typeEvenement}
            initialData={stepZeroData}
            onSubmit={handleStepZeroSubmit}
          />
        )}

        {phase === "items" && currentItem && (
          <AuditItemDialog
            key={currentItem.id}
            item={currentItem}
            stepIndex={currentItemIdx + 1}
            totalSteps={totalItems}
            categoryName={currentItem.categoryName}
            open={true}
            initialAnswer={answers[currentItem.id]}
            onSubmit={handleItemSubmit}
            onBack={handleBack}
            onClose={() => navigate("/audits/new")}
            isLast={currentItemIdx === totalItems - 1}
            stepZeroData={stepZeroData}
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
