import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan, faPenToSquare, faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Secteur {
  id: string;
  nom: string;
  created_at: string;
}

export default function AdminSecteurs() {
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("secteurs").select("*").order("nom");
    if (data) setSecteurs(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("secteurs").insert({ nom: newNom.trim() } as any);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Secteur créé"); setNewNom(""); setCreateOpen(false); load(); }
    setCreating(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editNom.trim()) return;
    const { error } = await supabase.from("secteurs").update({ nom: editNom.trim() } as any).eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Secteur mis à jour"); setEditId(null); load(); }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (!confirm(`Supprimer le secteur "${nom}" ?`)) return;
    const { error } = await supabase.from("secteurs").delete().eq("id", id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Secteur supprimé"); load(); }
  };

  return (
    <div className="bg-card rounded-lg shadow-soft p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Gestion des secteurs</h3>
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
                <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                  {editId === s.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input value={editNom} onChange={e => setEditNom(e.target.value)} className="h-8 text-sm flex-1" />
                      <Button size="sm" variant="ghost" onClick={() => handleUpdate(s.id)}>
                        <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground">{s.nom}</span>
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
    </div>
  );
}
