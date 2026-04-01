import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";

export interface StepZeroData {
  partenaireAudite: string;
  partenaireReferent: string;
  auditeur: string;
  lieu: string;
  typeLieu: string;
  dateEvenement: Date | undefined;
  heureEvenement: string;
  heureDebutPrevue?: string;
  heureFinPrevue?: string;
  heureDebutReelle?: string;
  heureFinReelle?: string;
  nomClub?: string;
  qualiteLieu?: number;
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
  hideSubmitButton?: boolean;
}

const isRdOrClub = (type: string) =>
  type.includes("RD") || type.includes("Club");
const isClub = (type: string) => type.includes("Club");

interface SuggestionLists {
  partenaires: string[];
  auditeurs: string[];
  lieux: string[];
  typesLieu: string[];
  referents: string[];
}

export function StepZeroForm({ typeEvenement, initialData, onSubmit, hideSubmitButton }: Props) {
  const [data, setData] = useState<StepZeroData>(
    initialData ?? {
      partenaireAudite: "",
      partenaireReferent: "",
      auditeur: "",
      lieu: "",
      typeLieu: "",
      dateEvenement: undefined,
      heureEvenement: "",
      qualiteLieu: 0,
    }
  );

  const [suggestions, setSuggestions] = useState<SuggestionLists>({
    partenaires: [],
    auditeurs: [],
    lieux: [],
    typesLieu: [],
    referents: [],
  });

  useEffect(() => {
    async function loadSuggestions() {
      const [{ data: audits }, { data: details }, { data: profiles }] = await Promise.all([
        supabase.from("audits").select("partenaire, auditeur, lieu").limit(500),
        supabase.from("audit_details").select("partenaire_referent, type_lieu").limit(500),
        supabase.from("profiles").select("display_name"),
      ]);

      const unique = (arr: (string | null | undefined)[]) =>
        [...new Set(arr.filter((v): v is string => !!v && v.trim() !== ""))].sort();

      setSuggestions({
        partenaires: unique(audits?.map((a) => a.partenaire)),
        auditeurs: unique(profiles?.map((p) => p.display_name)),
        lieux: unique(audits?.map((a) => a.lieu)),
        typesLieu: unique(details?.map((d) => d.type_lieu)),
        referents: unique(details?.map((d) => d.partenaire_referent)),
      });
    }
    loadSuggestions();
  }, []);

  const set = <K extends keyof StepZeroData>(k: K, v: StepZeroData[K]) =>
    setData((prev) => {
      const next = { ...prev, [k]: v };
      if (hideSubmitButton) {
        // In inline mode, emit changes immediately
        setTimeout(() => onSubmit(next), 0);
      }
      return next;
    });

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
    data.typeLieu.trim() &&
    data.dateEvenement;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Partenaire audité (Prénom NOM) *</Label>
          <AutocompleteInput
            value={data.partenaireAudite}
            onChange={(v) => set("partenaireAudite", v)}
            suggestions={suggestions.partenaires}
            placeholder="ex: Émilie BLAISE"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Partenaire référent (Prénom NOM)</Label>
          <AutocompleteInput
            value={data.partenaireReferent}
            onChange={(v) => set("partenaireReferent", v)}
            suggestions={suggestions.referents}
            placeholder="ex: Marie DUPONT"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Auditeur (Prénom NOM) *</Label>
          {suggestions.auditeurs.length > 0 ? (
            <Select value={data.auditeur} onValueChange={(v) => set("auditeur", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un auditeur" />
              </SelectTrigger>
              <SelectContent>
                {suggestions.auditeurs.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={data.auditeur}
              onChange={(e) => set("auditeur", e.target.value)}
              placeholder="ex: Cédric MALZAT"
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Ville de l'événement *</Label>
          <CityAutocomplete
            value={data.lieu}
            onChange={(v) => set("lieu", v)}
            placeholder="ex: Troyes ou 10000"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Lieu de l'événement *</Label>
          <AutocompleteInput
            value={data.typeLieu}
            onChange={(v) => set("typeLieu", v)}
            suggestions={suggestions.typesLieu}
            placeholder="ex: Hôtel, Restaurant..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Qualité du lieu d'accueil</Label>
          <StarRating
            value={data.qualiteLieu ?? 0}
            onChange={(v) => set("qualiteLieu", v)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {!hideSubmitButton && (
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
      )}
    </div>
  );
}
