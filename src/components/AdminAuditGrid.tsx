import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faTrashCan, faPenToSquare, faFloppyDisk, faGripVertical, faLayerGroup, faCopy,
} from "@fortawesome/free-solid-svg-icons";

interface AuditType { id: string; key: string; label: string; version: number; version_label: string | null; is_active: boolean; }
interface Category { id: string; audit_type_id: string; name: string; sort_order: number; }
interface ItemConfig {
  id: string; category_id: string; sort_order: number; title: string; description: string;
  max_points: number; condition: string; scoring_rules: string | null; input_type: string;
  checklist_items: string[] | null; interets: string; comment_y_parvenir: string;
}

export default function AdminAuditGridInline() {
  const [types, setTypes] = useState<AuditType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ItemConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Type CRUD dialog
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AuditType | null>(null);
  const [typeKey, setTypeKey] = useState("");
  const [typeLabel, setTypeLabel] = useState("");

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");

  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemConfig | null>(null);
  const [itemForm, setItemForm] = useState({
    category_id: "", title: "", description: "", max_points: 1,
    condition: "", scoring_rules: "", input_type: "boolean", checklist_items: "",
    interets: "", comment_y_parvenir: "",
  });

  // Load types
  const loadTypes = useCallback(async () => {
    const { data } = await supabase.from("audit_types").select("id, key, label, version, version_label, is_active").order("key").order("version", { ascending: false });
    setTypes(data || []);
    if (data && data.length > 0 && !selectedTypeId) setSelectedTypeId(data[0].id);
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
        .map((i) => ({
          ...i,
          checklist_items: Array.isArray(i.checklist_items) ? (i.checklist_items as string[]) : null,
          scoring_rules: i.scoring_rules ?? null,
          interets: (i as any).interets ?? "",
          comment_y_parvenir: (i as any).comment_y_parvenir ?? "",
        }))
    );
  }, [selectedTypeId]);

  useEffect(() => { loadData(); }, [loadData]);

  // === Type CRUD ===
  const openNewType = () => { setEditingType(null); setTypeKey(""); setTypeLabel(""); setTypeDialogOpen(true); };
  const openEditType = (t: AuditType) => { setEditingType(t); setTypeKey(t.key); setTypeLabel(t.label); setTypeDialogOpen(true); };

  const saveType = async () => {
    if (!typeKey.trim() || !typeLabel.trim()) return;
    if (editingType) {
      const { error } = await supabase.from("audit_types").update({ key: typeKey.trim(), label: typeLabel.trim() }).eq("id", editingType.id);
      if (error) { toast.error("Erreur"); return; }
      toast.success("Type modifié");
    } else {
      const { data, error } = await supabase.from("audit_types").insert({ key: typeKey.trim(), label: typeLabel.trim() }).select().single();
      if (error) { toast.error("Erreur"); return; }
      toast.success("Type créé");
      if (data) setSelectedTypeId(data.id);
    }
    setTypeDialogOpen(false);
    loadTypes();
  };

  const deleteType = async (id: string) => {
    if (!confirm("Supprimer ce type d'audit et toutes ses catégories/items ?")) return;
    // Delete items in categories of this type first
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

  // === Category CRUD ===
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
  const openNewItem = (categoryId: string) => {
    setEditingItem(null);
    setItemForm({
      category_id: categoryId, title: "", description: "", max_points: 1,
      condition: "", scoring_rules: "", input_type: "boolean", checklist_items: "",
      interets: "", comment_y_parvenir: "",
    });
    setItemDialogOpen(true);
  };

  const openEditItem = (item: ItemConfig) => {
    setEditingItem(item);
    setItemForm({
      category_id: item.category_id,
      title: item.title,
      description: item.description,
      max_points: item.max_points,
      condition: item.condition,
      scoring_rules: item.scoring_rules || "",
      input_type: item.input_type,
      checklist_items: item.checklist_items ? item.checklist_items.join("\n") : "",
      interets: item.interets || "",
      comment_y_parvenir: item.comment_y_parvenir || "",
    });
    setItemDialogOpen(true);
  };

  const saveItem = async () => {
    if (!itemForm.title.trim()) return;
    const payload = {
      category_id: itemForm.category_id,
      title: itemForm.title.trim(),
      description: itemForm.description.trim(),
      max_points: itemForm.max_points,
      condition: itemForm.condition.trim(),
      scoring_rules: itemForm.scoring_rules.trim() || null,
      input_type: itemForm.input_type,
      checklist_items: itemForm.input_type === "checklist" && itemForm.checklist_items.trim()
        ? itemForm.checklist_items.split("\n").map((s) => s.trim()).filter(Boolean)
        : null,
      interets: itemForm.interets.trim(),
      comment_y_parvenir: itemForm.comment_y_parvenir.trim(),
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

  const deleteItem = async (id: string) => {
    if (!confirm("Supprimer cet item ?")) return;
    const { error } = await supabase.from("audit_items_config").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Item supprimé");
    loadData();
  };

  const selectedType = types.find((t) => t.id === selectedTypeId);
  const totalMaxPts = items.reduce((s, i) => s + i.max_points, 0);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground animate-pulse">Chargement…</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Type selector + CRUD */}
      <div className="flex items-center gap-3 flex-wrap">
        <Label className="text-sm shrink-0">Type d'événement</Label>
        <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.label || t.key}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedType && (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditType(selectedType)}>
              <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteType(selectedType.id)}>
              <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" className="gap-1.5 text-xs ml-auto" onClick={openNewType}>
          <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
          Nouveau type
        </Button>
        {selectedTypeId && (
          <Badge variant="outline" className="text-xs tabular-nums">
            {totalMaxPts} pts max
          </Badge>
        )}
      </div>

      {/* Categories + Items */}
      {selectedTypeId && (
        <div className="space-y-4">
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
                    <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors">
                      <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{idx + 1}</span>
                      <FontAwesomeIcon icon={faGripVertical} className="h-3 w-3 text-muted-foreground/50" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description.slice(0, 80)}{item.description.length > 80 ? "…" : ""}</p>
                      </div>
                      <Badge variant="outline" className="text-xs tabular-nums shrink-0">{item.max_points} pts</Badge>
                      <Badge variant="secondary" className="text-xs shrink-0">{item.input_type}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEditItem(item)}>
                        <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteItem(item.id)}>
                        <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {catItems.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Aucun item</p>
                  )}
                </div>

                <div className="px-4 py-2 border-t border-border">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => openNewItem(cat.id)}>
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                    Ajouter un item
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
            <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
            Ajouter une catégorie
          </Button>
        </div>
      )}

      {/* Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingType ? "Modifier le type" : "Nouveau type d'audit"}</DialogTitle>
            <DialogDescription>
              {editingType ? "Modifiez la clé et le libellé." : "Créez un nouveau type d'événement à auditer."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Clé (identifiant)</Label>
              <Input value={typeKey} onChange={(e) => setTypeKey(e.target.value)} placeholder="ex: RD Présentiel" />
            </div>
            <div className="space-y-1.5">
              <Label>Libellé</Label>
              <Input value={typeLabel} onChange={(e) => setTypeLabel(e.target.value)} placeholder="ex: Rencontre Dirigeants Présentiel" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveType} disabled={!typeKey.trim() || !typeLabel.trim()} className="gap-1.5">
              <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
            <DialogDescription>
              {editingCat ? "Renommez cette catégorie." : "Ajoutez une catégorie à cette grille d'audit."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Nom</Label>
            <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="ex: Préparation" />
          </div>
          <DialogFooter>
            <Button onClick={saveCat} disabled={!catName.trim()} className="gap-1.5">
              <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Modifier l'item" : "Nouvel item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Modifiez les propriétés de cet item." : "Ajoutez un item à cette catégorie."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Points max</Label>
                <Input type="number" min={1} value={itemForm.max_points} onChange={(e) => setItemForm({ ...itemForm, max_points: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type de saisie</Label>
                <Select value={itemForm.input_type} onValueChange={(v) => setItemForm({ ...itemForm, input_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boolean">Oui / Non</SelectItem>
                    <SelectItem value="number">Nombre</SelectItem>
                    <SelectItem value="checklist">Checklist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Conditions de validation</Label>
              <Textarea value={itemForm.condition} onChange={(e) => setItemForm({ ...itemForm, condition: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Règles de scoring (optionnel)</Label>
              <Textarea value={itemForm.scoring_rules} onChange={(e) => setItemForm({ ...itemForm, scoring_rules: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Quel intérêt ?</Label>
              <Textarea value={itemForm.interets} onChange={(e) => setItemForm({ ...itemForm, interets: e.target.value })} rows={2} placeholder="Expliquez l'intérêt de ce critère…" />
            </div>
            <div className="space-y-1.5">
              <Label>Comment y parvenir ?</Label>
              <Textarea value={itemForm.comment_y_parvenir} onChange={(e) => setItemForm({ ...itemForm, comment_y_parvenir: e.target.value })} rows={2} placeholder="Conseils pour atteindre ce critère…" />
            </div>
            {itemForm.input_type === "checklist" && (
              <div className="space-y-1.5">
                <Label>Éléments de la checklist (1 par ligne)</Label>
                <Textarea
                  value={itemForm.checklist_items}
                  onChange={(e) => setItemForm({ ...itemForm, checklist_items: e.target.value })}
                  rows={6}
                  placeholder="Ordinateur, micro, sono...&#10;La présentation officielle (PPT)&#10;Le logiciel Dynamatch"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={saveItem} disabled={!itemForm.title.trim()} className="gap-1.5">
              <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
