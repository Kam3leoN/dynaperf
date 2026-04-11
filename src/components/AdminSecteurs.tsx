import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan, faPenToSquare, faFloppyDisk, faGripVertical } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { FranceSectorsMap } from "@/components/admin/FranceSectorsMap";

interface Secteur {
  id: string;
  nom: string;
  departements: string[];
  color_hex?: string | null;
  created_at: string;
}

const SECTOR_COLOR_PALETTE = [
  "#EE4540", "#2563EB", "#16A34A", "#D97706", "#9333EA", "#0891B2", "#E11D48", "#4F46E5",
];

// All French departments
const ALL_DEPARTMENTS = [
  "01","02","03","04","05","06","07","08","09","10",
  "11","12","13","14","15","16","17","18","19","2A","2B",
  "21","22","23","24","25","26","27","28","29","30",
  "31","32","33","34","35","36","37","38","39","40",
  "41","42","43","44","45","46","47","48","49","50",
  "51","52","53","54","55","56","57","58","59","60",
  "61","62","63","64","65","66","67","68","69","70",
  "71","72","73","74","75","76","77","78","79","80",
  "81","82","83","84","85","86","87","88","89","90",
  "91","92","93","94","95",
  "971","972","973","974","976"
];

export default function AdminSecteurs() {
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState("");
  const [creating, setCreating] = useState(false);
  const [dndOpen, setDndOpen] = useState(false);
  const [draggedDept, setDraggedDept] = useState<string | null>(null);
  const [localSecteurs, setLocalSecteurs] = useState<Secteur[]>([]);
  const [savingDepts, setSavingDepts] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("secteurs").select("*").order("nom");
    if (data) setSecteurs(data as Secteur[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("secteurs").insert({
      nom: newNom.trim(),
      color_hex: SECTOR_COLOR_PALETTE[secteurs.length % SECTOR_COLOR_PALETTE.length],
    });
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Secteur créé"); setNewNom(""); setCreateOpen(false); load(); }
    setCreating(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editNom.trim()) return;
    const row = secteurs.find((s) => s.id === id);
    const { error } = await supabase
      .from("secteurs")
      .update({ nom: editNom.trim(), color_hex: row?.color_hex ?? null })
      .eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Secteur mis à jour"); setEditId(null); load(); }
  };

  const handleColorChange = async (id: string, hex: string) => {
    const v = hex.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(v)) return;
    const { error } = await supabase.from("secteurs").update({ color_hex: v }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setSecteurs((prev) => prev.map((s) => (s.id === id ? { ...s, color_hex: v } : s)));
      toast.success("Couleur enregistrée");
    }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (!confirm(`Supprimer le secteur "${nom}" ?`)) return;
    const { error } = await supabase.from("secteurs").delete().eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Secteur supprimé"); load(); }
  };

  const openDndDialog = () => {
    setLocalSecteurs(secteurs.map(s => ({ ...s, departements: [...(s.departements || [])] })));
    setDndOpen(true);
  };

  // Get assigned departments
  const assignedDepts = new Set(localSecteurs.flatMap(s => s.departements || []));
  const unassignedDepts = ALL_DEPARTMENTS.filter(d => !assignedDepts.has(d));

  const handleDragStart = (dept: string) => {
    setDraggedDept(dept);
  };

  const handleDropOnSecteur = (secteurId: string) => {
    if (!draggedDept) return;
    setLocalSecteurs(prev => prev.map(s => {
      // Remove from current secteur if assigned
      const withoutDept = { ...s, departements: (s.departements || []).filter(d => d !== draggedDept) };
      // Add to target secteur
      if (s.id === secteurId && !s.departements.includes(draggedDept)) {
        return { ...withoutDept, departements: [...withoutDept.departements, draggedDept].sort() };
      }
      return withoutDept;
    }));
    setDraggedDept(null);
  };

  const handleDropOnUnassigned = () => {
    if (!draggedDept) return;
    setLocalSecteurs(prev => prev.map(s => ({
      ...s, departements: (s.departements || []).filter(d => d !== draggedDept)
    })));
    setDraggedDept(null);
  };

  const removeDeptFromSecteur = (secteurId: string, dept: string) => {
    setLocalSecteurs(prev => prev.map(s =>
      s.id === secteurId ? { ...s, departements: s.departements.filter(d => d !== dept) } : s
    ));
  };

  const handleSaveDepts = async () => {
    setSavingDepts(true);
    let hasError = false;
    for (const s of localSecteurs) {
      const { error } = await supabase.from("secteurs").update({ departements: s.departements }).eq("id", s.id);
      if (error) { toast.error(`Erreur pour ${s.nom}: ${error.message}`); hasError = true; break; }
    }
    if (!hasError) { toast.success("Départements sauvegardés"); setDndOpen(false); load(); }
    setSavingDepts(false);
  };

  const DeptChip = ({ dept, draggable = true, onRemove }: { dept: string; draggable?: boolean; onRemove?: () => void }) => (
    <span
      draggable={draggable}
      onDragStart={() => handleDragStart(dept)}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums border border-border bg-secondary text-foreground cursor-grab active:cursor-grabbing select-none transition-colors hover:bg-accent ${draggedDept === dept ? "opacity-50 ring-2 ring-primary" : ""}`}
    >
      {draggable && <FontAwesomeIcon icon={faGripVertical} className="h-2.5 w-2.5 text-muted-foreground" />}
      {dept}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:text-destructive transition-colors">×</button>
      )}
    </span>
  );

  return (
    <div className="app-page-shell-wide min-w-0 w-full space-y-6 pb-8">
      <FranceSectorsMap secteurs={secteurs} />

    <div className="bg-card rounded-2xl shadow-soft border border-border/60 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground">Gestion des secteurs</h3>
        <div className="flex gap-2">
          {secteurs.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={openDndDialog}>
              <FontAwesomeIcon icon={faGripVertical} className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Départements</span>
            </Button>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ajouter</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Nouveau secteur</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3 pt-2">
                <Input placeholder="Nom du secteur" value={newNom} onChange={e => setNewNom(e.target.value)} required />
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Création…" : "Créer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Chargement…</p>
      ) : secteurs.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Aucun secteur</p>
      ) : (
        <>
          {/* Mobile */}
          <div className="md:hidden space-y-2">
            <AnimatePresence>
              {secteurs.map(s => (
                <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-card border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    {editId === s.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input value={editNom} onChange={e => setEditNom(e.target.value)} className="h-8 text-sm flex-1" />
                        <Button size="sm" variant="ghost" onClick={() => handleUpdate(s.id)}>
                          <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{s.nom}</span>
                          <input
                            type="color"
                            aria-label={`Couleur ${s.nom}`}
                            value={s.color_hex && /^#[0-9A-Fa-f]{6}$/.test(s.color_hex) ? s.color_hex : "#94a3b8"}
                            onChange={(e) => void handleColorChange(s.id, e.target.value)}
                            className="h-7 w-12 cursor-pointer rounded border border-border bg-transparent p-0 shrink-0"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditId(s.id); setEditNom(s.nom); }} className="p-1.5 rounded-sm hover:bg-secondary">
                            <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(s.id, s.nom)} className="p-1.5 rounded-sm hover:bg-primary/10">
                            <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5 text-primary" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {(s.departements || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.departements.map(d => (
                        <span key={d} className="px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums bg-secondary text-muted-foreground">{d}</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du secteur</TableHead>
                  <TableHead className="w-[100px]">Couleur</TableHead>
                  <TableHead>Départements</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {secteurs.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {editId === s.id ? (
                        <div className="flex items-center gap-2">
                          <Input value={editNom} onChange={e => setEditNom(e.target.value)} className="h-8 text-sm max-w-xs" />
                          <Button size="sm" variant="ghost" onClick={() => handleUpdate(s.id)}>
                            <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{s.nom}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <input
                        type="color"
                        aria-label={`Couleur ${s.nom}`}
                        value={s.color_hex && /^#[0-9A-Fa-f]{6}$/.test(s.color_hex) ? s.color_hex : "#94a3b8"}
                        onChange={(e) => void handleColorChange(s.id, e.target.value)}
                        className="h-8 w-14 cursor-pointer rounded border border-border bg-transparent p-0"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(s.departements || []).length > 0
                          ? s.departements.map(d => (
                              <span key={d} className="px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums bg-secondary text-muted-foreground">{d}</span>
                            ))
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => { setEditId(s.id); setEditNom(s.nom); }} className="p-1.5 rounded-sm hover:bg-secondary">
                          <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(s.id, s.nom)} className="p-1.5 rounded-sm hover:bg-primary/10">
                          <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5 text-primary" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* DnD Dialog */}
      <Dialog open={dndOpen} onOpenChange={setDndOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Répartition des départements par secteur</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            Glissez-déposez les départements dans les secteurs. Cliquez × pour retirer.
          </p>

          {/* Unassigned pool */}
          <div
            className={`border-2 border-dashed rounded-lg p-3 mb-4 min-h-[60px] transition-colors ${draggedDept && !assignedDepts.has(draggedDept) ? "" : "border-border"}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnUnassigned}
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Non attribués ({unassignedDepts.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unassignedDepts.map(d => <DeptChip key={d} dept={d} />)}
              {unassignedDepts.length === 0 && <span className="text-xs text-muted-foreground">Tous les départements sont attribués</span>}
            </div>
          </div>

          {/* Secteur drop zones */}
          <div className="space-y-3">
            {localSecteurs.map(s => (
              <div
                key={s.id}
                className={`border-2 rounded-lg p-3 min-h-[60px] transition-colors ${draggedDept ? "border-primary/40 bg-primary/5" : "border-border"}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnSecteur(s.id)}
              >
                <p className="text-xs font-semibold text-foreground mb-2">{s.nom}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(s.departements || []).map(d => (
                    <DeptChip key={d} dept={d} onRemove={() => removeDeptFromSecteur(s.id, d)} />
                  ))}
                  {(s.departements || []).length === 0 && (
                    <span className="text-xs text-muted-foreground italic">Déposez des départements ici</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setDndOpen(false)}>Annuler</Button>
            <Button size="sm" disabled={savingDepts} onClick={handleSaveDepts} className="gap-1.5">
              <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
              {savingDepts ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
