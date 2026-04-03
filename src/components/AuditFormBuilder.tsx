import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faXmark, faEye, faWrench,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { StepZeroForm } from "@/components/audit-stepper/StepZeroForm";
import { FieldLayoutEditor, type LayoutDraftItem, type LayoutEditorField } from "@/components/admin/FieldLayoutEditor";

interface CustomField {
  id: string;
  audit_type_key: string;
  field_label: string;
  field_type: string;
  field_options: any;
  is_required: boolean;
  sort_order: number;
  col_span: number;
  col_offset_before: number;
  col_offset_after: number;
}

const FIELD_TYPES_STANDARD = [
  { value: "text", label: "Texte" },
  { value: "textarea", label: "Zone de texte" },
  { value: "number", label: "Nombre" },
  { value: "date", label: "Date (simple)" },
  { value: "time", label: "Heure" },
  { value: "select", label: "Liste déroulante" },
  { value: "radio", label: "Choix unique" },
  { value: "checkbox", label: "Cases à cocher" },
  { value: "rating", label: "Évaluation (étoiles)" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Téléphone" },
  { value: "url", label: "URL" },
];

const FIELD_TYPES_SMART = [
  { value: "partenaire_autocomplete", label: "🔗 Partenaire (autocomplete)" },
  { value: "referent_autocomplete", label: "🔗 Référent (autocomplete)" },
  { value: "auditeur_select", label: "🔗 Auditeur (sélection profils)" },
  { value: "city_autocomplete", label: "🔗 Ville (autocomplete)" },
  { value: "lieu_autocomplete", label: "🔗 Lieu (autocomplete)" },
  { value: "qualite_rating", label: "🔗 Qualité (étoiles, libellé libre)" },
  { value: "qualite_lieu_rating", label: "🔗 Qualité lieu (étoiles) [ancien]" },
  { value: "date_picker", label: "🔗 Date (calendrier)" },
  { value: "heure_picker", label: "🔗 Heure (saisie)" },
  { value: "stat_percent", label: "📊 Statistique % (calcul auto)" },
  { value: "stat_sum", label: "📊 Somme (calcul auto)" },
];

const ALL_FIELD_TYPES = [...FIELD_TYPES_SMART, ...FIELD_TYPES_STANDARD];

interface Props {
  auditTypeKey: string;
}

export function AuditFormBuilder({ auditTypeKey }: Props) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [isRequired, setIsRequired] = useState(false);
  const [colSpan, setColSpan] = useState(6);
  const [selectOptions, setSelectOptions] = useState<string[]>([""]);
  const [sourceNumerator, setSourceNumerator] = useState("");
  const [sourceDenominator, setSourceDenominator] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  // For "add at position" from the grid
  const [addAtPosition, setAddAtPosition] = useState<{ colStart: number; colSpan: number; rowIndex: number } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("audit_type_custom_fields")
      .select("*")
      .eq("audit_type_key", auditTypeKey)
      .order("sort_order");
    setFields((data as CustomField[]) || []);
    setLoading(false);
  }, [auditTypeKey]);

  useEffect(() => { load(); }, [load]);

  const openNew = (colStart?: number, span?: number) => {
    setEditing(null);
    setFieldLabel("");
    setFieldType("text");
    setIsRequired(false);
    setColSpan(span || 6);
    setSelectOptions([""]);
    setSourceNumerator("");
    setSourceDenominator("");
    if (colStart && span) {
      setAddAtPosition({ colStart, colSpan: span, rowIndex: 0 });
    } else {
      setAddAtPosition(null);
    }
    setDialogOpen(true);
  };

  const openEdit = (fieldId: string) => {
    const f = fields.find((field) => field.id === fieldId);
    if (!f) return;
    setEditing(f);
    setFieldLabel(f.field_label);
    setFieldType(f.field_type);
    setIsRequired(f.is_required);
    setColSpan(f.col_span || 6);
    const opts = f.field_options?.options;
    setSelectOptions(Array.isArray(opts) && opts.length > 0 ? opts : [""]);
    setSourceNumerator(f.field_options?.source_numerator || "");
    setSourceDenominator(f.field_options?.source_denominator || "");
    setAddAtPosition(null);
    setDialogOpen(true);
  };

  const needsOptions = ["select", "radio", "checkbox"].includes(fieldType);
  const isStatPercent = fieldType === "stat_percent";
  const isStatSum = fieldType === "stat_sum";
  const needsSources = isStatPercent || isStatSum;
  const numberFields = fields.filter((f) => f.field_type === "number");

  const editorFields = useMemo<LayoutEditorField[]>(() =>
    fields.map((f) => ({
      id: f.id,
      field_label: f.field_label,
      sort_order: f.sort_order,
      col_span: f.col_span || 6,
      col_offset_before: f.col_offset_before || 0,
      col_offset_after: f.col_offset_after || 0,
    })),
    [fields]
  );

  const handleLayoutChange = useCallback(async (nextLayout: LayoutDraftItem[]) => {
    await Promise.all(
      nextLayout.map((item) =>
        supabase.from("audit_type_custom_fields").update({
          sort_order: item.sort_order,
          col_span: item.col_span,
          col_offset_before: item.col_offset_before,
          col_offset_after: item.col_offset_after,
        }).eq("id", item.id)
      )
    );
    load();
  }, [load]);

  const save = async () => {
    if (!fieldLabel.trim()) { toast.error("Libellé requis"); return; }
    const validOpts = selectOptions.filter((o) => o.trim());
    if (needsOptions && validOpts.length < 2) { toast.error("Au moins 2 options requises"); return; }

    let fieldOpts: any = null;
    if (needsOptions) {
      fieldOpts = { options: validOpts };
    } else if (needsSources) {
      if (!sourceNumerator || !sourceDenominator) { toast.error("Sélectionnez les deux champs sources"); return; }
      fieldOpts = isStatPercent
        ? { source_numerator: sourceNumerator, source_denominator: sourceDenominator }
        : { source_a: sourceNumerator, source_b: sourceDenominator };
    }

    const payload = {
      audit_type_key: auditTypeKey,
      field_label: fieldLabel.trim(),
      field_type: fieldType,
      is_required: isRequired,
      field_options: fieldOpts,
      sort_order: editing ? editing.sort_order : fields.length,
      col_span: colSpan,
      col_offset_before: addAtPosition ? Math.max(addAtPosition.colStart - 1, 0) : 0,
      col_offset_after: 0,
    };

    if (editing) {
      const { error } = await supabase.from("audit_type_custom_fields").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Champ modifié");
    } else {
      const { error } = await supabase.from("audit_type_custom_fields").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Champ ajouté");
    }

    setDialogOpen(false);
    setAddAtPosition(null);
    load();
  };

  const deleteField = async (id: string) => {
    await supabase.from("audit_type_custom_fields").delete().eq("id", id);
    toast.success("Champ supprimé");
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground py-4">Chargement…</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Champs du formulaire</h3>
          <p className="text-xs text-muted-foreground">Construisez le formulaire « Informations générales » de cet audit</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={previewMode ? "default" : "outline"}
            size="sm"
            onClick={() => { setPreviewMode(!previewMode); setPreviewKey((k) => k + 1); }}
            className="gap-1.5"
          >
            <FontAwesomeIcon icon={previewMode ? faWrench : faEye} className="h-3 w-3" />
            {previewMode ? "Éditeur" : "Aperçu"}
          </Button>
          {!previewMode && (
            <Button variant="outline" size="sm" onClick={() => openNew()} className="gap-1.5">
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      {previewMode ? (
        <div className="border border-dashed border-primary/30 rounded-2xl p-4 bg-muted/30">
          <p className="text-xs text-primary font-medium mb-3 text-center">
            👁️ Aperçu du rendu en remplissage
          </p>
          <StepZeroForm
            key={previewKey}
            typeEvenement={auditTypeKey}
            onSubmit={() => {}}
            hideSubmitButton
          />
        </div>
      ) : (
        <>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
              Aucun champ. Cliquez sur « Ajouter » ou sur le + dans la grille.
            </p>
          ) : null}

          <FieldLayoutEditor
            fields={editorFields}
            onLayoutChange={handleLayoutChange}
            onEdit={openEdit}
            onDelete={deleteField}
            onAdd={(colStart, span, _rowIndex) => openNew(colStart, span)}
          />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setAddAtPosition(null); }}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le champ" : "Ajouter un champ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Libellé *</Label>
                  <Input value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} placeholder="ex: Nombre de participants" />
                </div>
                <div className="space-y-1.5">
                  <Label>Type de champ</Label>
                  <Select value={fieldType} onValueChange={setFieldType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Champs intelligents</SelectLabel>
                        {FIELD_TYPES_SMART.map((ft) => (
                          <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Champs standards</SelectLabel>
                        {FIELD_TYPES_STANDARD.map((ft) => (
                          <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Largeur (colonnes)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {[2, 3, 4, 6, 8, 9, 12].map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant={colSpan === s ? "default" : "outline"}
                        size="sm"
                        className="h-7 rounded-full px-2.5 text-xs"
                        onClick={() => setColSpan(s)}
                      >
                        {s}/12
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch checked={isRequired} onCheckedChange={setIsRequired} id="req" />
                  <Label htmlFor="req">Champ obligatoire</Label>
                </div>

                {needsOptions && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {selectOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const next = [...selectOptions];
                            next[i] = e.target.value;
                            setSelectOptions(next);
                          }}
                          placeholder={`Option ${i + 1}`}
                        />
                        {selectOptions.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectOptions(selectOptions.filter((_, j) => j !== i))}>
                            <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setSelectOptions([...selectOptions, ""])} className="gap-1.5">
                      <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> Ajouter une option
                    </Button>
                  </div>
                )}

                {needsSources && (
                  <div className="space-y-3">
                    <Label>{isStatPercent ? "Champ numérateur" : "Champ 1 (nombre)"}</Label>
                    <Select value={sourceNumerator} onValueChange={setSourceNumerator}>
                      <SelectTrigger><SelectValue placeholder={isStatPercent ? "Sélectionner le numérateur" : "Sélectionner le champ 1"} /></SelectTrigger>
                      <SelectContent>
                        {numberFields.map((nf) => (
                          <SelectItem key={nf.id} value={nf.id}>{nf.field_label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Label>{isStatPercent ? "Champ dénominateur" : "Champ 2 (nombre)"}</Label>
                    <Select value={sourceDenominator} onValueChange={setSourceDenominator}>
                      <SelectTrigger><SelectValue placeholder={isStatPercent ? "Sélectionner le dénominateur" : "Sélectionner le champ 2"} /></SelectTrigger>
                      <SelectContent>
                        {numberFields.map((nf) => (
                          <SelectItem key={nf.id} value={nf.id}>{nf.field_label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {numberFields.length === 0 && (
                      <p className="text-xs text-muted-foreground">Ajoutez d'abord des champs « Nombre » pour configurer le calcul.</p>
                    )}
                  </div>
                )}
              </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setAddAtPosition(null); }}>Annuler</Button>
            <Button onClick={save}>{editing ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
