import { useState, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/data/auditItems";
import { StepZeroData } from "./StepZeroForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo, faCheck, faLock, faXmark, faBan } from "@fortawesome/free-solid-svg-icons";

export interface ItemAnswer {
  score: number;
  comment?: string;
  checklist?: boolean[];
  rawValue?: number;
  touched?: boolean;
  notApplicable?: boolean;
}

interface Props {
  item: AuditItemDef;
  index: number;
  categoryName: string;
  answer?: ItemAnswer;
  onChange: (answer: ItemAnswer) => void;
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

function computeScore(item: AuditItemDef, boolVal: boolean | null, numVal: string, checklist: boolean[], autoValue?: number): number {
  const isNoShowAuto = item.autoField === "nbNoShow";
  const parsed = parseAutoField(item.autoField);
  const hasBoolCondition = parsed?.condition && item.inputType === "boolean";
  
  if (isNoShowAuto) return (autoValue ?? 0) === 0 ? item.maxPoints : 0;
  if (hasBoolCondition && autoValue !== undefined) {
    if (parsed!.condition === "zero") return autoValue === 0 ? item.maxPoints : 0;
    if (parsed!.condition === "positive") return autoValue > 0 ? item.maxPoints : 0;
  }
  if (item.inputType === "boolean") return boolVal === true ? item.maxPoints : 0;
  if (item.inputType === "number") {
    const n = autoValue !== undefined ? autoValue : (parseInt(numVal) || 0);
    const incCfg = parseIncrementConfig(item.scoringRules);
    if (incCfg) return calcIncrementScore(n, incCfg, item.maxPoints);
    const thrCfg = parseThresholdConfig(item.scoringRules);
    if (thrCfg) return calcThresholdScore(n, thrCfg, item.maxPoints);
    const tiers = parseScoringTiers(item.scoringRules);
    if (tiers) return calcTiersScore(n, tiers);
    if (item.scoringRules && item.scoringRules.includes("participants")) {
      return calcParticipantsScore(n);
    }
    return calcLinearScore(n, item.maxPoints);
  }
  if (item.inputType === "checklist") return checklist.filter(Boolean).length;
  return 0;
}

const COMMENT_SYNC_DEBOUNCE_MS = 400;

function AuditItemCardComponent({ item, index, categoryName, answer, onChange, stepZeroData }: Props) {
  const autoValue = getAutoValue(item, stepZeroData);
  const isAutoFilled = autoValue !== undefined;
  const isNoShowAuto = item.autoField === "nbNoShow";
  const parsed = parseAutoField(item.autoField);
  const hasBoolCondition = parsed?.condition && item.inputType === "boolean";
  const isBoolAuto = isNoShowAuto || hasBoolCondition;
  const boolAutoNotEntered = isBoolAuto && autoValue === undefined;
  const tiers = parseScoringTiers(item.scoringRules);

  const autoBoolResult = (() => {
    if (isNoShowAuto) return autoValue !== undefined ? autoValue === 0 : null;
    if (hasBoolCondition && autoValue !== undefined) {
      return parsed!.condition === "zero" ? autoValue === 0 : autoValue > 0;
    }
    return null;
  })();

  const [boolVal, setBoolVal] = useState<boolean | null>(() => {
    if (isBoolAuto) return autoBoolResult;
    return answer ? answer.score > 0 : null;
  });
  const [numVal, setNumVal] = useState<string>(() => {
    if (isAutoFilled && !isBoolAuto) return String(autoValue ?? 0);
    return answer?.rawValue !== undefined ? String(answer.rawValue) : "";
  });
  const [notApplicable, setNotApplicable] = useState(answer?.notApplicable ?? false);

  useEffect(() => {
    if (isBoolAuto) {
      setBoolVal(autoBoolResult);
    } else if (isAutoFilled) {
      setNumVal(String(autoValue ?? 0));
    }
  }, [autoValue, isBoolAuto, isAutoFilled, autoBoolResult]);

  const [checklist, setChecklist] = useState<boolean[]>(
    answer?.checklist ?? new Array(item.checklistItems?.length ?? 0).fill(false)
  );
  const [comment, setComment] = useState(answer?.comment ?? "");
  const mountedRef = useRef(false);
  const commentRef = useRef(comment);
  commentRef.current = comment;
  const commentSyncTimerRef = useRef<number | null>(null);
  /** Évite un emit debouncé « commentaire vide » au montage : à ce moment `mountedRef` est déjà true (effet champs), ce qui forçait `touched` sur toute la grille. */
  const hasHadNonEmptyCommentRef = useRef(false);

  useEffect(() => {
    const incoming = answer?.comment ?? "";
    setComment((prev) => (prev === incoming ? prev : incoming));
  }, [item.id, answer?.comment]);

  const emitToParent = (commentStr: string) => {
    const score = notApplicable ? 0 : computeScore(item, boolVal, numVal, checklist, autoValue);
    const isTouched = mountedRef.current || isAutoFilled || notApplicable;
    if (!mountedRef.current) mountedRef.current = true;
    onChange({
      score,
      comment: commentStr.trim() || undefined,
      checklist: item.inputType === "checklist" ? checklist : undefined,
      rawValue: item.inputType === "number" ? parseInt(numVal) || 0 : undefined,
      touched: isTouched,
      notApplicable,
    });
  };

  useEffect(() => {
    emitToParent(commentRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boolVal, numVal, checklist, notApplicable, autoValue]);

  useEffect(() => {
    if (commentSyncTimerRef.current !== null) {
      window.clearTimeout(commentSyncTimerRef.current);
    }
    if (comment.trim() === "" && !hasHadNonEmptyCommentRef.current) {
      return;
    }
    if (comment.trim() !== "") hasHadNonEmptyCommentRef.current = true;

    commentSyncTimerRef.current = window.setTimeout(() => {
      commentSyncTimerRef.current = null;
      emitToParent(comment);
    }, COMMENT_SYNC_DEBOUNCE_MS);
    return () => {
      if (commentSyncTimerRef.current !== null) {
        window.clearTimeout(commentSyncTimerRef.current);
        commentSyncTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comment]);

  const currentScore = notApplicable ? 0 : computeScore(item, boolVal, numVal, checklist, autoValue);
  const isMax = !notApplicable && currentScore === item.maxPoints;
  const isTouched = answer?.touched || false;
  const isExplicitZero = !notApplicable && isTouched && currentScore === 0;

  const handleToggleNA = () => {
    setNotApplicable((prev) => !prev);
  };

  const clearNA = () => setNotApplicable(false);

  return (
    <Card className={cn(
      "transition-all border-l-4",
      notApplicable ? "border-l-muted-foreground/40" :
      isMax ? "border-l-emerald-500" : currentScore > 0 ? "border-l-amber-500" : isExplicitZero ? "border-l-destructive" : "border-l-border"
    )}>
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 flex h-9 min-h-9 min-w-9 items-center justify-center px-2.5 sm:h-10 sm:min-h-10 sm:min-w-10 sm:px-3",
              "text-base sm:text-lg font-bold tabular-nums leading-none border-2 font-mono text-foreground"
            )}
            aria-label={`Item ${index + 1}`}
          >
            {index + 1}
          </Badge>
          <h3 className="text-sm sm:text-base font-semibold text-foreground leading-snug min-w-0 flex-1">
            {item.title}
          </h3>
          <Badge
            className={cn(
              "shrink-0 text-xs sm:text-sm font-semibold tabular-nums h-9 min-h-9 px-2.5 sm:h-10 sm:min-h-10 sm:px-3 inline-flex items-center",
              notApplicable ? "bg-muted text-muted-foreground" :
              isMax ? "bg-emerald-600 text-white" : currentScore > 0 ? "bg-amber-500 text-white" : isExplicitZero ? "bg-destructive text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {notApplicable ? "N/A" : `${currentScore}/${item.maxPoints} pts`}
          </Badge>
          {isAutoFilled && !notApplicable && (
            <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground shrink-0">
              <FontAwesomeIcon icon={faLock} className="h-2 w-2" /> Auto
            </Badge>
          )}
        </div>

        {notApplicable && (
          <p className="text-xs sm:text-sm text-muted-foreground rounded-lg border border-border bg-muted/50 px-3 py-2.5 leading-relaxed">
            Cet item est marqué comme non applicable et ne sera pas comptabilisé.
          </p>
        )}

        {(item.description || item.condition || tiers) && (
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
            {tiers && (
              <p className="text-xs sm:text-sm text-foreground/70 pt-1.5 border-t border-border whitespace-pre-line leading-relaxed">
                {formatTiersDisplay(tiers)}
              </p>
            )}
            {!tiers && item.scoringRules && !parseScoringTiers(item.scoringRules) && (
              <RichHtmlView
                content={item.scoringRules}
                className="text-xs sm:text-sm text-foreground/70 pt-1.5 border-t border-border"
              />
            )}
          </div>
        )}

        <div className={cn("space-y-3", notApplicable && "opacity-95")}>
            {/* Auto-filled number (disabled) */}
            {isAutoFilled && !isBoolAuto && item.inputType === "number" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Valeur saisie : <span className="font-bold text-foreground">{autoValue}</span></Label>
                <Input type="number" value={numVal} disabled className="bg-muted cursor-not-allowed h-10 text-sm" />
                <p className="text-[11px] text-muted-foreground">Calcul automatique — valeur renseignée à l'étape précédente.</p>
              </div>
            )}

            {isBoolAuto && !boolAutoNotEntered && (
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
                  Calcul automatique — valeur source : {autoValue}.
                  {boolVal ? " Item validé." : " Item non validé."}
                </p>
              </div>
            )}

            {isBoolAuto && boolAutoNotEntered && (
              <p className="text-[11px] text-muted-foreground italic">
                Renseignez la valeur dans les informations générales pour pré-remplir ce champ.
              </p>
            )}

            {item.inputType === "boolean" && !isBoolAuto && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => { clearNA(); setBoolVal(true); }}
                  className={cn(
                    "h-10 text-xs sm:text-sm transition-colors",
                    boolVal === true && !notApplicable
                      ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white hover:border-emerald-700"
                      : "hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-900 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-100 dark:hover:border-emerald-700",
                  )}
                >
                  <FontAwesomeIcon icon={faCheck} className="mr-1 h-3 w-3" /> Validé
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => { clearNA(); setBoolVal(false); }}
                  className={cn(
                    "h-10 text-xs sm:text-sm transition-colors",
                    boolVal === false && !notApplicable
                      ? "bg-destructive text-white border-destructive hover:bg-red-700 hover:text-white hover:border-red-700"
                      : "hover:bg-red-100 hover:border-red-300 hover:text-red-900 dark:hover:bg-red-950/50 dark:hover:text-red-100 dark:hover:border-red-800",
                  )}
                >
                  <FontAwesomeIcon icon={faXmark} className="mr-1 h-3 w-3" /> Non validé
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleToggleNA}
                  className={cn(
                    "h-10 text-xs sm:text-sm transition-colors",
                    notApplicable
                      ? "bg-[#ffc107] text-neutral-900 border-[#e6ac00] shadow-none ring-0 hover:bg-[#ffcd38] hover:text-neutral-900 hover:border-[#ffc107]"
                      : "hover:bg-[#fff8e1] hover:border-[#ffe082] hover:text-neutral-900 dark:hover:bg-[#ffc107]/15 dark:hover:border-[#ffc107]/45 dark:hover:text-[#ffe082]",
                  )}
                >
                  <FontAwesomeIcon icon={faBan} className="mr-1 h-3 w-3" /> Non applicable
                </Button>
              </div>
            )}

            {item.inputType === "number" && !isAutoFilled && (
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Nombre</Label>
                <Input
                  type="number"
                  min={0}
                  value={numVal}
                  onChange={(e) => {
                    clearNA();
                    setNumVal(e.target.value);
                  }}
                  placeholder="Entrez le nombre..."
                  className="h-10 text-sm"
                />
                {numVal && tiers && (
                  <p className="text-xs text-muted-foreground">
                    Valeur saisie : <span className="font-bold text-foreground">{numVal}</span>
                  </p>
                )}
              </div>
            )}

            {item.inputType === "checklist" && item.checklistItems && (
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {item.checklistItems.map((label, idx) => (
                  <label key={idx}
                    className="flex items-start gap-2.5 rounded-md border border-border p-3 cursor-pointer transition-colors hover:bg-accent/50"
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
                    <span className="text-xs sm:text-sm leading-relaxed">{label}</span>
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
                  "h-9 text-xs transition-colors gap-1.5",
                  notApplicable
                    ? "bg-[#ffc107] text-neutral-900 border-[#e6ac00] shadow-none ring-0 hover:bg-[#ffcd38] hover:text-neutral-900 hover:border-[#ffc107]"
                    : "hover:bg-[#fff8e1] hover:border-[#ffe082] hover:text-neutral-900 dark:hover:bg-[#ffc107]/15 dark:hover:border-[#ffc107]/45 dark:hover:text-[#ffe082]",
                )}
              >
                <FontAwesomeIcon icon={faBan} className="h-3 w-3" /> Non applicable
              </Button>
            )}
        </div>

        <div className="space-y-1.5">
          <Label className={cn("text-[11px] sm:text-xs", notApplicable ? "text-destructive font-semibold" : "text-muted-foreground")}>
            Commentaire {notApplicable ? "(obligatoire)" : "(optionnel)"}
          </Label>
          <RichTextEditor
            value={comment}
            onChange={setComment}
            placeholder={notApplicable ? "Justifiez pourquoi cet item n'est pas applicable..." : "Ajouter un commentaire..."}
            rows={2}
            className="text-sm"
          />
          {notApplicable && !comment.trim() && (
            <p className="text-[11px] text-destructive">Un commentaire est requis pour les items non applicables.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const AuditItemCard = memo(AuditItemCardComponent);
