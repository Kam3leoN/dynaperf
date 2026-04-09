import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichHtmlView } from "@/components/ui/rich-html-view";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  AuditItemDef,
  calcParticipantsScore,
  calcLinearScore,
  parseScoringTiers,
  calcTiersScore,
  formatTiersDisplay,
  parseIncrementConfig,
  calcIncrementScore,
  parseThresholdConfig,
  calcThresholdScore,
  formatThresholdDisplay,
} from "@/data/auditItems";
import { StepZeroData } from "./StepZeroForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo, faChevronLeft, faChevronRight, faCheck, faLock, faXmark, faBan } from "@fortawesome/free-solid-svg-icons";

export interface ItemAnswer {
  score: number;
  comment?: string;
  checklist?: boolean[];
  rawValue?: number;
  notApplicable?: boolean;
}

interface Props {
  item: AuditItemDef;
  stepIndex: number;
  totalSteps: number;
  categoryName: string;
  open: boolean;
  initialAnswer?: ItemAnswer;
  onSubmit: (answer: ItemAnswer) => void;
  onBack: () => void;
  onClose: () => void;
  isLast: boolean;
  stepZeroData?: StepZeroData;
}

function parseAutoField(autoField?: string): { fieldId: string; condition?: string } | null {
  if (!autoField) return null;
  if (autoField.includes("::")) {
    const [fieldId, condition] = autoField.split("::");
    return { fieldId, condition };
  }
  return { fieldId: autoField };
}

function getAutoValue(item: AuditItemDef, stepZeroData?: StepZeroData): number | undefined {
  if (!stepZeroData || !item.autoField) return undefined;
  const parsed = parseAutoField(item.autoField);
  if (!parsed) return undefined;
  const fieldMap: Record<string, number | undefined> = {
    nbParticipants: stepZeroData.nbParticipants,
    nbInvites: stepZeroData.nbInvites,
    nbNoShow: stepZeroData.nbNoShow,
    nbRdvPris: stepZeroData.nbRdvPris,
  };
  if (parsed.fieldId in fieldMap && fieldMap[parsed.fieldId] !== undefined) return fieldMap[parsed.fieldId];
  const cv = stepZeroData.customFieldValues?.[parsed.fieldId];
  if (cv !== undefined && cv !== null && cv !== "") return Number(cv) || 0;
  return undefined;
}

export function AuditItemDialog({
  item, stepIndex, totalSteps, categoryName, open, initialAnswer,
  onSubmit, onBack, onClose, isLast, stepZeroData,
}: Props) {
  const autoValue = getAutoValue(item, stepZeroData);
  const isAutoFilled = autoValue !== undefined;
  const isNoShowAuto = item.autoField === "nbNoShow";
  const parsed = parseAutoField(item.autoField);
  const hasBoolCondition = parsed?.condition && item.inputType === "boolean";
  const isBoolAuto = isNoShowAuto || hasBoolCondition;
  const tiers = parseScoringTiers(item.scoringRules);
  const incrementConfig = parseIncrementConfig(item.scoringRules);
  const thresholdConfig = parseThresholdConfig(item.scoringRules);
  const autoBoolResult = (() => {
    if (isNoShowAuto) return (autoValue ?? 0) === 0;
    if (hasBoolCondition && autoValue !== undefined) {
      return parsed!.condition === "zero" ? autoValue === 0 : autoValue > 0;
    }
    return null;
  })();

  const [boolVal, setBoolVal] = useState<boolean | null>(() => {
    if (isBoolAuto) return autoBoolResult;
    return initialAnswer ? initialAnswer.score > 0 : null;
  });
  const [numVal, setNumVal] = useState<string>(() => {
    if (isAutoFilled && !isBoolAuto) return String(autoValue ?? 0);
    return initialAnswer?.rawValue !== undefined ? String(initialAnswer.rawValue) : "";
  });
  const [checklist, setChecklist] = useState<boolean[]>(
    initialAnswer?.checklist ?? new Array(item.checklistItems?.length ?? 0).fill(false)
  );
  const [comment, setComment] = useState(initialAnswer?.comment ?? "");
  const [notApplicable, setNotApplicable] = useState(initialAnswer?.notApplicable ?? false);

  function getScore(): number {
    if (notApplicable) return 0;
    if (isNoShowAuto) return (autoValue ?? 0) === 0 ? item.maxPoints : 0;
    if (hasBoolCondition && autoValue !== undefined) {
      return parsed!.condition === "zero" ? (autoValue === 0 ? item.maxPoints : 0) : (autoValue > 0 ? item.maxPoints : 0);
    }
    if (item.inputType === "boolean") return boolVal === true ? item.maxPoints : 0;
    if (item.inputType === "number") {
      const n = isAutoFilled ? (autoValue ?? 0) : (parseInt(numVal) || 0);
      if (incrementConfig) return calcIncrementScore(n, incrementConfig, item.maxPoints);
      if (thresholdConfig) return calcThresholdScore(n, thresholdConfig, item.maxPoints);
      if (tiers) return calcTiersScore(n, tiers);
      if (item.scoringRules && item.scoringRules.includes("participants")) return calcParticipantsScore(n);
      return calcLinearScore(n, item.maxPoints);
    }
    if (item.inputType === "checklist") return checklist.filter(Boolean).length;
    return 0;
  }

  function handleSubmit() {
    const score = getScore();
    onSubmit({
      score,
      comment: comment.trim() || undefined,
      checklist: item.inputType === "checklist" ? checklist : undefined,
      rawValue: item.inputType === "number" ? parseInt(numVal) || 0 : undefined,
      notApplicable,
    });
  }

  const currentScore = getScore();

  const handleToggleNA = () => setNotApplicable((p) => !p);
  const clearNA = () => setNotApplicable(false);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
            <Badge
              variant="outline"
              className="shrink-0 flex h-9 min-h-9 items-center justify-center px-2.5 text-sm sm:text-base font-bold tabular-nums border-2 font-mono text-foreground"
              aria-label={`Étape ${stepIndex} sur ${totalSteps}`}
            >
              {stepIndex}/{totalSteps}
            </Badge>
            <h2 className="text-base sm:text-lg font-semibold text-foreground leading-snug min-w-0 flex-1">{item.title}</h2>
            <Badge
              className={cn(
                "shrink-0 text-xs sm:text-sm font-semibold tabular-nums h-9 min-h-9 px-2.5 inline-flex items-center",
                notApplicable ? "bg-muted text-muted-foreground" :
                currentScore === item.maxPoints ? "bg-emerald-600 text-white" : currentScore > 0 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {notApplicable ? "N/A" : `${currentScore}/${item.maxPoints} pts`}
            </Badge>
            {isAutoFilled && !notApplicable && (
              <Badge variant="outline" className="text-xs gap-1 text-muted-foreground shrink-0">
                <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5" /> Auto
              </Badge>
            )}
          </div>
          <DialogTitle className="sr-only">{item.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm leading-relaxed max-h-[40vh] overflow-y-auto">
              {item.description ? (
                <RichHtmlView content={item.description} className="text-muted-foreground" />
              ) : (
                <span className="text-muted-foreground/70 italic">Aucune description.</span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {notApplicable && (
          <p className="text-xs sm:text-sm text-muted-foreground rounded-lg border border-border bg-muted/50 px-3 py-2.5 leading-relaxed">
            Cet item est marqué comme non applicable et ne sera pas comptabilisé.
          </p>
        )}

        <>
            <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <FontAwesomeIcon icon={faCircleInfo} className="h-3 w-3" /> Conditions de validation
              </div>
              {item.condition && (
                <RichHtmlView content={item.condition} className="text-sm text-foreground/80" />
              )}
              {tiers && (
                <p className="text-sm whitespace-pre-line text-foreground/80 mt-2 pt-2 border-t border-border">
                  {formatTiersDisplay(tiers)}
                </p>
              )}
              {incrementConfig && (
                <p className="text-sm text-foreground/80 mt-2 pt-2 border-t border-border">
                  {incrementConfig.minValue > 0 ? `Min. ${incrementConfig.minValue} pour scorer. ` : ""}
                  {incrementConfig.step === 1 ? "1 = 1 pt" : `${incrementConfig.step} = 1 pt`}, max {item.maxPoints} pts
                </p>
              )}
              {thresholdConfig && (
                <p className="text-sm text-foreground/80 mt-2 pt-2 border-t border-border">
                  {formatThresholdDisplay(thresholdConfig, item.maxPoints)}
                </p>
              )}
              {!tiers && !incrementConfig && !thresholdConfig && item.scoringRules && (
                <RichHtmlView
                  content={item.scoringRules}
                  className="text-sm text-foreground/80 mt-2 pt-2 border-t border-border"
                />
              )}
            </div>

            <div className={cn("space-y-4 pt-2", notApplicable && "opacity-95")}>
              {isAutoFilled && !isBoolAuto && item.inputType === "number" && (
                <div className="space-y-2">
                  <Label>Valeur saisie : <span className="font-bold">{autoValue}</span></Label>
                  <Input type="number" value={numVal} disabled className="bg-muted cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground">Calcul automatique — valeur renseignée à l'étape précédente.</p>
                </div>
              )}

              {isBoolAuto && (
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <Button type="button" variant={autoBoolResult ? "default" : "outline"} disabled className={cn("flex-1 cursor-not-allowed", autoBoolResult && "bg-emerald-600 text-white")}>
                      <FontAwesomeIcon icon={faCheck} className="mr-1 h-3 w-3" /> Validé
                    </Button>
                    <Button type="button" variant={!autoBoolResult ? "destructive" : "outline"} disabled className="flex-1 cursor-not-allowed">Non validé</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Calcul automatique — valeur source : {autoValue ?? "non renseignée"}.
                    {autoBoolResult ? " Item validé." : " Item non validé."}
                  </p>
                </div>
              )}

              {item.inputType === "boolean" && !isBoolAuto && (
                <div className="grid grid-cols-3 gap-3">
                  <Button type="button" variant="outline" onClick={() => { clearNA(); setBoolVal(true); }}
                    className={cn("flex-1 transition-colors", boolVal === true && !notApplicable ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700" : "hover:bg-accent hover:text-accent-foreground")}>
                    <FontAwesomeIcon icon={faCheck} className="mr-1 h-3 w-3" /> Validé
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { clearNA(); setBoolVal(false); }}
                    className={cn("flex-1 transition-colors", boolVal === false && !notApplicable ? "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90" : "hover:bg-accent hover:text-accent-foreground")}>
                    <FontAwesomeIcon icon={faXmark} className="mr-1 h-3 w-3" /> Non validé
                  </Button>
                  <Button type="button" variant="outline" onClick={handleToggleNA}
                    className={cn(
                      "flex-1 transition-colors hover:bg-accent hover:text-accent-foreground",
                      notApplicable && "border-primary ring-2 ring-primary/30 bg-primary/5"
                    )}>
                    <FontAwesomeIcon icon={faBan} className="mr-1 h-3 w-3" /> N/A
                  </Button>
                </div>
              )}

              {item.inputType === "number" && !isAutoFilled && (
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    type="number"
                    min={0}
                    value={numVal}
                    onChange={(e) => {
                      clearNA();
                      setNumVal(e.target.value);
                    }}
                    placeholder="Entrez le nombre..."
                  />
                  {numVal && tiers && (
                    <p className="text-xs text-muted-foreground">
                      Valeur saisie : <span className="font-bold text-foreground">{numVal}</span>
                    </p>
                  )}
                </div>
              )}

              {item.inputType === "checklist" && item.checklistItems && (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {item.checklistItems.map((label, idx) => (
                    <label key={idx} className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer transition-colors hover:bg-accent/50"
                      style={checklist[idx] ? { borderColor: "hsl(var(--chart-2))", backgroundColor: "hsl(var(--chart-2) / 0.06)" } : {}}>
                      <Checkbox
                        checked={checklist[idx]}
                        onCheckedChange={(v) => {
                          clearNA();
                          const next = [...checklist];
                          next[idx] = !!v;
                          setChecklist(next);
                        }}
                        className="mt-0.5"
                      />
                      <span className="text-sm leading-snug">{label}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* NA button for non-boolean types */}
              {item.inputType !== "boolean" && !isBoolAuto && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleToggleNA}
                  className={cn(
                    "gap-1.5",
                    notApplicable && "border-primary ring-2 ring-primary/30 bg-primary/5"
                  )}
                >
                  <FontAwesomeIcon icon={faBan} className="h-3 w-3" /> Non applicable
                </Button>
              )}
            </div>
        </>

        <div className="space-y-2">
          <Label className={cn("text-xs", notApplicable ? "text-destructive font-semibold" : "text-muted-foreground")}>
            Commentaire {notApplicable ? "(obligatoire)" : "(optionnel)"}
          </Label>
          <RichTextEditor
            value={comment}
            onChange={setComment}
            placeholder={notApplicable ? "Justifiez pourquoi cet item n'est pas applicable..." : "Ajouter un commentaire..."}
            rows={2}
          />
          {notApplicable && !comment.trim() && (
            <p className="text-xs text-destructive">Un commentaire est requis pour les items non applicables.</p>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="gap-1">
            <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" /> Retour
          </Button>
          <Button type="button" onClick={handleSubmit} className="gap-1 flex-1"
            disabled={notApplicable && !comment.trim()}>
            {isLast ? "Terminer l'audit" : "Suivant"}
            {!isLast && <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
