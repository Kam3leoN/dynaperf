import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faChevronRight } from "@fortawesome/free-solid-svg-icons";

export interface StepZeroData {
  partenaireAudite: string;
  partenaireReferent: string;
  auditeur: string;
  lieu: string;
  typeLieu: string;
  dateEvenement: Date | undefined;
  heureEvenement: string;
  nomClub?: string;
  nbAdherents?: number;
  nbInvites?: number;
  nbNoShow?: number;
  nbParticipants?: number;
  nbRdvPris?: number;
}

interface Props {
  typeEvenement: string;
  initialData?: StepZeroData;
  onSubmit: (data: StepZeroData) => void;
}

const isRdOrClub = (type: string) =>
  type.includes("RD") || type.includes("Club");
const isClub = (type: string) => type.includes("Club");

export function StepZeroForm({ typeEvenement, initialData, onSubmit }: Props) {
  const [data, setData] = useState<StepZeroData>(
    initialData ?? {
      partenaireAudite: "",
      partenaireReferent: "",
      auditeur: "",
      lieu: "",
      typeLieu: "",
      dateEvenement: undefined,
      heureEvenement: "",
    }
  );

  const set = <K extends keyof StepZeroData>(k: K, v: StepZeroData[K]) =>
    setData((prev) => ({ ...prev, [k]: v }));

  const showRdClubFields = isRdOrClub(typeEvenement);
  const showClubField = isClub(typeEvenement);

  const ratioInvParticipants =
    data.nbInvites && data.nbParticipants && data.nbParticipants > 0
      ? (data.nbInvites / data.nbParticipants * 100).toFixed(1)
      : null;
  const ratioRdvInvites =
    data.nbRdvPris !== undefined && data.nbInvites && data.nbInvites > 0
      ? (data.nbRdvPris / data.nbInvites * 100).toFixed(1)
      : null;

  const isValid =
    data.partenaireAudite.trim() &&
    data.auditeur.trim() &&
    data.lieu.trim() &&
    data.dateEvenement;

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Partenaire audité (Prénom NOM) *</Label>
          <Input
            value={data.partenaireAudite}
            onChange={(e) => set("partenaireAudite", e.target.value)}
            placeholder="ex: Émilie BLAISE"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Partenaire référent (Prénom NOM)</Label>
          <Input
            value={data.partenaireReferent}
            onChange={(e) => set("partenaireReferent", e.target.value)}
            placeholder="ex: Marie DUPONT"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Auditeur (Prénom NOM) *</Label>
          <Input
            value={data.auditeur}
            onChange={(e) => set("auditeur", e.target.value)}
            placeholder="ex: Cédric MALZAT"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Lieu de l'événement *</Label>
          <Input
            value={data.lieu}
            onChange={(e) => set("lieu", e.target.value)}
            placeholder="ex: Troyes"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type de lieu</Label>
          <Input
            value={data.typeLieu}
            onChange={(e) => set("typeLieu", e.target.value)}
            placeholder="ex: Hôtel, Restaurant..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Date de l'événement *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !data.dateEvenement && "text-muted-foreground"
                )}
              >
                <FontAwesomeIcon icon={faCalendar} className="mr-2 h-3.5 w-3.5" />
                {data.dateEvenement
                  ? format(data.dateEvenement, "dd MMMM yyyy", { locale: fr })
                  : "Sélectionner une date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.dateEvenement}
                onSelect={(d) => set("dateEvenement", d)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label>Heure de l'événement</Label>
          <Input
            type="time"
            value={data.heureEvenement}
            onChange={(e) => set("heureEvenement", e.target.value)}
          />
        </div>
      </div>

      {showClubField && (
        <div className="space-y-1.5">
          <Label>Nom du club</Label>
          <Input
            value={data.nomClub ?? ""}
            onChange={(e) => set("nomClub", e.target.value)}
            placeholder="ex: Club BTP Troyes"
          />
        </div>
      )}

      {showRdClubFields && (
        <>
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Statistiques de l'événement
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>
                {isClub(typeEvenement) ? "Nb membres" : "Nb adhérents"}
              </Label>
              <Input
                type="number"
                min={0}
                value={data.nbAdherents ?? ""}
                onChange={(e) =>
                  set("nbAdherents", e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nb invités</Label>
              <Input
                type="number"
                min={0}
                value={data.nbInvites ?? ""}
                onChange={(e) =>
                  set("nbInvites", e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nb no-show</Label>
              <Input
                type="number"
                min={0}
                value={data.nbNoShow ?? ""}
                onChange={(e) =>
                  set("nbNoShow", e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nb participants</Label>
              <Input
                type="number"
                min={0}
                value={data.nbParticipants ?? ""}
                onChange={(e) =>
                  set("nbParticipants", e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nb RDV pris</Label>
              <Input
                type="number"
                min={0}
                value={data.nbRdvPris ?? ""}
                onChange={(e) =>
                  set("nbRdvPris", e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            </div>
          </div>

          {/* Ratios automatiques */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Ratio invités / participants</p>
              <p className="text-lg font-semibold tabular-nums">
                {ratioInvParticipants ? `${ratioInvParticipants}%` : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Ratio RDV pris / invités</p>
              <p className="text-lg font-semibold tabular-nums">
                {ratioRdvInvites ? `${ratioRdvInvites}%` : "—"}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="pt-4">
        <Button
          onClick={() => onSubmit(data)}
          disabled={!isValid}
          className="w-full gap-2"
        >
          Commencer l'audit
          <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
