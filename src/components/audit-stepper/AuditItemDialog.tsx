import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  AuditItemDef,
  calcParticipantsScore,
  calcInvitesScore,
  calcRdvScore,
} from "@/data/auditItems";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo, faChevronLeft, faChevronRight, faCheck } from "@fortawesome/free-solid-svg-icons";

export interface ItemAnswer {
  score: number;
  comment?: string;
  checklist?: boolean[];
  rawValue?: number;
}

interface Props {
  item: AuditItemDef;
  stepIndex: number;
  totalSteps: number;
  open: boolean;
  initialAnswer?: ItemAnswer;
  onSubmit: (answer: ItemAnswer) => void;
  onBack: () => void;
  onClose: () => void;
  isLast: boolean;
}

export function AuditItemDialog({
  item,
  stepIndex,
  totalSteps,
  open,
  initialAnswer,
  onSubmit,
  onBack,
  onClose,
  isLast,
}: Props) {
  const [boolVal, setBoolVal] = useState<boolean>(
    initialAnswer ? initialAnswer.score > 0 : false
  );
  const [numVal, setNumVal] = useState<string>(
    initialAnswer?.rawValue !== undefined ? String(initialAnswer.rawValue) : ""
  );
  const [checklist, setChecklist] = useState<boolean[]>(
    initialAnswer?.checklist ?? new Array(item.checklistItems?.length ?? 0).fill(false)
  );
  const [comment, setComment] = useState(initialAnswer?.comment ?? "");

  function getScore(): number {
    if (item.inputType === "boolean") return boolVal ? item.maxPoints : 0;
    if (item.inputType === "number") {
      const n = parseInt(numVal) || 0;
      if (item.id === 3) return calcParticipantsScore(n);
      if (item.id === 4) return calcInvitesScore(n);
      if (item.id === 15) return calcRdvScore(n);
      return Math.min(n, item.maxPoints);
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
    });
  }

  const currentScore = getScore();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs font-mono">
              {stepIndex}/{totalSteps}
            </Badge>
            <Badge
              className="text-xs"
              style={{
                backgroundColor:
                  currentScore === item.maxPoints
                    ? "hsl(var(--chart-2))"
                    : currentScore > 0
                    ? "hsl(var(--chart-4))"
                    : "hsl(var(--muted))",
                color:
                  currentScore === 0
                    ? "hsl(var(--muted-foreground))"
                    : "white",
              }}
            >
              {currentScore}/{item.maxPoints} pts
            </Badge>
          </div>
          <DialogTitle className="text-lg">{item.title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line text-sm leading-relaxed">
            {item.description}
          </DialogDescription>
        </DialogHeader>

        {/* Conditions de validation */}
        <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <FontAwesomeIcon icon={faCircleInfo} className="h-3 w-3" />
            Conditions de validation
          </div>
          <p className="text-sm whitespace-pre-line text-foreground/80">
            {item.condition}
          </p>
          {item.scoringRules && (
            <p className="text-sm whitespace-pre-line text-foreground/80 mt-2 pt-2 border-t border-border">
              {item.scoringRules}
            </p>
          )}
        </div>

        {/* Input area */}
        <div className="space-y-4 pt-2">
          {item.inputType === "boolean" && (
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant={boolVal ? "default" : "outline"}
                onClick={() => setBoolVal(true)}
                className="flex-1"
                style={boolVal ? { backgroundColor: "hsl(var(--chart-2))" } : {}}
              >
                <FontAwesomeIcon icon={faCheck} className="mr-1 h-3 w-3" />
                Validé
              </Button>
              <Button
                type="button"
                variant={!boolVal ? "destructive" : "outline"}
                onClick={() => setBoolVal(false)}
                className="flex-1"
              >
                Non validé
              </Button>
            </div>
          )}

          {item.inputType === "number" && (
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                type="number"
                min={0}
                value={numVal}
                onChange={(e) => setNumVal(e.target.value)}
                placeholder="Entrez le nombre..."
              />
            </div>
          )}

          {item.inputType === "checklist" && item.checklistItems && (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {item.checklistItems.map((label, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer transition-colors hover:bg-accent/50"
                  style={
                    checklist[idx]
                      ? { borderColor: "hsl(var(--chart-2))", backgroundColor: "hsl(var(--chart-2) / 0.06)" }
                      : {}
                  }
                >
                  <Checkbox
                    checked={checklist[idx]}
                    onCheckedChange={(v) => {
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

          {/* Comment */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Commentaire (optionnel)
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="gap-1">
            <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
            Retour
          </Button>
          <Button type="button" onClick={handleSubmit} className="gap-1 flex-1">
            {isLast ? "Terminer l'audit" : "Suivant"}
            {!isLast && <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
