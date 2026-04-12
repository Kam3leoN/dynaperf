import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faXmark, faCamera, faTrash, faPlus, faTrashCan, faPenToSquare, faFloppyDisk, faEye, faSort, faSortUp, faSortDown, faFileImport } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/useAdmin";
import { X } from "lucide-react";
import { ClubsCsvImportDialog } from "@/components/ClubsCsvImportDialog";

interface Club {
  id: string;
  nom: string;
  format: string;
  president_nom: string;
  vice_president_nom: string | null;
  agence_rattachement: string | null;
  agence_mere: string | null;
  telephone_president: string | null;
  email_president: string | null;
  adresse: string | null;
  departement: string | null;
  statut: string;
  nb_membres_actifs: number;
  nb_leads_transformes: number;
  montant_ca: number;
  date_creation: string | null;
  date_desactivation: string | null;
  logo_url: string | null;
  telephone_vice_president: string | null;
  latitude: number | null;
  longitude: number | null;
  secteur_id: string | null;
}

const FORMAT_OPTIONS = ["Tous", "Développement", "Intensif", "Convivial"];
const STATUT_OPTIONS = [
  { value: "Tous", label: "Tous", color: "" },
  { value: "Actif", label: "Actif", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  { value: "Désactivé", label: "Désactivé", color: "bg-muted text-muted-foreground" },
  { value: "Archivé", label: "Archivé", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
];

function StatutBadge({ statut }: { statut: string }) {
  const opt = STATUT_OPTIONS.find(o => o.value === statut) || STATUT_OPTIONS[1];
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${opt.color}`}>{opt.label}</span>;
}

function FormatBadge({ format }: { format: string }) {
  const colors: Record<string, string> = {
    "Développement": "bg-primary/10 text-primary",
    "Intensif": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    "Convivial": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[format] || "bg-secondary text-muted-foreground"}`}>{format}</span>;
}

function formatCA(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M€`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k€`;
  return `${n.toFixed(0)}€`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

type SortKey =
  | "nom"
  | "format"
  | "president_nom"
  | "departement"
  | "statut"
  | "nb_membres_actifs"
  | "nb_leads_transformes"
  | "montant_ca"
  | "date_creation";

const SORT_LABELS: Record<SortKey, string> = {
  nom: "Nom",
  format: "Format",
  president_nom: "Président",
  departement: "Département",
  statut: "Statut",
  nb_membres_actifs: "Membres",
  nb_leads_transformes: "Leads",
  montant_ca: "CA",
  date_creation: "Date de création",
};

function compareClubs(a: Club, b: Club, key: SortKey, dir: "asc" | "desc"): number {
  const mul = dir === "asc" ? 1 : -1;
  const str = (x: string | null | undefined) => (x ?? "").toLocaleLowerCase();
  switch (key) {
    case "nom":
    case "format":
    case "president_nom":
    case "departement":
    case "statut":
      return mul * str(a[key]).localeCompare(str(b[key]), "fr", { numeric: true });
    case "nb_membres_actifs":
    case "nb_leads_transformes":
    case "montant_ca":
      return mul * ((a[key] ?? 0) - (b[key] ?? 0));
    case "date_creation": {
      const ta = a.date_creation ? new Date(a.date_creation).getTime() : 0;
      const tb = b.date_creation ? new Date(b.date_creation).getTime() : 0;
      return mul * (ta - tb);
    }
    default:
      return 0;
  }
}

function ClubLogo({ club, isAdmin, onUpdate }: { club: Club; isAdmin: boolean; onUpdate: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${club.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("club-logos").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Erreur upload logo"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("club-logos").getPublicUrl(path);
    const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("clubs").update({ logo_url: logoUrl }).eq("id", club.id);
    toast.success("Logo mis à jour");
    setUploading(false);
    onUpdate();
  };

  const handleDelete = async () => {
    const ext = club.logo_url?.split(".").pop()?.split("?")[0];
    if (ext) await supabase.storage.from("club-logos").remove([`${club.id}.${ext}`]);
    await supabase.from("clubs").update({ logo_url: null }).eq("id", club.id);
    toast.success("Logo supprimé");
    onUpdate();
  };

  return (
    <div className="relative group">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={club.logo_url || undefined} alt={club.nom} />
        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
          {club.nom.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {isAdmin && (
        <div className="absolute -bottom-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => fileInputRef.current?.click()} className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center" disabled={uploading}>
            <FontAwesomeIcon icon={faCamera} className="h-2 w-2" />
          </button>
          {club.logo_url && (
            <button onClick={handleDelete} className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
              <FontAwesomeIcon icon={faTrash} className="h-2 w-2" />
            </button>
          )}
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}

const emptyForm = {
  nom: "",
  format: "Développement",
  statut: "Actif",
  president_nom: "",
  vice_president_nom: "",
  agence_rattachement: "",
  agence_mere: "",
  telephone_president: "",
  telephone_vice_president: "",
  email_president: "",
  adresse: "",
  departement: "",
  nb_membres_actifs: "0",
  nb_leads_transformes: "0",
  montant_ca: "0",
  date_creation: "",
  date_desactivation: "",
};

export default function AdminClubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFormat, setFilterFormat] = useState("Tous");
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [filterAnnee, setFilterAnnee] = useState("Tous");
  const [filterDept, setFilterDept] = useState("Tous");
  const [filterSecteur, setFilterSecteur] = useState("Tous");
  const [filterAgenceRattachement, setFilterAgenceRattachement] = useState("Tous");
  const [sortKey, setSortKey] = useState<SortKey>("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [membresMin, setMembresMin] = useState(0);
  const [leadsMin, setLeadsMin] = useState(0);
  const [caMin, setCaMin] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { isAdmin } = useAdmin();

  // CRUD state
  const [createOpen, setCreateOpen] = useState(false);
  const [viewClub, setViewClub] = useState<Club | null>(null);
  const [editClub, setEditClub] = useState<Club | null>(null);
  const [deleteClub, setDeleteClub] = useState<Club | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("clubs").select("*").order("nom");
    if (data) setClubs(data as Club[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadClubs(); }, [loadClubs]);

  const resetForm = () => setForm(emptyForm);

  const formToRow = () => ({
    nom: form.nom.trim(),
    format: form.format,
    statut: form.statut,
    president_nom: form.president_nom.trim(),
    vice_president_nom: form.vice_president_nom.trim() || null,
    agence_rattachement: form.agence_rattachement.trim() || null,
    agence_mere: form.agence_mere.trim() || null,
    telephone_president: form.telephone_president.trim() || null,
    telephone_vice_president: form.telephone_vice_president.trim() || null,
    email_president: form.email_president.trim() || null,
    adresse: form.adresse.trim() || null,
    departement: form.departement.trim() || null,
    nb_membres_actifs: parseInt(form.nb_membres_actifs) || 0,
    nb_leads_transformes: parseInt(form.nb_leads_transformes) || 0,
    montant_ca: parseFloat(form.montant_ca) || 0,
    date_creation: form.date_creation || null,
    date_desactivation: form.date_desactivation || null,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("clubs").insert(formToRow());
    if (error) { toast.error("Erreur : " + error.message); setSaving(false); return; }
    toast.success("Club créé");
    resetForm();
    setCreateOpen(false);
    loadClubs();
    setSaving(false);
  };

  const openEditDialog = (c: Club) => {
    setEditClub(c);
    setForm({
      nom: c.nom,
      format: c.format,
      statut: c.statut,
      president_nom: c.president_nom,
      vice_president_nom: c.vice_president_nom || "",
      agence_rattachement: c.agence_rattachement || "",
      agence_mere: c.agence_mere || "",
      telephone_president: c.telephone_president || "",
      telephone_vice_president: c.telephone_vice_president || "",
      email_president: c.email_president || "",
      adresse: c.adresse || "",
      departement: c.departement || "",
      nb_membres_actifs: c.nb_membres_actifs.toString(),
      nb_leads_transformes: c.nb_leads_transformes.toString(),
      montant_ca: c.montant_ca.toString(),
      date_creation: c.date_creation || "",
      date_desactivation: c.date_desactivation || "",
    });
  };

  const handleEditSave = async () => {
    if (!editClub) return;
    setSaving(true);
    const { error } = await supabase.from("clubs").update(formToRow()).eq("id", editClub.id);
    if (error) { toast.error("Erreur : " + error.message); setSaving(false); return; }
    toast.success("Club mis à jour");
    setEditClub(null);
    resetForm();
    loadClubs();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteClub) return;
    const { error } = await supabase.from("clubs").delete().eq("id", deleteClub.id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Club supprimé"); loadClubs(); }
    setDeleteClub(null);
  };

  // Filters
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    clubs.forEach(c => { if (c.date_creation) years.add(c.date_creation.substring(0, 4)); });
    return ["Tous", ...Array.from(years).sort()];
  }, [clubs]);

  const uniqueDepts = useMemo(() => {
    const depts = new Set<string>();
    clubs.forEach(c => { if (c.departement) depts.add(c.departement); });
    return ["Tous", ...Array.from(depts).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
  }, [clubs]);

  const uniqueSecteurs = useMemo(() => {
    const secteurs = new Set<string>();
    clubs.forEach(c => { if (c.agence_mere) secteurs.add(c.agence_mere); });
    return ["Tous", ...Array.from(secteurs).sort()];
  }, [clubs]);

  const uniqueAgencesRattachement = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach(c => { if (c.agence_rattachement) set.add(c.agence_rattachement); });
    return ["Tous", ...Array.from(set).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))];
  }, [clubs]);

  const maxMembres = useMemo(() => Math.max(1, ...clubs.map(c => c.nb_membres_actifs)), [clubs]);
  const maxLeads = useMemo(() => Math.max(1, ...clubs.map(c => c.nb_leads_transformes)), [clubs]);
  const maxCA = useMemo(() => Math.max(1, ...clubs.map(c => c.montant_ca)), [clubs]);

  const activeFiltersCount = [
    filterFormat !== "Tous", filterStatut !== "Tous", filterAnnee !== "Tous",
    filterDept !== "Tous", filterSecteur !== "Tous", filterAgenceRattachement !== "Tous",
    membresMin > 0, leadsMin > 0, caMin > 0,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterFormat("Tous"); setFilterStatut("Tous"); setFilterAnnee("Tous");
    setFilterDept("Tous"); setFilterSecteur("Tous"); setFilterAgenceRattachement("Tous");
    setMembresMin(0); setLeadsMin(0); setCaMin(0);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => clubs.filter(c => {
    if (filterFormat !== "Tous" && c.format !== filterFormat) return false;
    if (filterStatut !== "Tous" && c.statut !== filterStatut) return false;
    if (filterAnnee !== "Tous" && (!c.date_creation || !c.date_creation.startsWith(filterAnnee))) return false;
    if (filterDept !== "Tous" && c.departement !== filterDept) return false;
    if (filterSecteur !== "Tous" && c.agence_mere !== filterSecteur) return false;
    if (filterAgenceRattachement !== "Tous" && c.agence_rattachement !== filterAgenceRattachement) return false;
    if (c.nb_membres_actifs < membresMin) return false;
    if (c.nb_leads_transformes < leadsMin) return false;
    if (c.montant_ca < caMin) return false;
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    const hay = `${c.nom} ${c.president_nom} ${c.departement || ""} ${c.agence_mere || ""} ${c.agence_rattachement || ""} ${c.adresse || ""}`.toLowerCase();
    return term.split(/\s+/).every(w => hay.includes(w));
  }), [clubs, filterFormat, filterStatut, filterAnnee, filterDept, filterSecteur, filterAgenceRattachement, membresMin, leadsMin, caMin, searchQuery]);

  const sortedList = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => compareClubs(a, b, sortKey, sortDir));
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalMembres = filtered.reduce((s, c) => s + c.nb_membres_actifs, 0);
  const totalLeads = filtered.reduce((s, c) => s + c.nb_leads_transformes, 0);
  const totalCA = filtered.reduce((s, c) => s + c.montant_ca, 0);

  const SortableTh = ({
    label,
    colKey,
    className,
  }: {
    label: string;
    colKey: SortKey;
    className?: string;
  }) => (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium text-left hover:text-foreground text-muted-foreground hover:bg-secondary/50 rounded px-0.5 -mx-0.5 w-full min-w-0"
        onClick={() => handleSort(colKey)}
      >
        <span className="truncate">{label}</span>
        {sortKey === colKey ? (
          <FontAwesomeIcon icon={sortDir === "asc" ? faSortUp : faSortDown} className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
        ) : (
          <FontAwesomeIcon icon={faSort} className="h-3 w-3 shrink-0 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  );

  const ActionButtons = ({ c }: { c: Club }) => (
    <div className="flex gap-1">
      <button onClick={() => setViewClub(c)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title="Voir">
        <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {isAdmin && (
        <>
          <button onClick={() => openEditDialog(c)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title="Modifier">
            <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => setDeleteClub(c)} className="p-1.5 rounded-sm hover:bg-destructive/10 transition-colors" title="Supprimer">
            <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5 text-destructive" />
          </button>
        </>
      )}
    </div>
  );

  const FilterPanel = () => (
    <div className="space-y-5 p-1">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Format</label>
        <Select value={filterFormat} onValueChange={setFilterFormat}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{FORMAT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Statut</label>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Année de création</label>
        <Select value={filterAnnee} onValueChange={setFilterAnnee}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{uniqueYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Département</label>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Secteur (Agence mère)</label>
        <Select value={filterSecteur} onValueChange={setFilterSecteur}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{uniqueSecteurs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Agence de rattachement</label>
        <Select value={filterAgenceRattachement} onValueChange={setFilterAgenceRattachement}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{uniqueAgencesRattachement.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Membres min : {membresMin}</label>
        <Slider value={[membresMin]} onValueChange={([v]) => setMembresMin(v)} min={0} max={maxMembres} step={1} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Leads min : {leadsMin}</label>
        <Slider value={[leadsMin]} onValueChange={([v]) => setLeadsMin(v)} min={0} max={maxLeads} step={1} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">CA min : {formatCA(caMin)}</label>
        <Slider value={[caMin]} onValueChange={([v]) => setCaMin(v)} min={0} max={maxCA} step={1000} />
      </div>
      {activeFiltersCount > 0 && (
        <Button variant="outline" size="sm" onClick={resetFilters} className="w-full gap-1.5 text-xs">
          <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );

  const FormFields = () => (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Nom du club *</label>
        <Input value={form.nom} onChange={(e) => setForm(f => ({ ...f, nom: e.target.value }))} className="h-9 text-sm" placeholder="Nom du club" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Format</label>
          <Select value={form.format} onValueChange={(v) => setForm(f => ({ ...f, format: v }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.filter(f => f !== "Tous").map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Statut</label>
          <Select value={form.statut} onValueChange={(v) => setForm(f => ({ ...f, statut: v }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUT_OPTIONS.filter(o => o.value !== "Tous").map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Président</label>
          <Input value={form.president_nom} onChange={(e) => setForm(f => ({ ...f, president_nom: e.target.value }))} className="h-9 text-sm" placeholder="Nom du président" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Vice-président</label>
          <Input value={form.vice_president_nom} onChange={(e) => setForm(f => ({ ...f, vice_president_nom: e.target.value }))} className="h-9 text-sm" placeholder="Nom du VP" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tél. président</label>
          <Input value={form.telephone_president} onChange={(e) => setForm(f => ({ ...f, telephone_president: e.target.value }))} className="h-9 text-sm" placeholder="06 XX XX XX XX" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tél. VP</label>
          <Input value={form.telephone_vice_president} onChange={(e) => setForm(f => ({ ...f, telephone_vice_president: e.target.value }))} className="h-9 text-sm" placeholder="06 XX XX XX XX" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Email président</label>
        <Input type="email" value={form.email_president} onChange={(e) => setForm(f => ({ ...f, email_president: e.target.value }))} className="h-9 text-sm" placeholder="email@exemple.com" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Adresse</label>
        <Input value={form.adresse} onChange={(e) => setForm(f => ({ ...f, adresse: e.target.value }))} className="h-9 text-sm" placeholder="Adresse du club" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Département</label>
          <Input value={form.departement} onChange={(e) => setForm(f => ({ ...f, departement: e.target.value }))} className="h-9 text-sm" placeholder="75" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Agence mère</label>
          <Input value={form.agence_mere} onChange={(e) => setForm(f => ({ ...f, agence_mere: e.target.value }))} className="h-9 text-sm" placeholder="Secteur" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Agence de rattachement</label>
        <Input value={form.agence_rattachement} onChange={(e) => setForm(f => ({ ...f, agence_rattachement: e.target.value }))} className="h-9 text-sm" placeholder="Agence" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Membres actifs</label>
          <Input type="number" min={0} value={form.nb_membres_actifs} onChange={(e) => setForm(f => ({ ...f, nb_membres_actifs: e.target.value }))} className="h-9 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Leads</label>
          <Input type="number" min={0} value={form.nb_leads_transformes} onChange={(e) => setForm(f => ({ ...f, nb_leads_transformes: e.target.value }))} className="h-9 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">CA (€)</label>
          <Input type="number" min={0} value={form.montant_ca} onChange={(e) => setForm(f => ({ ...f, montant_ca: e.target.value }))} className="h-9 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Date de création</label>
          <Input type="date" value={form.date_creation} onChange={(e) => setForm(f => ({ ...f, date_creation: e.target.value }))} className="h-9 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Date désactivation</label>
          <Input type="date" value={form.date_desactivation} onChange={(e) => setForm(f => ({ ...f, date_desactivation: e.target.value }))} className="h-9 text-sm" />
        </div>
      </div>
    </div>
  );

  const MobileCard = ({ c }: { c: Club }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-card border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ClubLogo club={c} isAdmin={isAdmin} onUpdate={loadClubs} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{c.nom}</p>
            <p className="text-xs text-muted-foreground truncate">{c.president_nom}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ActionButtons c={c} />
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <FormatBadge format={c.format} />
        <StatutBadge statut={c.statut} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-secondary/50 rounded p-1.5">
          <p className="text-xs font-bold text-foreground">{c.nb_membres_actifs}</p>
          <p className="text-[10px] text-muted-foreground">Membres</p>
        </div>
        <div className="bg-secondary/50 rounded p-1.5">
          <p className="text-xs font-bold text-foreground">{c.nb_leads_transformes}</p>
          <p className="text-[10px] text-muted-foreground">Leads</p>
        </div>
        <div className="bg-secondary/50 rounded p-1.5">
          <p className="text-xs font-bold text-foreground">{formatCA(c.montant_ca)}</p>
          <p className="text-[10px] text-muted-foreground">CA</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Dpt. {c.departement || "—"}</span>
        <span>{formatDate(c.date_creation)}</span>
      </div>
    </motion.div>
  );

  return (
    <div className="bg-card rounded-2xl shadow-soft border border-border/60 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-foreground">Clubs d'affaires</h3>
        <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none justify-end">
          <Input placeholder="Rechercher…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48 sm:w-[260px] h-9 text-sm rounded-md" />
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs relative shrink-0">
                <FontAwesomeIcon icon={faFilter} className="h-3 w-3" />
                <span className="hidden sm:inline">Filtres</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">{activeFiltersCount}</span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-96">
              <SheetHeader><SheetTitle>Filtres</SheetTitle></SheetHeader>
              <div className="mt-4"><FilterPanel /></div>
            </SheetContent>
          </Sheet>
          {isAdmin && (
            <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs shrink-0"
              onClick={() => setCsvImportOpen(true)}
            >
              <FontAwesomeIcon icon={faFileImport} className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Importer CSV</span>
            </Button>
            <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md gap-1.5 shrink-0">
                  <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                  <span className="hidden sm:inline">Ajouter</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nouveau club</DialogTitle>
                  <DialogDescription>Créez un nouveau club d'affaires.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="py-3">
                  <FormFields />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" size="sm" onClick={() => { setCreateOpen(false); resetForm(); }} className="rounded-md">Annuler</Button>
                    <Button type="submit" size="sm" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                      {saving ? "Création…" : "Créer"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <ClubsCsvImportDialog
              open={csvImportOpen}
              onOpenChange={setCsvImportOpen}
              clubs={clubs}
              onApplied={loadClubs}
            />
            </>
          )}
        </div>
      </div>

      <div className="md:hidden flex flex-wrap gap-2 items-center mb-3">
        <span className="text-xs text-muted-foreground shrink-0">Tri</span>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-8 text-xs flex-1 min-w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
              <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortDir} onValueChange={(v) => setSortDir(v as "asc" | "desc")}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Croissant</SelectItem>
            <SelectItem value="desc">Décroissant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="bg-secondary/50 rounded-md px-3 py-1.5 text-center">
          <p className="text-sm font-bold text-foreground">{filtered.length}</p>
          <p className="text-[10px] text-muted-foreground">Clubs</p>
        </div>
        <div className="bg-secondary/50 rounded-md px-3 py-1.5 text-center">
          <p className="text-sm font-bold text-foreground">{totalMembres}</p>
          <p className="text-[10px] text-muted-foreground">Membres</p>
        </div>
        <div className="bg-secondary/50 rounded-md px-3 py-1.5 text-center">
          <p className="text-sm font-bold text-foreground">{totalLeads}</p>
          <p className="text-[10px] text-muted-foreground">Leads</p>
        </div>
        <div className="bg-secondary/50 rounded-md px-3 py-1.5 text-center">
          <p className="text-sm font-bold text-foreground">{formatCA(totalCA)}</p>
          <p className="text-[10px] text-muted-foreground">CA Total</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>
      ) : (
        <>
          <div className="md:hidden space-y-2">
            <AnimatePresence>
              {sortedList.map(c => <MobileCard key={c.id} c={c} />)}
            </AnimatePresence>
            {sortedList.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun club trouvé</p>}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <SortableTh label="Club" colKey="nom" />
                  <SortableTh label="Format" colKey="format" />
                  <SortableTh label="Président" colKey="president_nom" />
                  <SortableTh label="Dpt." colKey="departement" />
                  <SortableTh label="Statut" colKey="statut" />
                  <SortableTh label="Membres" colKey="nb_membres_actifs" className="text-right [&>button]:justify-end" />
                  <SortableTh label="Leads" colKey="nb_leads_transformes" className="text-right [&>button]:justify-end" />
                  <SortableTh label="CA" colKey="montant_ca" className="text-right [&>button]:justify-end" />
                  <SortableTh label="Créé le" colKey="date_creation" />
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedList.map(c => (
                  <TableRow key={c.id}>
                    <TableCell><ClubLogo club={c} isAdmin={isAdmin} onUpdate={loadClubs} /></TableCell>
                    <TableCell className="font-medium text-sm">{c.nom}</TableCell>
                    <TableCell><FormatBadge format={c.format} /></TableCell>
                    <TableCell className="text-sm">{c.president_nom}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.departement || "—"}</TableCell>
                    <TableCell><StatutBadge statut={c.statut} /></TableCell>
                    <TableCell className="text-right text-sm">{c.nb_membres_actifs}</TableCell>
                    <TableCell className="text-right text-sm">{c.nb_leads_transformes}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCA(c.montant_ca)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(c.date_creation)}</TableCell>
                    <TableCell><ActionButtons c={c} /></TableCell>
                  </TableRow>
                ))}
                {sortedList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">Aucun club trouvé</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* View dialog */}
      <Dialog open={!!viewClub} onOpenChange={(o) => { if (!o) setViewClub(null); }}>
        <DialogContent className="sm:max-w-md pt-20 [&>button]:hidden" style={{ overflow: 'visible' }}>
          {viewClub && (
            <>
              <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={viewClub.logo_url || undefined} alt={viewClub.nom} />
                  <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                    {viewClub.nom.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <button onClick={() => setViewClub(null)} className="absolute -right-3 -top-3 w-8 h-8 rounded-full flex items-center justify-center z-50 hover:opacity-90 transition-opacity" style={{ backgroundColor: "#ee4540" }}>
                <X className="h-4 w-4 text-white" />
              </button>
            </>
          )}
          <DialogHeader className="text-center">
            <DialogTitle className="sr-only">Détails</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center w-full">Fiche club</DialogDescription>
          </DialogHeader>
          {viewClub && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{viewClub.nom}</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <FormatBadge format={viewClub.format} />
                  <StatutBadge statut={viewClub.statut} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-secondary/50 rounded-md p-2">
                  <p className="text-sm font-bold text-foreground">{viewClub.nb_membres_actifs}</p>
                  <p className="text-[10px] text-muted-foreground">Membres</p>
                </div>
                <div className="bg-secondary/50 rounded-md p-2">
                  <p className="text-sm font-bold text-foreground">{viewClub.nb_leads_transformes}</p>
                  <p className="text-[10px] text-muted-foreground">Leads</p>
                </div>
                <div className="bg-secondary/50 rounded-md p-2">
                  <p className="text-sm font-bold text-foreground">{formatCA(viewClub.montant_ca)}</p>
                  <p className="text-[10px] text-muted-foreground">CA</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground block">Président</span><span className="font-medium text-foreground">{viewClub.president_nom || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Vice-président</span><span className="font-medium text-foreground">{viewClub.vice_president_nom || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Tél. président</span><span className="font-medium text-foreground">{viewClub.telephone_president || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Email</span><span className="font-medium text-foreground break-all">{viewClub.email_president || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Département</span><span className="font-medium text-foreground">{viewClub.departement || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Agence mère</span><span className="font-medium text-foreground">{viewClub.agence_mere || "—"}</span></div>
                <div className="col-span-2"><span className="text-xs text-muted-foreground block">Adresse</span><span className="font-medium text-foreground">{viewClub.adresse || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Créé le</span><span className="font-medium text-foreground">{formatDate(viewClub.date_creation)}</span></div>
                <div><span className="text-xs text-muted-foreground block">Désactivé le</span><span className="font-medium text-foreground">{formatDate(viewClub.date_desactivation)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editClub} onOpenChange={(o) => { if (!o) { setEditClub(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le club</DialogTitle>
            <DialogDescription>Modifiez les informations de {editClub?.nom}</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <FormFields />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => { setEditClub(null); resetForm(); }} className="rounded-md">Annuler</Button>
              <Button size="sm" disabled={saving} onClick={handleEditSave} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md gap-1.5">
                <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteClub} onOpenChange={(o) => { if (!o) setDeleteClub(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le club <strong>{deleteClub?.nom}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
