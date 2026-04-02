import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  AuditItemDef,
  calcParticipantsScore,
  calcLinearScore,
} from "@/data/auditItems";
import { StepZeroData } from "./StepZeroForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo, faCheck, faLock } from "@fortawesome/free-solid-svg-icons";

export interface ItemAnswer {
  score: number;
  comment?: string;
  checklist?: boolean[];
  rawValue?: number;
  touched?: boolean;
}

interface Props {
  item: AuditItemDef;
  index: number;
  categoryName: string;
  answer?: ItemAnswer;
  onChange: (answer: ItemAnswer) => void;
  stepZeroData?: StepZeroData;
}

function getAutoValue(item: AuditItemDef, stepZeroData?: StepZeroData): number | undefined {
  if (!stepZeroData || !item.autoField) return undefined;
  const fieldMap: Record<string, number | undefined> = {
    nbParticipants: stepZeroData.nbParticipants,
    nbInvites: stepZeroData.nbInvites,
    nbNoShow: stepZeroData.nbNoShow,
    nbRdvPris: stepZeroData.nbRdvPris,
  };
  return fieldMap[item.autoField];
}

function computeScore(item: AuditItemDef, boolVal: boolean | null, numVal: string, checklist: boolean[], autoValue?: number): number {
  const isNoShowAuto = item.autoField === "nbNoShow";
  // 0 no-shows = validated (max points), any positive number = not validated (0 points)
  if (isNoShowAuto) return (autoValue ?? 0) === 0 ? item.maxPoints : 0;
  if (item.inputType === "boolean") return boolVal === true ? item.maxPoints : 0;
  if (item.inputType === "number") {
    const n = parseInt(numVal) || 0;
    if (item.scoringRules && item.scoringRules.includes("participants")) {
      return calcParticipantsScore(n);
    }
    return calcLinearScore(n, item.maxPoints);
  }
  if (item.inputType === "checklist") return checklist.filter(Boolean).length;
  return 0;
}

export function AuditItemCard({ item, index, categoryName, answer, onChange, stepZeroData }: Props) {
  const autoValue = getAutoValue(item, stepZeroData);
  const isAutoFilled = autoValue !== undefined;
  const isNoShowAuto = item.autoField === "nbNoShow";
  const noShowNotEntered = isNoShowAuto && autoValue === undefined;

  const [boolVal, setBoolVal] = useState<boolean | null>(() => {
    if (isNoShowAuto) return autoValue !== undefined ? autoValue === 0 : null;
    return answer ? answer.score > 0 : null;
  });
  const [numVal, setNumVal] = useState<string>(() => {
    if (isAutoFilled && !isNoShowAuto) return String(autoValue ?? 0);
    return answer?.rawValue !== undefined ? String(answer.rawValue) : "";
  });

  // Sync boolVal & numVal when autoValue changes (e.g. step 0 data updated)
  useEffect(() => {
    if (isNoShowAuto) {
      setBoolVal(autoValue !== undefined ? autoValue === 0 : null);
    } else if (isAutoFilled) {
      setNumVal(String(autoValue ?? 0));
    }
  }, [autoValue, isNoShowAuto, isAutoFilled]);
  const [checklist, setChecklist] = useState<boolean[]>(
    answer?.checklist ?? new Array(item.checklistItems?.length ?? 0).fill(false)
  );
  const [comment, setComment] = useState(answer?.comment ?? "");

  const mountedRef = useRef(false);

  // Emit changes
  useEffect(() => {
    const score = computeScore(item, boolVal, numVal, checklist, autoValue);
    const isTouched = mountedRef.current || isAutoFilled;
    if (!mountedRef.current) {
      mountedRef.current = true;
    }
    onChange({
      score,
      comment: comment.trim() || undefined,
      checklist: item.inputType === "checklist" ? checklist : undefined,
      rawValue: item.inputType === "number" ? parseInt(numVal) || 0 : undefined,
      touched: isTouched,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boolVal, numVal, checklist, comment]);

  const currentScore = computeScore(item, boolVal, numVal, checklist, autoValue);
  const isMax = currentScore === item.maxPoints;
  const isTouched = answer?.touched || false;
  const isExplicitZero = isTouched && currentScore === 0;

  return (
    <Card className={cn(
      "transition-all border-l-4",
      isMax ? "border-l-emerald-500" : currentScore > 0 ? "border-l-amber-500" : isExplicitZero ? "border-l-destructive" : "border-l-border"
    )}>
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-mono">{index + 1}.</span>
              <Badge variant="secondary" className="text-[10px]">{categoryName}</Badge>
              <Badge
                className={cn(
                  "text-[10px]",
                  isMax ? "bg-emerald-600 text-white" : currentScore > 0 ? "bg-amber-500 text-white" : isExplicitZero ? "bg-destructive text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {currentScore}/{item.maxPoints} pts
              </Badge>
              {isAutoFilled && (
                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                  <FontAwesomeIcon icon={faLock} className="h-2 w-2" /> Auto
                </Badge>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight">{item.title}</h3>
          </div>
        </div>

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

        <div className="space-y-3">
          {isAutoFilled && !isNoShowAuto && item.inputType === "number" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre (pré-rempli)</Label>
              <Input type="number" value={numVal} disabled className="bg-muted cursor-not-allowed h-10 text-sm" />
              <p className="text-[11px] text-muted-foreground">Valeur renseignée à l'étape précédente.</p>
            </div>
          )}

          {isNoShowAuto && !noShowNotEntered && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <Button type="button" size="sm" variant={boolVal ? "default" : "outline"} disabled
                  className={cn("h-10 text-xs sm:text-sm cursor-not-allowed", boolVal && "bg-emerald-600 text-white border-emerald-600")}>
                  <FontAwesomeIcon icon={faCheck} className="mr-1 h-3 w-3" /> Validé
                </Button>
                <Button type="button" size="sm" variant={!boolVal ? "destructive" : "outline"} disabled
                  className={cn("h-10 text-xs sm:text-sm cursor-not-allowed", !boolVal && "text-white")}>
                  Non validé
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {(autoValue ?? 0) > 0 ? `${autoValue} no-show — validé.` : "Aucun no-show — non validé."}
              </p>
            </div>
          )}

          {isNoShowAuto && noShowNotEntered && (
            <p className="text-[11px] text-muted-foreground italic">
              Renseignez le nombre de no-show dans les informations générales pour pré-remplir ce champ.
            </p>
          )}

          {item.inputType === "boolean" && !isAutoFilled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <Button type="button" size="sm" variant="outline" onClick={() => setBoolVal(true)}
                className={cn("h-10 text-xs sm:text-sm transition-colors",
                  boolVal === true ? "bg-emerald-600 text-white border-emerald-600 hover:bg-amber-400 hover:text-black hover:border-amber-400" : "hover:bg-accent"
                )}>
                <FontAwesomeIcon icon={faCheck} className="mr-1 h-3 w-3" /> Validé
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setBoolVal(false)}
                className={cn("h-10 text-xs sm:text-sm transition-colors",
                  boolVal === false ? "bg-destructive text-white border-destructive hover:bg-amber-400 hover:text-black hover:border-amber-400" : "hover:bg-accent"
                )}>
                Non validé
              </Button>
            </div>
          )}

          {item.inputType === "number" && !isAutoFilled && (
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Nombre</Label>
              <Input type="number" min={0} value={numVal} onChange={e => setNumVal(e.target.value)} placeholder="Entrez le nombre..." className="h-10 text-sm" />
            </div>
          )}

          {item.inputType === "checklist" && item.checklistItems && (
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {item.checklistItems.map((label, idx) => (
                <label key={idx}
                  className="flex items-start gap-2.5 rounded-md border border-border p-3 cursor-pointer transition-colors hover:bg-accent/50"
                  style={checklist[idx] ? { borderColor: "hsl(var(--chart-2))", backgroundColor: "hsl(var(--chart-2) / 0.06)" } : {}}>
                  <Checkbox checked={checklist[idx]} onCheckedChange={v => { const next = [...checklist]; next[idx] = !!v; setChecklist(next); }} className="mt-0.5" />
                  <span className="text-xs sm:text-sm leading-relaxed">{label}</span>
                </label>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] sm:text-xs text-muted-foreground">Commentaire (optionnel)</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Ajouter un commentaire..." rows={2} className="text-sm min-h-[72px] resize-y" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
