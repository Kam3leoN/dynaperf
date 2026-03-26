import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Audit, TYPES_EVENEMENT, AUDITEURS, MOIS_ORDRE } from "@/data/audits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPenToSquare, faTrashCan, faSort, faEye } from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";
import { AuditDetailView } from "./AuditDetailView";

interface AuditTableProps {
  audits: Audit[];
  onAdd: (audit: Omit<Audit, "id">) => void;
  onUpdate: (id: string, data: Partial<Audit>) => void;
  onDelete: (id: string) => void;
}

const emptyForm = (): Omit<Audit, "id"> => ({
  date: new Date().toISOString().slice(0, 10),
  partenaire: "",
  lieu: "",
  auditeur: "Cédric",
  typeEvenement: "Club Affaires",
  note: null,
  moisVersement: "Janvier",
  statut: "NON",
});

type SortKey = "date" | "note" | "partenaire" | "auditeur" | "typeEvenement";

export function AuditTable({ audits, onAdd, onUpdate, onDelete }: AuditTableProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Audit, "id">>(emptyForm());
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [detailAudit, setDetailAudit] = useState<{ id: string; type: string; partenaire: string; date: string; lieu?: string | null; auditeur: string; note?: number | null } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...audits]
    .filter((a) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return a.partenaire.toLowerCase().includes(s) || a.lieu.toLowerCase().includes(s) || a.auditeur.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "note") cmp = (a.note ?? -1) - (b.note ?? -1);
      else if (sortKey === "partenaire") cmp = a.partenaire.localeCompare(b.partenaire);
      else if (sortKey === "auditeur") cmp = a.auditeur.localeCompare(b.auditeur);
      else if (sortKey === "typeEvenement") cmp = a.typeEvenement.localeCompare(b.typeEvenement);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const openNew = () => { setEditId(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (a: Audit) => { setEditId(a.id); setForm({ ...a }); setOpen(true); };

  const save = () => {
    if (!form.partenaire.trim()) return;
    if (editId) onUpdate(editId, form);
    else onAdd(form);
    setOpen(false);
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(k)}>
      <span className="flex items-center gap-1 text-xs uppercase tracking-wider">
        {label}
        <FontAwesomeIcon icon={faSort} className="h-3 w-3 text-muted-foreground" />
      </span>
    </TableHead>
  );

  /* Mobile card view for each audit */
  const MobileCard = ({ a }: { a: Audit }) => (
    <motion.div
      key={a.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-card border border-border rounded-lg p-3 space-y-2"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{a.partenaire}</p>
          <p className="text-xs text-muted-foreground">{a.lieu || "—"}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {a.statut === "OK" && (
            <button onClick={() => setDetailAudit({ id: a.id, type: a.typeEvenement, partenaire: a.partenaire, date: a.date, lieu: a.lieu, auditeur: a.auditeur, note: a.note })} className="p-1.5 rounded-sm hover:bg-secondary transition-colors">
              <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={() => navigate(`/audits/edit/${a.id}?type=${encodeURIComponent(a.typeEvenement)}`)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title="Modifier">
            <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded-sm hover:bg-primary/10 transition-colors">
            <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5 text-primary" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="tabular-nums text-muted-foreground">{new Date(a.date).toLocaleDateString("fr-FR")}</span>
        <span className="px-1.5 py-0.5 rounded-sm bg-secondary font-medium">{a.typeEvenement}</span>
        <span className="text-muted-foreground">{a.auditeur}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold tabular-nums ${a.note !== null ? (a.note >= 7 ? "text-foreground" : "text-primary") : "text-muted-foreground"}`}>
          {a.note !== null ? a.note.toFixed(2) : "—"}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${a.statut === "OK" ? "bg-foreground/5 text-foreground" : "bg-primary/10 text-primary"}`}>
          {a.statut === "OK" ? "Noté" : "En attente"}
        </span>
      </div>
    </motion.div>
  );

  return (
    <div className="bg-card rounded-lg shadow-soft p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-foreground">Audits</h3>
        <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none justify-end">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[200px] h-9 text-sm rounded-md"
          />
          <Button onClick={() => navigate("/audits/new")} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md gap-1.5 shrink-0">
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="">{editId ? "Modifier l'audit" : "Nouvel audit"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Note (/10)</label>
                    <Input type="number" step="0.01" min="0" max="10" value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value ? +e.target.value : null })} className="h-9 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Partenaire audité</label>
                  <Input value={form.partenaire} onChange={(e) => setForm({ ...form, partenaire: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Lieu</label>
                  <Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Auditeur</label>
                    <Select value={form.auditeur} onValueChange={(v) => setForm({ ...form, auditeur: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AUDITEURS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                    <Select value={form.typeEvenement} onValueChange={(v) => setForm({ ...form, typeEvenement: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPES_EVENEMENT.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Mois versement</label>
                    <Select value={form.moisVersement} onValueChange={(v) => setForm({ ...form, moisVersement: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MOIS_ORDRE.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Statut</label>
                    <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v as "OK" | "NON" })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OK">Noté</SelectItem>
                        <SelectItem value="NON">En attente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-md">Annuler</Button>
                <Button size="sm" onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                  {editId ? "Sauvegarder" : "Créer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Date" k="date" />
              <SortHeader label="Partenaire" k="partenaire" />
              <TableHead className="text-xs uppercase tracking-wider">Lieu</TableHead>
              <SortHeader label="Auditeur" k="auditeur" />
              <SortHeader label="Type" k="typeEvenement" />
              <SortHeader label="Note" k="note" />
              <TableHead className="text-xs uppercase tracking-wider">Statut</TableHead>
              <TableHead className="text-xs uppercase tracking-wider w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {sorted.map((a) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-border hover:bg-secondary/50 transition-colors"
                >
                  <TableCell className="text-sm tabular-nums">{new Date(a.date).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="text-sm font-medium">{a.partenaire}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.lieu || "—"}</TableCell>
                  <TableCell className="text-sm">{a.auditeur}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-sm bg-secondary font-medium">{a.typeEvenement}</span>
                  </TableCell>
                  <TableCell className={`text-sm font-bold tabular-nums ${a.note !== null ? (a.note >= 7 ? "text-foreground" : "text-primary") : "text-muted-foreground"}`}>
                    {a.note !== null ? a.note.toFixed(2) : "—"}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${a.statut === "OK" ? "bg-foreground/5 text-foreground" : "bg-primary/10 text-primary"}`}>
                      {a.statut === "OK" ? "Noté" : "En attente"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {a.statut === "OK" && (
                        <button onClick={() => setDetailAudit({ id: a.id, type: a.typeEvenement, partenaire: a.partenaire, date: a.date, lieu: a.lieu, auditeur: a.auditeur, note: a.note })} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title="Voir le détail">
                          <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <button onClick={() => navigate(`/audits/edit/${a.id}?type=${encodeURIComponent(a.typeEvenement)}`)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title="Modifier">
                        <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded-sm hover:bg-primary/10 transition-colors">
                        <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5 text-primary" />
                      </button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        <AnimatePresence>
          {sorted.map((a) => (
            <MobileCard key={a.id} a={a} />
          ))}
        </AnimatePresence>
      </div>

      <p className="text-xs text-muted-foreground mt-3 tabular-nums">{sorted.length} audit{sorted.length > 1 ? "s" : ""} affiché{sorted.length > 1 ? "s" : ""}</p>

      {detailAudit && (
        <AuditDetailView
          auditId={detailAudit.id}
          typeEvenement={detailAudit.type}
          partenaire={detailAudit.partenaire}
          date={detailAudit.date}
          lieu={detailAudit.lieu}
          auditeur={detailAudit.auditeur}
          note={detailAudit.note}
          open={true}
          onClose={() => setDetailAudit(null)}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet audit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'audit et toutes ses données associées seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
