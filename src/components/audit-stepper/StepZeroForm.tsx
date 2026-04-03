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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
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
  customFieldValues?: Record<string, any>;
}

// These hardcoded field keys match audit_type_custom_fields built-in defaults
// If a custom field with matching auto_key exists, it replaces the hardcoded version

interface CustomFieldDef {
  id: string;
  field_label: string;
  field_type: string;
  field_options: any;
  is_required: boolean;
  sort_order: number;
}

interface Props {
  typeEvenement: string;
  initialData?: StepZeroData;
  onSubmit: (data: StepZeroData) => void;
  hideSubmitButton?: boolean;
}

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
      customFieldValues: {},
    }
  );

  const [suggestions, setSuggestions] = useState<SuggestionLists>({
    partenaires: [],
    auditeurs: [],
    lieux: [],
    typesLieu: [],
    referents: [],
  });

  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);

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

  // Load custom fields for this audit type
  useEffect(() => {
    async function loadCustomFields() {
      const { data: fields } = await supabase
        .from("audit_type_custom_fields")
        .select("*")
        .eq("audit_type_key", typeEvenement)
        .order("sort_order");
      setCustomFields((fields as CustomFieldDef[]) || []);
    }
    loadCustomFields();
  }, [typeEvenement]);

  const set = <K extends keyof StepZeroData>(k: K, v: StepZeroData[K]) =>
    setData((prev) => {
      const next = { ...prev, [k]: v };
      if (hideSubmitButton) {
        setTimeout(() => onSubmit(next), 0);
      }
      return next;
    });

  const setCustomValue = (fieldId: string, value: any) =>
    setData((prev) => {
      const next = {
        ...prev,
        customFieldValues: { ...prev.customFieldValues, [fieldId]: value },
      };
      if (hideSubmitButton) {
        setTimeout(() => onSubmit(next), 0);
      }
      return next;
    });

  // Removed hardcoded type-specific flags — all extra fields now come from custom fields

  const isValid =
    data.partenaireAudite.trim() &&
    data.auditeur.trim() &&
    data.lieu.trim() &&
    data.typeLieu.trim() &&
    data.dateEvenement;

  const renderCustomField = (field: CustomFieldDef) => {
    const val = data.customFieldValues?.[field.id] ?? "";
    const options: string[] = field.field_options?.options || [];

    switch (field.field_type) {
      case "text":
      case "email":
      case "tel":
      case "url":
        return (
          <Input
            type={field.field_type}
            value={val}
            onChange={(e) => setCustomValue(field.id, e.target.value)}
            placeholder={field.field_label}
          />
        );
      case "textarea":
        return (
          <Textarea
            value={val}
            onChange={(e) => setCustomValue(field.id, e.target.value)}
            placeholder={field.field_label}
            rows={3}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={val}
            onChange={(e) => setCustomValue(field.id, e.target.value)}
            placeholder={field.field_label}
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={val}
            onChange={(e) => setCustomValue(field.id, e.target.value)}
          />
        );
      case "time":
        return (
          <Input
            type="time"
            value={val}
            onChange={(e) => setCustomValue(field.id, e.target.value)}
          />
        );
      case "select":
        return (
          <Select value={val} onValueChange={(v) => setCustomValue(field.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder={`Sélectionner…`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "radio":
        return (
          <RadioGroup value={val} onValueChange={(v) => setCustomValue(field.id, v)}>
            {options.map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                <Label htmlFor={`${field.id}-${opt}`} className="font-normal">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "checkbox": {
        const checkedValues: string[] = Array.isArray(val) ? val : [];
        return (
          <div className="space-y-2">
            {options.map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <Checkbox
                  id={`${field.id}-${opt}`}
                  checked={checkedValues.includes(opt)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...checkedValues, opt]
                      : checkedValues.filter((v) => v !== opt);
                    setCustomValue(field.id, next);
                  }}
                />
                <Label htmlFor={`${field.id}-${opt}`} className="font-normal">{opt}</Label>
              </div>
            ))}
          </div>
        );
      }
      case "rating":
        return (
          <StarRating
            value={typeof val === "number" ? val : 0}
            onChange={(v) => setCustomValue(field.id, v)}
          />
        );
      default:
        return (
          <Input
            value={val}
            onChange={(e) => setCustomValue(field.id, e.target.value)}
            placeholder={field.field_label}
          />
        );
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Custom fields at the top */}
      {customFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customFields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label>
                {field.field_label}
                {field.is_required && " *"}
              </Label>
              {renderCustomField(field)}
            </div>
          ))}
        </div>
      )}

      {customFields.length > 0 && (
        <div className="border-t border-border" />
      )}

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
          <Input type="time" value={data.heureEvenement} onChange={(e) => set("heureEvenement", e.target.value)} />
        </div>
      </div>

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
