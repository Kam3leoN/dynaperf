import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faTrashCan, faPenToSquare, faGripVertical, faXmark, faEye, faWrench,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { StepZeroForm } from "@/components/audit-stepper/StepZeroForm";

interface CustomField {
  id: string;
  audit_type_key: string;
  field_label: string;
  field_type: string;
  field_options: any;
  is_required: boolean;
  sort_order: number;
  col_span: number;
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
];

const ALL_FIELD_TYPES = [...FIELD_TYPES_SMART, ...FIELD_TYPES_STANDARD];

const COL_SPAN_OPTIONS = [
  { value: 3, label: "3/12 — ¼" },
  { value: 4, label: "4/12 — ⅓" },
  { value: 6, label: "6/12 — ½" },
  { value: 8, label: "8/12 — ⅔" },
  { value: 9, label: "9/12 — ¾" },
  { value: 12, label: "12/12 — Plein" },
];

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
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [sourceNumerator, setSourceNumerator] = useState("");
  const [sourceDenominator, setSourceDenominator] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  // Force StepZeroForm remount on toggle
  const [previewKey, setPreviewKey] = useState(0);

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

  const openNew = () => {
    setEditing(null);
    setFieldLabel("");
    setFieldType("text");
    setIsRequired(false);
    setColSpan(6);
    setSelectOptions([""]);
    setSourceNumerator("");
    setSourceDenominator("");
    setDialogOpen(true);
  };

  const openEdit = (f: CustomField) => {
    setEditing(f);
    setFieldLabel(f.field_label);
    setFieldType(f.field_type);
    setIsRequired(f.is_required);
    setColSpan(f.col_span || 6);
    const opts = f.field_options?.options;
    setSelectOptions(Array.isArray(opts) && opts.length > 0 ? opts : [""]);
    setSourceNumerator(f.field_options?.source_numerator || "");
    setSourceDenominator(f.field_options?.source_denominator || "");
    setDialogOpen(true);
  };

  const needsOptions = ["select", "radio", "checkbox"].includes(fieldType);
  const isStatPercent = fieldType === "stat_percent";
  const numberFields = fields.filter((f) => f.field_type === "number");

  const save = async () => {
    if (!fieldLabel.trim()) { toast.error("Libellé requis"); return; }
    const validOpts = selectOptions.filter((o) => o.trim());
    if (needsOptions && validOpts.length < 2) { toast.error("Au moins 2 options requises"); return; }

    let fieldOpts: any = null;
    if (needsOptions) {
      fieldOpts = { options: validOpts };
    } else if (isStatPercent) {
      if (!sourceNumerator || !sourceDenominator) { toast.error("Sélectionnez les deux champs sources"); return; }
      fieldOpts = { source_numerator: sourceNumerator, source_denominator: sourceDenominator };
    }

    const payload = {
      audit_type_key: auditTypeKey,
      field_label: fieldLabel.trim(),
      field_type: fieldType,
      is_required: isRequired,
      field_options: fieldOpts,
      sort_order: editing ? editing.sort_order : fields.length,
      col_span: colSpan,
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
    load();
  };

  const deleteField = async (id: string) => {
    await supabase.from("audit_type_custom_fields").delete().eq("id", id);
    toast.success("Champ supprimé");
    load();
  };

  // Drag and drop reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setFields(reordered);
    setDragIdx(idx);
  };
  const handleDragEnd = async () => {
    setDragIdx(null);
    await Promise.all(
      fields.map((f, i) =>
        supabase.from("audit_type_custom_fields").update({ sort_order: i }).eq("id", f.id)
      )
    );
  };

  const getTypeLabel = (t: string) => ALL_FIELD_TYPES.find((ft) => ft.value === t)?.label || t;

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
            <Button variant="outline" size="sm" onClick={openNew} className="gap-1.5">
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
              Aucun champ. Cliquez sur « Ajouter » pour construire votre formulaire.
            </p>
          ) : (
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <Card
                  key={f.id}
                  className={`group cursor-grab ${dragIdx === idx ? "opacity-50" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                >
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <FontAwesomeIcon icon={faGripVertical} className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{f.field_label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{getTypeLabel(f.field_type)}</Badge>
                        {f.is_required && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Requis</Badge>}
                        <Badge variant="outline" className="text-[10px]">{f.col_span || 6}/12 col</Badge>
                        {f.field_options?.options && (
                          <span className="text-[10px] text-muted-foreground">{f.field_options.options.length} options</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                        <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteField(f.id)}>
                        <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl max-h-[85vh] overflow-y-auto">
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

            {/* Column span selector */}
            <div className="space-y-2">
              <Label>Largeur (colonnes sur 12)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[colSpan]}
                  onValueChange={([v]) => setColSpan(v)}
                  min={1}
                  max={12}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-mono font-semibold w-12 text-center bg-muted rounded px-2 py-1">{colSpan}/12</span>
              </div>
              {/* Visual preview bar */}
              <div className="grid grid-cols-12 gap-0.5 h-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-sm transition-colors ${i < colSpan ? "bg-primary" : "bg-muted"}`}
                  />
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

            {isStatPercent && (
              <div className="space-y-3">
                <Label>Champ numérateur</Label>
                <Select value={sourceNumerator} onValueChange={setSourceNumerator}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner le numérateur" /></SelectTrigger>
                  <SelectContent>
                    {numberFields.map((nf) => (
                      <SelectItem key={nf.id} value={nf.id}>{nf.field_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label>Champ dénominateur</Label>
                <Select value={sourceDenominator} onValueChange={setSourceDenominator}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner le dénominateur" /></SelectTrigger>
                  <SelectContent>
                    {numberFields.map((nf) => (
                      <SelectItem key={nf.id} value={nf.id}>{nf.field_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {numberFields.length === 0 && (
                  <p className="text-xs text-muted-foreground">Ajoutez d'abord des champs « Nombre » pour configurer la statistique.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save}>{editing ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
