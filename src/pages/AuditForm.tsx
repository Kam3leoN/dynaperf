import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StepZeroForm, StepZeroData } from "@/components/audit-stepper/StepZeroForm";
import { AuditItemDialog, ItemAnswer } from "@/components/audit-stepper/AuditItemDialog";
import { getAuditItemsForType } from "@/data/auditItems";
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

  const { items: auditItems, maxPoints: maxTotalPoints } = getAuditItemsForType(typeEvenement);

  const [phase, setPhase] = useState<"info" | "items" | "saving">("info");
  const [stepZeroData, setStepZeroData] = useState<StepZeroData | undefined>();
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ItemAnswer>>({});

  const totalItems = auditItems.length;
  const progress = phase === "info" ? 0 : ((currentItemIdx + 1) / totalItems) * 100;

  const handleStepZeroSubmit = useCallback((data: StepZeroData) => {
    setStepZeroData(data);
    setPhase("items");
    setCurrentItemIdx(0);
  }, []);

  const handleItemSubmit = useCallback(
    async (answer: ItemAnswer) => {
      const newAnswers = { ...answers, [AUDIT_ITEMS[currentItemIdx].id]: answer };
      setAnswers(newAnswers);

      if (currentItemIdx < totalItems - 1) {
        setCurrentItemIdx(currentItemIdx + 1);
      } else {
        // All done — save
        setPhase("saving");
        await saveAudit(newAnswers);
      }
    },
    [answers, currentItemIdx, totalItems]
  );

  const handleBack = useCallback(() => {
    if (currentItemIdx === 0) {
      setPhase("info");
    } else {
      setCurrentItemIdx(currentItemIdx - 1);
    }
  }, [currentItemIdx]);

  const saveAudit = async (finalAnswers: Record<number, ItemAnswer>) => {
    if (!stepZeroData) return;

    const totalPoints = Object.values(finalAnswers).reduce((s, a) => s + a.score, 0);
    const noteSur10 = +(totalPoints / MAX_TOTAL_POINTS * 10).toFixed(2);

    const dateStr = stepZeroData.dateEvenement
      ? format(stepZeroData.dateEvenement, "yyyy-MM-dd")
      : new Date().toISOString().slice(0, 10);

    const month = stepZeroData.dateEvenement
      ? stepZeroData.dateEvenement.getMonth()
      : new Date().getMonth();
    // mois_versement = month + 1 (next month)
    const moisVersementIdx = Math.min(month + 1, 11);
    const moisVersement = MOIS_ORDRE[moisVersementIdx];

    // 1. Create the audit entry
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

    // 2. Create audit_details
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

  const currentItem = AUDIT_ITEMS[currentItemIdx];

  return (
    <AppLayout>
      <div className="py-8 sm:py-12 max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className="text-xs">
              {typeEvenement}
            </Badge>
            {phase === "items" && (
              <span className="text-xs text-muted-foreground">
                Item {currentItemIdx + 1} / {totalItems}
              </span>
            )}
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {phase === "info"
              ? "Informations générales"
              : phase === "saving"
              ? "Enregistrement..."
              : currentItem.title}
          </h1>
          {phase === "items" && (
            <Progress value={progress} className="mt-3 h-2" />
          )}
        </div>

        {/* Step 0: Info form */}
        {phase === "info" && (
          <StepZeroForm
            typeEvenement={typeEvenement}
            initialData={stepZeroData}
            onSubmit={handleStepZeroSubmit}
          />
        )}

        {/* Item dialogs */}
        {phase === "items" && currentItem && (
          <AuditItemDialog
            key={currentItem.id}
            item={currentItem}
            stepIndex={currentItemIdx + 1}
            totalSteps={totalItems}
            open={true}
            initialAnswer={answers[currentItem.id]}
            onSubmit={handleItemSubmit}
            onBack={handleBack}
            onClose={() => navigate("/audits/new")}
            isLast={currentItemIdx === totalItems - 1}
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
