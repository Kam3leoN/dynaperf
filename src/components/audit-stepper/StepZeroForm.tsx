import React, { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { M3Field } from "@/components/ui/m3-field";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { StarRating } from "@/components/ui/star-rating";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { RichTextarea } from "@/components/ui/rich-textarea";
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
  qualiteLieu?: number;
  // Legacy fields kept for backward compat in save logic
  heureDebutPrevue?: string;
  heureFinPrevue?: string;
  heureDebutReelle?: string;
  heureFinReelle?: string;
  nomClub?: string;
  nbAdherents?: number;
  nbInvites?: number;
  nbNoShow?: number;
  nbParticipants?: number;
  nbRdvPris?: number;
  customFieldValues?: Record<string, any>;
}

// Maps special field types to StepZeroData keys so audit save logic still works
const FIELD_TYPE_TO_DATA_KEY: Record<string, keyof StepZeroData> = {
  partenaire_autocomplete: "partenaireAudite",
  referent_autocomplete: "partenaireReferent",
  auditeur_select: "auditeur",
  city_autocomplete: "lieu",
  lieu_autocomplete: "typeLieu",
  qualite_lieu_rating: "qualiteLieu",
  qualite_rating: "qualiteLieu",
  date_picker: "dateEvenement",
  heure_picker: "heureEvenement",
  
};

interface CustomFieldDef {
  id: string;
  field_label: string;
  field_type: string;
  field_options: any;
  is_required: boolean;
  sort_order: number;
  col_span: number;
  col_offset_before: number;
  col_offset_after: number;
}

interface Props {
  typeEvenement: string;
  initialData?: StepZeroData;
  onSubmit: (data: StepZeroData) => void;
  hideSubmitButton?: boolean;
}

export function StepZeroForm({ typeEvenement, initialData, onSubmit, hideSubmitButton }: Props) {
  const isMobile = useIsMobile();
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

  const [suggestions, setSuggestions] = useState({
    partenaires: [] as string[],
    auditeurs: [] as string[],
    lieux: [] as string[],
    typesLieu: [] as string[],
    referents: [] as string[],
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

  // Backfill customFieldValues from legacy StepZeroData when editing existing audits
  useEffect(() => {
    if (customFields.length === 0 || !initialData) return;
    setData((prev) => {
      const cv = { ...prev.customFieldValues };
      let changed = false;
      for (const field of customFields) {
        if (cv[field.id] !== undefined && cv[field.id] !== "" && cv[field.id] !== null) continue;
        const dataKey = FIELD_TYPE_TO_DATA_KEY[field.field_type];
        if (dataKey && prev[dataKey] !== undefined && prev[dataKey] !== "" && prev[dataKey] !== null) {
          cv[field.id] = prev[dataKey];
          changed = true;
        }
        if (field.field_type === "time" && prev.heureEvenement) {
          cv[field.id] = prev.heureEvenement;
          changed = true;
        }
      }
      if (!changed) return prev;
      const next = { ...prev, customFieldValues: cv };
      if (hideSubmitButton) setTimeout(() => onSubmit(next), 0);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFields]);

  const setFieldValue = (fieldId: string, fieldType: string, value: any) => {
    setData((prev) => {
      const next: StepZeroData = {
        ...prev,
        customFieldValues: { ...prev.customFieldValues, [fieldId]: value },
      };
      // Map to legacy keys for backward-compatible save
      const dataKey = FIELD_TYPE_TO_DATA_KEY[fieldType];
      if (dataKey) {
        (next as any)[dataKey] = value;
      }
      if (fieldType === "time") {
        next.heureEvenement = value;
      }
      if (hideSubmitButton) {
        setTimeout(() => onSubmit(next), 0);
      }
      return next;
    });
  };

  // Auto-calculate stat_percent fields
  useEffect(() => {
    const statFields = customFields.filter((f) => f.field_type === "stat_percent");
    if (statFields.length === 0) return;
    setData((prev) => {
      const cv = { ...prev.customFieldValues };
      let changed = false;
      for (const field of statFields) {
        const numId = field.field_options?.source_numerator;
        const denId = field.field_options?.source_denominator;
        if (!numId || !denId) continue;
        const numerator = Number(cv[numId]) || 0;
        const denominator = Number(cv[denId]) || 0;
        const pct = denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
        if (cv[field.id] !== pct) {
          cv[field.id] = pct;
          changed = true;
        }
      }
      if (!changed) return prev;
      const next = { ...prev, customFieldValues: cv };
      if (hideSubmitButton) setTimeout(() => onSubmit(next), 0);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFields, data.customFieldValues]);

  // Auto-calculate stat_sum fields
  useEffect(() => {
    const sumFields = customFields.filter((f) => f.field_type === "stat_sum");
    if (sumFields.length === 0) return;
    setData((prev) => {
      const cv = { ...prev.customFieldValues };
      let changed = false;
      for (const field of sumFields) {
        const aId = field.field_options?.source_a;
        const bId = field.field_options?.source_b;
        if (!aId || !bId) continue;
        const a = Number(cv[aId]) || 0;
        const b = Number(cv[bId]) || 0;
        const result = b - a;
        if (cv[field.id] !== result) {
          cv[field.id] = result;
          changed = true;
        }
      }
      if (!changed) return prev;
      const next = { ...prev, customFieldValues: cv };
      if (hideSubmitButton) setTimeout(() => onSubmit(next), 0);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFields, data.customFieldValues]);

  // Auto-calculate stat_diff fields (A - B, raw number no sign)
  useEffect(() => {
    const diffFields = customFields.filter((f) => f.field_type === "stat_diff");
    if (diffFields.length === 0) return;
    setData((prev) => {
      const cv = { ...prev.customFieldValues };
      let changed = false;
      for (const field of diffFields) {
        const aId = field.field_options?.source_a;
        const bId = field.field_options?.source_b;
        if (!aId || !bId) continue;
        const a = Number(cv[aId]) || 0;
        const b = Number(cv[bId]) || 0;
        const result = a - b;
        if (cv[field.id] !== result) {
          cv[field.id] = result;
          changed = true;
        }
      }
      if (!changed) return prev;
      const next = { ...prev, customFieldValues: cv };
      if (hideSubmitButton) setTimeout(() => onSubmit(next), 0);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFields, data.customFieldValues]);

  const isValid = customFields
    .filter((f) => f.is_required)
    .every((f) => {
      if (f.field_type === "date_picker") return !!data.dateEvenement;
      const val = data.customFieldValues?.[f.id];
      return val !== undefined && val !== null && val !== "";
    });

  const renderField = (field: CustomFieldDef) => {
    const val = data.customFieldValues?.[field.id] ?? "";
    const options: string[] = field.field_options?.options || [];

    switch (field.field_type) {
      case "partenaire_autocomplete":
        return (
          <AutocompleteInput
            value={val}
            onChange={(v) => setFieldValue(field.id, field.field_type, v)}
            suggestions={suggestions.partenaires}
            placeholder="ex: Émilie BLAISE"
          />
        );
      case "referent_autocomplete":
        return (
          <AutocompleteInput
            value={val}
            onChange={(v) => setFieldValue(field.id, field.field_type, v)}
            suggestions={suggestions.referents}
            placeholder="ex: Marie DUPONT"
          />
        );
      case "auditeur_select":
        return suggestions.auditeurs.length > 0 ? (
          <Select value={val} onValueChange={(v) => setFieldValue(field.id, field.field_type, v)}>
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
            value={val}
            onChange={(e) => setFieldValue(field.id, field.field_type, e.target.value)}
            placeholder="ex: Cédric MALZAT"
          />
        );
      case "city_autocomplete":
        return (
          <CityAutocomplete
            value={val}
            onChange={(v) => setFieldValue(field.id, field.field_type, v)}
            placeholder="ex: Troyes ou 10000"
          />
        );
      case "lieu_autocomplete":
        return (
          <AutocompleteInput
            value={val}
            onChange={(v) => setFieldValue(field.id, field.field_type, v)}
            suggestions={suggestions.typesLieu}
            placeholder="ex: Hôtel, Restaurant..."
          />
        );
      case "qualite_lieu_rating":
      case "qualite_rating":
        return (
          <StarRating
            value={typeof val === "number" ? val : 0}
            onChange={(v) => setFieldValue(field.id, field.field_type, v)}
          />
        );
      case "heure_picker":
        return (
          <Input
            type="time"
            value={val}
            onChange={(e) => setFieldValue(field.id, field.field_type, e.target.value)}
          />
        );
      case "stat_percent": {
        const numId = field.field_options?.source_numerator;
        const denId = field.field_options?.source_denominator;
        const numerator = Number(data.customFieldValues?.[numId]) || 0;
        const denominator = Number(data.customFieldValues?.[denId]) || 0;
        const pct = denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;
        return (
          <div className="flex items-center gap-2 h-12 px-4 rounded-xl border border-input bg-muted text-sm cursor-not-allowed">
            <span className="font-semibold text-foreground">
              {pct !== null ? `${pct} %` : "—"}
            </span>
            <span className="text-muted-foreground text-xs">
              {denominator > 0 ? `(${numerator} / ${denominator})` : ""}
            </span>
          </div>
        );
      }
      case "stat_sum": {
        const aId = field.field_options?.source_a;
        const bId = field.field_options?.source_b;
        const a = Number(data.customFieldValues?.[aId]) || 0;
        const b = Number(data.customFieldValues?.[bId]) || 0;
        const result = b - a;
        const displayPrefix = result > 0 ? "+" : "";
        return (
          <div className="flex items-center gap-2 h-12 px-4 rounded-xl border border-input bg-muted text-sm cursor-not-allowed">
            <span className={`font-semibold ${result > 0 ? "text-green-600 dark:text-green-400" : result < 0 ? "text-red-500 dark:text-red-400" : "text-foreground"}`}>
              {displayPrefix}{result}
            </span>
            <span className="text-muted-foreground text-xs">
              (B:{b} − A:{a})
            </span>
          </div>
        );
      }
      case "date_picker":
        return (
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
                onSelect={(d) => setFieldValue(field.id, field.field_type, d)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        );
      // --- Standard types ---
      case "text":
      case "email":
      case "tel":
      case "url":
        return (
          <Input
            type={field.field_type}
            value={val}
            onChange={(e) => setFieldValue(field.id, field.field_type, e.target.value)}
            placeholder={field.field_label}
          />
        );
      case "textarea":
        return (
          <RichTextarea
            value={val}
            onChange={(v) => setFieldValue(field.id, field.field_type, v)}
            placeholder={field.field_label}
            rows={3}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={val}
            onChange={(e) => setFieldValue(field.id, field.field_type, e.target.value)}
            placeholder={field.field_label}
          />
        );
      case "date":
        return (
          <Input type="date" value={val} onChange={(e) => setFieldValue(field.id, field.field_type, e.target.value)} />
        );
      case "time":
        return (
          <Input type="time" value={val} onChange={(e) => setFieldValue(field.id, field.field_type, e.target.value)} />
        );
      case "select":
        return (
          <Select value={val} onValueChange={(v) => setFieldValue(field.id, field.field_type, v)}>
            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "radio":
        return (
          <RadioGroup value={val} onValueChange={(v) => setFieldValue(field.id, field.field_type, v)}>
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
                    setFieldValue(field.id, field.field_type, next);
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
            onChange={(v) => setFieldValue(field.id, field.field_type, v)}
          />
        );
      default:
        return (
          <Input
            value={val}
            onChange={(e) => setFieldValue(field.id, field.field_type, e.target.value)}
            placeholder={field.field_label}
          />
        );
    }
  };

  return (
    <div className="space-y-5">
      {customFields.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
          Aucun champ configuré pour ce type d'audit. Configurez les champs dans l'administration.
        </p>
      ) : (
        <div
          className="gap-4"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(12, 1fr)",
          }}
        >
          {customFields.map((field) => {
            const span = field.col_span || 6;
            const before = field.col_offset_before || 0;
            const after = field.col_offset_after || 0;
            const val = data.customFieldValues?.[field.id] ?? "";
            const isFilled = val !== "" && val !== null && val !== undefined && val !== 0;
            return (
              <React.Fragment key={field.id}>
                {!isMobile && before > 0 && (
                  <div style={{ gridColumn: `span ${before} / span ${before}` }} />
                )}
                <div style={isMobile ? undefined : { gridColumn: `span ${span} / span ${span}` }}>
                  <M3Field
                    label={field.field_label}
                    required={field.is_required}
                    filled={isFilled}
                  >
                    {renderField(field)}
                  </M3Field>
                  {(field.field_type === "stat_percent" || field.field_type === "stat_sum" || field.field_type === "stat_diff") && (
                    <p className="text-[10px] text-muted-foreground mt-1 ml-1 italic">Calcul automatique</p>
                  )}
                </div>
                {!isMobile && after > 0 && (
                  <div style={{ gridColumn: `span ${after} / span ${after}` }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
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
