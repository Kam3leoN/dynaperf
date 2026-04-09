import { useState, useEffect, useCallback } from "react";
import { AuditFormBuilder } from "@/components/AuditFormBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { stripHtmlForPreview } from "@/components/ui/rich-html-view";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faTrashCan, faPenToSquare, faFloppyDisk, faGripVertical, faLayerGroup, faCopy, faBoxArchive, faRotateLeft, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { getAuditTypeVisual } from "@/lib/auditTypeVisuals";
import type { ScoringTier } from "@/data/auditItems";

interface AuditType { id: string; key: string; label: string; version: number; version_label: string | null; is_active: boolean; color: string | null; }
interface Category { id: string; audit_type_id: string; name: string; sort_order: number; }
interface ItemConfig {
  id: string; category_id: string; sort_order: number; title: string; description: string;
  max_points: number; condition: string; scoring_rules: string | null; input_type: string;
  checklist_items: string[] | null; interets: string; comment_y_parvenir: string;
  auto_field: string | null;
}

interface CustomFieldRef {
  id: string;
  field_label: string;
  field_type: string;
}

export default function AdminAuditGridInline() {
  const [types, setTypes] = useState<AuditType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ItemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [customFieldsForType, setCustomFieldsForType] = useState<CustomFieldRef[]>([]);

  // Type CRUD dialog
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AuditType | null>(null);
  const [typeKey, setTypeKey] = useState("");
  const [typeLabel, setTypeLabel] = useState("");
  const [typeVersionLabel, setTypeVersionLabel] = useState("");
  const [typeColor, setTypeColor] = useState("");

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");

  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemConfig | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ categoryId: string; index: number } | null>(null);
  const [itemForm, setItemForm] = useState({
    category_id: "", title: "", description: "", max_points: 1,
    condition: "", scoring_rules: "", input_type: "boolean", checklist_items: "",
    interets: "", comment_y_parvenir: "", auto_field: "", auto_condition: "zero" as "zero" | "positive",
  });
  const [isAutoCalc, setIsAutoCalc] = useState(false);
  const [scoringTiers, setScoringTiers] = useState<ScoringTier[]>([]);
  const [useTiers, setUseTiers] = useState(false);
  const [scoringMode, setScoringMode] = useState<"none" | "tiers" | "increment" | "threshold">("none");
  const [incrementMin, setIncrementMin] = useState(0);
  const [incrementStep, setIncrementStep] = useState(1);
  const [thresholdOperator, setThresholdOperator] = useState<"lt" | "lte" | "eq" | "gt" | "gte">("gte");
  const [thresholdValue, setThresholdValue] = useState(0);

  // Load types
  const loadTypes = useCallback(async () => {
    const { data } = await supabase.from("audit_types").select("id, key, label, version, version_label, is_active, color").order("key").order("version", { ascending: false });
    setTypes(data || []);
    setLoading(false);
  }, [selectedTypeId]);

  useEffect(() => { loadTypes(); }, []);

  // Load categories + items when type changes
  const loadData = useCallback(async () => {
    if (!selectedTypeId) return;
    const [catRes, itemRes] = await Promise.all([
      supabase.from("audit_categories").select("*").eq("audit_type_id", selectedTypeId).order("sort_order"),
      supabase.from("audit_items_config").select("*").order("sort_order"),
    ]);
    const cats = catRes.data || [];
    setCategories(cats);
    const catIds = cats.map((c) => c.id);
    setItems(
      (itemRes.data || [])
        .filter((i) => catIds.includes(i.category_id))
        .map((i) => {
          const ext = i as Record<string, unknown>;
          return {
            ...i,
            checklist_items: Array.isArray(i.checklist_items) ? (i.checklist_items as string[]) : null,
            scoring_rules: i.scoring_rules ?? null,
            interets: typeof ext.interets === "string" ? ext.interets : "",
            comment_y_parvenir: typeof ext.comment_y_parvenir === "string" ? ext.comment_y_parvenir : "",
            auto_field: (typeof ext.auto_field === "string" ? ext.auto_field : null) as string | null,
          };
        })
    );
  }, [selectedTypeId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load custom fields for current type (for auto_field reference)
  useEffect(() => {
    if (!selectedTypeId) { setCustomFieldsForType([]); return; }
    const selectedType = types.find(t => t.id === selectedTypeId);
    if (!selectedType) return;
    supabase
      .from("audit_type_custom_fields")
      .select("id, field_label, field_type")
      .eq("audit_type_key", selectedType.key)
      .order("sort_order")
      .then(({ data }) => setCustomFieldsForType((data as CustomFieldRef[]) || []));
  }, [selectedTypeId, types]);

  // === Type CRUD ===
  const openNewType = () => { setEditingType(null); setTypeKey(""); setTypeLabel(""); setTypeVersionLabel(""); setTypeColor(""); setTypeDialogOpen(true); };
  const openEditType = (t: AuditType) => { setEditingType(t); setTypeKey(t.key); setTypeLabel(t.label); setTypeVersionLabel(t.version_label || ""); setTypeColor(t.color || ""); setTypeDialogOpen(true); };

  const saveType = async () => {
    if (!typeKey.trim() || !typeLabel.trim()) return;
    if (editingType) {
      const { error } = await supabase.from("audit_types").update({ key: typeKey.trim(), label: typeLabel.trim(), version_label: typeVersionLabel.trim() || null, color: typeColor.trim() || null }).eq("id", editingType.id);
      if (error) { toast.error("Erreur"); return; }
      toast.success("Type modifié");
    } else {
      const { data, error } = await supabase.from("audit_types").insert({ key: typeKey.trim(), label: typeLabel.trim(), version_label: typeVersionLabel.trim() || null, color: typeColor.trim() || null }).select().single();
      if (error) { toast.error("Erreur"); return; }
      toast.success("Type créé");
      if (data) setSelectedTypeId(data.id);
    }
    setTypeDialogOpen(false);
    loadTypes();
  };

  const deleteType = async (id: string) => {
    if (!confirm("Supprimer ce type d'audit et toutes ses catégories/items ?")) return;
    const { data: cats } = await supabase.from("audit_categories").select("id").eq("audit_type_id", id);
    if (cats && cats.length > 0) {
      await supabase.from("audit_items_config").delete().in("category_id", cats.map(c => c.id));
      await supabase.from("audit_categories").delete().eq("audit_type_id", id);
    }
    const { error } = await supabase.from("audit_types").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Type supprimé");
    setSelectedTypeId("");
    loadTypes();
  };

  const duplicateAsNewVersion = async (typeId: string) => {
    const source = types.find(t => t.id === typeId);
    if (!source) return;
    const sameKeyTypes = types.filter(t => t.key === source.key);
    const nextVersion = Math.max(...sameKeyTypes.map(t => t.version)) + 1;
    const versionLabel = `V${nextVersion}`;
    const { data: newType, error: typeErr } = await supabase.from("audit_types").insert({
      key: source.key, label: source.label, version: nextVersion, version_label: versionLabel, is_active: true,
    }).select().single();
    if (typeErr || !newType) { toast.error("Erreur lors de la duplication"); return; }
    const { data: srcCats } = await supabase.from("audit_categories").select("*").eq("audit_type_id", typeId).order("sort_order");
    if (srcCats) {
      for (const cat of srcCats) {
        const { data: newCat } = await supabase.from("audit_categories").insert({
          audit_type_id: newType.id, name: cat.name, sort_order: cat.sort_order,
        }).select().single();
        if (!newCat) continue;
        const { data: srcItems } = await supabase.from("audit_items_config").select("*").eq("category_id", cat.id).order("sort_order");
        if (srcItems && srcItems.length > 0) {
          await supabase.from("audit_items_config").insert(
            srcItems.map(i => ({
              category_id: newCat.id, sort_order: i.sort_order, title: i.title, description: i.description,
              max_points: i.max_points, condition: i.condition, scoring_rules: i.scoring_rules,
              input_type: i.input_type, checklist_items: i.checklist_items as unknown as string[] | null,
              interets: i.interets, comment_y_parvenir: i.comment_y_parvenir, auto_field: i.auto_field,
            }))
          );
        }
      }
    }
    toast.success(`Version ${versionLabel} créée`);
    setSelectedTypeId(newType.id);
    loadTypes();
  };

  const toggleActive = async (typeId: string, currentActive: boolean) => {
    const { error } = await supabase.from("audit_types").update({ is_active: !currentActive }).eq("id", typeId);
    if (error) { toast.error("Erreur"); return; }
    toast.success(currentActive ? "Grille archivée" : "Grille réactivée");
    loadTypes();
  };

  const openNewCat = () => { setEditingCat(null); setCatName(""); setCatDialogOpen(true); };
  const openEditCat = (cat: Category) => { setEditingCat(cat); setCatName(cat.name); setCatDialogOpen(true); };

  const saveCat = async () => {
    if (!catName.trim()) return;
    if (editingCat) {
      const { error } = await supabase.from("audit_categories").update({ name: catName.trim() }).eq("id", editingCat.id);
      if (error) { toast.error("Erreur"); return; }
      toast.success("Catégorie modifiée");
    } else {
      const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
      const { error } = await supabase.from("audit_categories").insert({
        audit_type_id: selectedTypeId, name: catName.trim(), sort_order: maxOrder + 1,
      });
      if (error) { toast.error("Erreur"); return; }
      toast.success("Catégorie ajoutée");
    }
    setCatDialogOpen(false);
    loadData();
  };

  const deleteCat = async (id: string) => {
    if (!confirm("Supprimer cette catégorie et tous ses items ?")) return;
    await supabase.from("audit_items_config").delete().eq("category_id", id);
    const { error } = await supabase.from("audit_categories").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Catégorie supprimée");
    loadData();
  };

  // === Item CRUD ===
  const sourceCustomFields = customFieldsForType.filter(f => ["number", "stat_percent", "stat_sum", "stat_diff"].includes(f.field_type));

  const openNewItem = (categoryId: string) => {
    setEditingItem(null);
    setItemForm({
      category_id: categoryId, title: "", description: "", max_points: 1,
      condition: "", scoring_rules: "", input_type: "boolean", checklist_items: "",
      interets: "", comment_y_parvenir: "", auto_field: "", auto_condition: "zero",
    });
    setIsAutoCalc(false);
    setScoringTiers([]);
    setUseTiers(false);
    setScoringMode("none");
    setIncrementMin(0);
    setIncrementStep(1);
    setThresholdOperator("gte");
    setThresholdValue(0);
    setItemDialogOpen(true);
  };

  const openEditItem = (item: ItemConfig) => {
    setEditingItem(item);
    // Parse scoring tiers or increment from scoring_rules
    let tiers: ScoringTier[] = [];
    let hasTiers = false;
    let hasIncrement = false;
    let hasThreshold = false;
    let incMin = 0;
    let incStep = 1;
    let thrOp: "lt" | "lte" | "gt" | "gte" = "gte";
    let thrVal = 0;
    if (item.scoring_rules) {
      try {
        const parsed = JSON.parse(item.scoring_rules);
        if (parsed && parsed.type === "increment") {
          hasIncrement = true;
          incMin = parsed.minValue ?? 0;
          incStep = parsed.step ?? 1;
        } else if (parsed && parsed.type === "threshold") {
          hasThreshold = true;
          thrOp = parsed.operator ?? "gte";
          thrVal = parsed.value ?? 0;
        } else if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].points === "number") {
          tiers = parsed;
          hasTiers = true;
        }
      } catch {
        /* scoring_rules JSON invalide : ignorer */
      }
    }
    const autoFieldRaw = item.auto_field || "";
    const [parsedAutoField, parsedAutoCondition] = autoFieldRaw.includes("::") ? autoFieldRaw.split("::") : [autoFieldRaw, "zero"];
    setItemForm({
      category_id: item.category_id,
      title: item.title,
      description: item.description,
      max_points: item.max_points,
      condition: item.condition,
      scoring_rules: hasTiers ? "" : (item.scoring_rules || ""),
      input_type: item.input_type,
      checklist_items: item.checklist_items ? item.checklist_items.join("\n") : "",
      interets: item.interets || "",
      comment_y_parvenir: item.comment_y_parvenir || "",
      auto_field: parsedAutoField,
      auto_condition: (parsedAutoCondition as "zero" | "positive") || "zero",
    });
    setIsAutoCalc(!!item.auto_field);
    setScoringTiers(tiers);
    setUseTiers(hasTiers);
    setScoringMode(hasThreshold ? "threshold" : hasIncrement ? "increment" : hasTiers ? "tiers" : "none");
    setIncrementMin(incMin);
    setIncrementStep(incStep);
    setThresholdOperator(thrOp);
    setThresholdValue(thrVal);
    setItemDialogOpen(true);
  };

  const saveItem = async () => {
    if (!itemForm.title.trim()) return;
    const finalScoringRules = scoringMode === "tiers" && scoringTiers.length > 0
      ? JSON.stringify(scoringTiers)
      : scoringMode === "increment"
        ? JSON.stringify({ type: "increment", minValue: incrementMin, step: incrementStep })
        : scoringMode === "threshold"
          ? JSON.stringify({ type: "threshold", operator: thresholdOperator, value: thresholdValue })
          : itemForm.scoring_rules.trim() || null;

    const payload = {
      category_id: itemForm.category_id,
      title: itemForm.title.trim(),
      description: itemForm.description.trim(),
      max_points: itemForm.max_points,
      condition: itemForm.condition.trim(),
      scoring_rules: finalScoringRules,
      input_type: itemForm.input_type,
      checklist_items: itemForm.input_type === "checklist" && itemForm.checklist_items.trim()
        ? itemForm.checklist_items.split("\n").map((s) => s.trim()).filter(Boolean)
        : null,
      interets: itemForm.interets.trim(),
      comment_y_parvenir: itemForm.comment_y_parvenir.trim(),
      auto_field: isAutoCalc && itemForm.auto_field
        ? (itemForm.input_type === "boolean" ? `${itemForm.auto_field}::${itemForm.auto_condition}` : itemForm.auto_field)
        : null,
    };

    if (editingItem) {
      const { error } = await supabase.from("audit_items_config").update(payload).eq("id", editingItem.id);
      if (error) { toast.error("Erreur"); return; }
      toast.success("Item modifié");
    } else {
      const catItems = items.filter((i) => i.category_id === itemForm.category_id);
      const maxOrder = catItems.reduce((m, i) => Math.max(m, i.sort_order), 0);
      const { error } = await supabase.from("audit_items_config").insert({ ...payload, sort_order: maxOrder + 1 });
      if (error) { toast.error("Erreur"); return; }
      toast.success("Item ajouté");
    }
    setItemDialogOpen(false);
    loadData();
  };

  const enterSaveType = () => {
    if (typeKey.trim() && typeLabel.trim()) void saveType();
  };
  const enterSaveCat = () => {
    if (catName.trim()) void saveCat();
  };
  const enterSaveItem = () => {
    if (itemForm.title.trim()) void saveItem();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Supprimer cet item ?")) return;
    const { error } = await supabase.from("audit_items_config").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Item supprimé");
    loadData();
  };

  const buildReorderedItems = (itemId: string, targetCategoryId: string, targetIndex: number) => {
    const draggedItem = items.find((item) => item.id === itemId);
    if (!draggedItem) return null;

    const byCategory = new Map(
      categories.map((category) => [
        category.id,
        items
          .filter((item) => item.category_id === category.id && item.id !== itemId)
          .sort((a, b) => a.sort_order - b.sort_order),
      ])
    );

    const targetItems = [...(byCategory.get(targetCategoryId) || [])];
    targetItems.splice(Math.max(0, Math.min(targetIndex, targetItems.length)), 0, {
      ...draggedItem,
      category_id: targetCategoryId,
    });
    byCategory.set(targetCategoryId, targetItems);

    return categories.flatMap((category) =>
      (byCategory.get(category.id) || []).map((item, index) => ({
        ...item,
        category_id: category.id,
        sort_order: index,
      }))
    );
  };

  const persistReorderedItems = async (nextItems: ItemConfig[]) => {
    setItems(nextItems);
    const results = await Promise.all(
      nextItems.map((item) =>
        supabase
          .from("audit_items_config")
          .update({ category_id: item.category_id, sort_order: item.sort_order })
          .eq("id", item.id)
      )
    );
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      toast.error(firstError.message || "Erreur lors du déplacement");
      loadData();
      return;
    }
    toast.success("Ordre des items mis à jour");
  };

  const handleItemDragStart = (itemId: string) => setDraggedItemId(itemId);

  const handleItemDrop = async (categoryId: string, index: number) => {
    if (!draggedItemId) return;
    const nextItems = buildReorderedItems(draggedItemId, categoryId, index);
    setDraggedItemId(null);
    setDropTarget(null);
    if (!nextItems) return;
    await persistReorderedItems(nextItems);
  };

  // Scoring tiers helpers
  const addTier = () => {
    const last = scoringTiers[scoringTiers.length - 1];
    const nextMin = last ? (last.max !== null ? last.max + 1 : last.min + 1) : 0;
    setScoringTiers([...scoringTiers, { min: nextMin, max: nextMin + 9, points: 0 }]);
  };
  const updateTier = (idx: number, field: keyof ScoringTier, value: number | null) => {
    setScoringTiers(scoringTiers.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };
  const removeTier = (idx: number) => {
    setScoringTiers(scoringTiers.filter((_, i) => i !== idx));
  };

  const selectedType = types.find((t) => t.id === selectedTypeId);
  const totalMaxPts = items.reduce((s, i) => s + i.max_points, 0);
  const uniqueKeys = [...new Set(types.map(t => t.key))];
  const versionsForKey = selectedKey ? types.filter(t => t.key === selectedKey) : [];

  useEffect(() => {
    if (selectedTypeId) {
      const t = types.find(t => t.id === selectedTypeId);
      if (t && t.key !== selectedKey) setSelectedKey(t.key);
    }
  }, [selectedTypeId, types]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground animate-pulse">Chargement…</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Type selection cards */}
      {!selectedTypeId && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {selectedKey ? "Sélectionner une grille" : "Sélectionner un type d'événement"}
            </h3>
            <div className="flex gap-2">
              {selectedKey && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setSelectedKey(null)}>
                  ← Retour aux types
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openNewType}>
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                Nouveau type
              </Button>
            </div>
          </div>

          {!selectedKey && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {uniqueKeys.map((key) => {
                const firstType = types.find(t => t.key === key);
                const versionCount = types.filter(t => t.key === key).length;
                const visual = getAuditTypeVisual(key, firstType?.color);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:shadow-md hover:border-transparent hover:-translate-y-1 active:scale-[0.97]"
                  >
                    <div className="flex items-center justify-center w-14 h-14 rounded-full" style={{ backgroundColor: `${visual.color}18` }}>
                      {visual.icon ? (
                        <div className="h-7 w-7" style={{ backgroundColor: visual.color, mask: `url(${visual.icon}) no-repeat center / contain`, WebkitMask: `url(${visual.icon}) no-repeat center / contain` }} />
                      ) : (
                        <FontAwesomeIcon icon={faLayerGroup} className="h-5 w-5" style={{ color: visual.color }} />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground text-center">{firstType?.label || key}</span>
                    <Badge variant="secondary" className="text-[10px]">{versionCount} version{versionCount > 1 ? "s" : ""}</Badge>
                  </button>
                );
              })}
            </div>
          )}

          {selectedKey && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {versionsForKey.map((v) => (
                <div key={v.id} className={`flex flex-col items-start gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition-all text-left ${v.is_active ? "border-border" : "border-border/50 opacity-60"}`}>
                  <div className="flex items-center gap-2 w-full">
                    <button onClick={() => setSelectedTypeId(v.id)} className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                      <FontAwesomeIcon icon={faLayerGroup} className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground truncate">{v.version_label || `V${v.version}`}</span>
                    </button>
                    {v.is_active ? (
                      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Archivée</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{v.label}</p>
                  <div className="flex items-center gap-1 w-full pt-1 border-t border-border/50">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs flex-1" onClick={() => setSelectedTypeId(v.id)}>
                      <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" /> Éditer
                    </Button>
                    <Button variant="ghost" size="sm" className={`h-7 gap-1 text-xs ${v.is_active ? "text-amber-600" : "text-emerald-600"}`} onClick={(e) => { e.stopPropagation(); toggleActive(v.id, v.is_active); }} title={v.is_active ? "Archiver" : "Réactiver"}>
                      <FontAwesomeIcon icon={v.is_active ? faBoxArchive : faRotateLeft} className="h-3 w-3" />
                      {v.is_active ? "Archiver" : "Activer"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Selected type header */}
      {selectedTypeId && selectedType && (
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => { setSelectedTypeId(""); }}>← Retour</Button>
          <span className="text-sm font-semibold text-foreground">{selectedType.label}{selectedType.version_label ? ` (${selectedType.version_label})` : ""}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditType(selectedType)}>
            <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateAsNewVersion(selectedType.id)} title="Dupliquer comme nouvelle version">
            <FontAwesomeIcon icon={faCopy} className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className={`h-8 w-8 ${selectedType.is_active ? "text-amber-600" : "text-emerald-600"}`} onClick={() => toggleActive(selectedType.id, selectedType.is_active)} title={selectedType.is_active ? "Archiver" : "Réactiver"}>
            <FontAwesomeIcon icon={selectedType.is_active ? faBoxArchive : faRotateLeft} className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { deleteType(selectedType.id); }}>
            <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
          </Button>
          {!selectedType.is_active && <Badge variant="secondary" className="text-xs">Archivée</Badge>}
          <Badge variant="outline" className="text-xs tabular-nums ml-auto">{totalMaxPts} pts max</Badge>
        </div>
      )}

      {/* Categories + Items */}
      {selectedTypeId && (
        <div className="space-y-4">
          <div className="border-b border-border pb-4 mb-4">
            <AuditFormBuilder auditTypeKey={selectedType?.key || ""} />
          </div>

          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category_id === cat.id).sort((a, b) => a.sort_order - b.sort_order);
            const catMaxPts = catItems.reduce((s, i) => s + i.max_points, 0);
            return (
              <div key={cat.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faLayerGroup} className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-sm">{cat.name}</span>
                    <Badge variant="secondary" className="text-xs tabular-nums">{catMaxPts} pts</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCat(cat)}>
                      <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCat(cat.id)}>
                      <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {catItems.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleItemDragStart(item.id)}
                      onDragEnd={() => { setDraggedItemId(null); setDropTarget(null); }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDropTarget({ categoryId: cat.id, index: idx });
                      }}
                      onDrop={() => handleItemDrop(cat.id, idx)}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors cursor-grab ${dropTarget?.categoryId === cat.id && dropTarget.index === idx ? "border-t-2 border-primary" : ""}`}
                    >
                      <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{idx + 1}</span>
                      <FontAwesomeIcon icon={faGripVertical} className="h-3 w-3 text-muted-foreground/50" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{stripHtmlForPreview(item.description, 80)}</p>
                      </div>
                      <Badge variant="outline" className="text-xs tabular-nums shrink-0">{item.max_points} pts</Badge>
                      <Badge variant="secondary" className="text-xs shrink-0">{item.input_type}</Badge>
                      {item.auto_field && <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">Auto</Badge>}
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEditItem(item)}>
                        <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteItem(item.id)}>
                        <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {catItems.length === 0 && (
                    <div
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDropTarget({ categoryId: cat.id, index: 0 });
                      }}
                      onDrop={() => handleItemDrop(cat.id, 0)}
                      className={`text-xs text-center py-4 ${dropTarget?.categoryId === cat.id && dropTarget.index === 0 ? "text-primary border-2 border-dashed border-primary rounded-lg m-2" : "text-muted-foreground"}`}
                    >
                      Aucun item
                    </div>
                  )}
                  {catItems.length > 0 && (
                    <div
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDropTarget({ categoryId: cat.id, index: catItems.length });
                      }}
                      onDrop={() => handleItemDrop(cat.id, catItems.length)}
                      className={`h-3 transition-colors ${dropTarget?.categoryId === cat.id && dropTarget.index === catItems.length ? "bg-primary/20" : "bg-transparent"}`}
                    />
                  )}
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => openNewItem(cat.id)}>
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> Ajouter un item
                  </Button>
                </div>
              </div>
            );
          })}

          {categories.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Aucune catégorie pour « {selectedType?.label || selectedType?.key} »
            </div>
          )}

          <Button variant="outline" className="gap-2" onClick={openNewCat}>
            <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" /> Ajouter une catégorie
          </Button>
        </div>
      )}

      {/* Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingType ? "Modifier le type" : "Nouveau type d'audit"}</DialogTitle>
            <DialogDescription>{editingType ? "Modifiez la clé et le libellé." : "Créez un nouveau type d'événement à auditer."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Clé (identifiant)</Label><Input value={typeKey} onChange={(e) => setTypeKey(e.target.value)} placeholder="ex: RD Présentiel" onEnterSubmit={enterSaveType} /></div>
            <div className="space-y-1.5"><Label>Libellé</Label><Input value={typeLabel} onChange={(e) => setTypeLabel(e.target.value)} placeholder="ex: Rencontre Dirigeants Présentiel" onEnterSubmit={enterSaveType} /></div>
            <div className="space-y-1.5"><Label>Label de version</Label><Input value={typeVersionLabel} onChange={(e) => setTypeVersionLabel(e.target.value)} placeholder="ex: V1, v3.0, 2026-Q1…" onEnterSubmit={enterSaveType} /></div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={typeColor || "#6b7280"} onChange={(e) => setTypeColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <Input value={typeColor} onChange={(e) => setTypeColor(e.target.value)} placeholder="#ee4540" className="flex-1" onEnterSubmit={enterSaveType} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveType} disabled={!typeKey.trim() || !typeLabel.trim()} className="gap-1.5">
              <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" /> Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
            <DialogDescription>{editingCat ? "Renommez cette catégorie." : "Ajoutez une catégorie à cette grille d'audit."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Nom</Label>
            <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="ex: Préparation" onEnterSubmit={enterSaveCat} />
          </div>
          <DialogFooter>
            <Button onClick={saveCat} disabled={!catName.trim()} className="gap-1.5">
              <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" /> Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Modifier l'item" : "Nouvel item"}</DialogTitle>
            <DialogDescription>{editingItem ? "Modifiez les propriétés de cet item." : "Ajoutez un item à cette catégorie."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} onEnterSubmit={enterSaveItem} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <RichTextEditor value={itemForm.description} onChange={(val) => setItemForm({ ...itemForm, description: val })} rows={3} />
            </div>
...
            <div className="space-y-1.5">
              <Label>Conditions de validation</Label>
              <RichTextEditor value={itemForm.condition} onChange={(val) => setItemForm({ ...itemForm, condition: val })} rows={2} />
            </div>
            {scoringMode === "none" && (
              <div className="space-y-1.5">
                <Label>Règles de scoring (optionnel)</Label>
                <RichTextEditor value={itemForm.scoring_rules} onChange={(val) => setItemForm({ ...itemForm, scoring_rules: val })} rows={2} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Quel intérêt ?</Label>
              <RichTextEditor value={itemForm.interets} onChange={(val) => setItemForm({ ...itemForm, interets: val })} rows={2} placeholder="Expliquez l'intérêt de ce critère…" />
            </div>
            <div className="space-y-1.5">
              <Label>Comment y parvenir ?</Label>
              <RichTextEditor value={itemForm.comment_y_parvenir} onChange={(val) => setItemForm({ ...itemForm, comment_y_parvenir: val })} rows={2} placeholder="Conseils pour atteindre ce critère…" />
            </div>
            {itemForm.input_type === "checklist" && (
              <div className="space-y-1.5">
                <Label>Éléments de la checklist (1 par ligne)</Label>
                <RichTextEditor value={itemForm.checklist_items} onChange={(val) => setItemForm({ ...itemForm, checklist_items: val })} rows={6} placeholder={"Ordinateur, micro, sono...\nLa présentation officielle (PPT)\nLe logiciel Dynamatch"} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={saveItem} disabled={!itemForm.title.trim()} className="gap-1.5">
              <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" /> Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
