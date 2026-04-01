import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan, faPenToSquare, faFloppyDisk, faCamera, faEye, faFilter, faMars, faVenus, faGears } from "@fortawesome/free-solid-svg-icons";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import GenreManager from "@/components/GenreManager";

interface Partenaire {
  id: string;
  photo_url: string | null;
  prenom: string;
  nom: string;
  societe: string;
  commission: number;
  partenaire_referent: string;
  is_directeur_agence: boolean;
  is_president_club: boolean;
  is_cadre_externalise: boolean;
  pole_expertise: string | null;
  secteurs: string[];
  email: string;
  telephone: string;
  date_anniversaire: string | null;
  statut: string;
  genre: string | null;
  created_at: string;
}

const STATUT_OPTIONS = [
  { value: "actif", label: "Actif", color: "bg-emerald-500/15 text-emerald-700" },
  { value: "desactive", label: "Désactivé", color: "bg-muted text-muted-foreground" },
  { value: "en_formation", label: "En formation", color: "bg-amber-500/15 text-amber-700" },
];

function StatutBadge({ statut }: { statut: string }) {
  const opt = STATUT_OPTIONS.find(o => o.value === statut) || STATUT_OPTIONS[0];
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${opt.color}`}>{opt.label}</span>;
}

function GenderIcon({ genre }: { genre: string | null }) {
  if (genre === 'M') return <FontAwesomeIcon icon={faMars} className="h-3.5 w-3.5 text-blue-500" />;
  if (genre === 'F') return <FontAwesomeIcon icon={faVenus} className="h-3.5 w-3.5 text-pink-300" />;
  return <span className="text-[10px] text-muted-foreground">?</span>;
}

function PartenaireAvatar({ url, name, size = 32 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, minWidth: size, minHeight: size }} className="rounded-full object-cover border border-border shrink-0" />;
  }
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, minWidth: size, minHeight: size }} className="rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center border border-border shrink-0 text-xs">
      {initials}
    </div>
  );
}

function RoleChips({ p }: { p: Partenaire }) {
  const chips: string[] = [];
  if (p.is_directeur_agence) chips.push("Dir. Agence");
  if (p.is_president_club) chips.push("Prés. Club");
  if (p.is_cadre_externalise) chips.push(p.pole_expertise ? `Cadre ext. — ${p.pole_expertise}` : "Cadre ext.");
  if (chips.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{c}</span>
      ))}
    </div>
  );
}

const emptyForm = {
  prenom: "",
  nom: "",
  societe: "",
  commission: "50",
  partenaire_referent: "Dynabuy",
  statut: "actif",
  is_directeur_agence: false,
  is_president_club: false,
  is_cadre_externalise: false,
  pole_expertise: "",
  secteurs: "",
  email: "",
  telephone: "",
  date_anniversaire: "",
  genre: "",
};

export default function AdminPartenaires() {
  const [partenaires, setPartenaires] = useState<Partenaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [filterReferent, setFilterReferent] = useState("Tous");
  const [filterRole, setFilterRole] = useState("Tous");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewP, setViewP] = useState<Partenaire | null>(null);
  const [editP, setEditP] = useState<Partenaire | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [prenomsGenre, setPrenomsGenre] = useState<Record<string, string>>({});
  const [genreManagerOpen, setGenreManagerOpen] = useState(false);

  const loadPartenaires = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("partenaires").select("*").order("nom");
    if (data) setPartenaires(data as any);
    setLoading(false);
  }, []);

  const loadPrenomsGenre = useCallback(async () => {
    const { data } = await supabase.from("prenoms_genre" as any).select("prenom, genre");
    if (data) {
      const map: Record<string, string> = {};
      (data as any[]).forEach((d: any) => { map[d.prenom.toLowerCase()] = d.genre; });
      setPrenomsGenre(map);
    }
  }, []);

  useEffect(() => { loadPartenaires(); loadPrenomsGenre(); }, [loadPartenaires, loadPrenomsGenre]);

  const detectGenre = useCallback((prenom: string): string | null => {
    const key = prenom.trim().split(/[-\s]/)[0].toLowerCase();
    return prenomsGenre[key] || null;
  }, [prenomsGenre]);

  const resetForm = () => { setForm(emptyForm); setAvatarFile(null); setAvatarPreview(null); };

  const handleAvatarSelect = (file: File) => {
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (partenaireId: string, file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `partenaires/${partenaireId}/photo.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { console.error("Photo upload error:", error); return null; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const formToRow = () => ({
    prenom: form.prenom.trim(),
    nom: form.nom.trim().toUpperCase(),
    societe: form.societe.trim(),
    commission: parseFloat(form.commission) || 0,
    partenaire_referent: form.partenaire_referent.trim() || "Dynabuy",
    statut: form.statut,
    is_directeur_agence: form.is_directeur_agence,
    is_president_club: form.is_president_club,
    is_cadre_externalise: form.is_cadre_externalise,
    pole_expertise: form.is_cadre_externalise ? form.pole_expertise.trim() || null : null,
    secteurs: form.secteurs.split(/[,;/\s]+/).map(s => s.trim()).filter(Boolean),
    email: form.email.trim(),
    telephone: form.telephone.trim(),
    date_anniversaire: form.date_anniversaire || null,
    genre: form.genre || null,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom.trim() || !form.nom.trim()) return;
    setSaving(true);
    const row = formToRow();
    const { data, error } = await supabase.from("partenaires").insert(row).select().single();
    if (error) { toast.error("Erreur: " + error.message); setSaving(false); return; }
    if (avatarFile && data) {
      const url = await uploadPhoto(data.id, avatarFile);
      if (url) await supabase.from("partenaires").update({ photo_url: url }).eq("id", data.id);
    }
    toast.success("Partenaire créé");
    resetForm();
    setCreateOpen(false);
    loadPartenaires();
    setSaving(false);
  };

  const openEditDialog = (p: Partenaire) => {
    setEditP(p);
    setForm({
      prenom: p.prenom,
      nom: p.nom,
      societe: p.societe,
      commission: p.commission.toString(),
      partenaire_referent: p.partenaire_referent,
      statut: p.statut || "actif",
      is_directeur_agence: p.is_directeur_agence,
      is_president_club: p.is_president_club,
      is_cadre_externalise: p.is_cadre_externalise,
      pole_expertise: p.pole_expertise || "",
      secteurs: (p.secteurs || []).join(" / "),
      email: p.email,
      telephone: p.telephone,
      date_anniversaire: p.date_anniversaire || "",
      genre: p.genre || "",
    });
    setAvatarPreview(p.photo_url);
    setAvatarFile(null);
  };

  const handleEditSave = async () => {
    if (!editP) return;
    setSaving(true);
    const row = formToRow();
    if (avatarFile) {
      const url = await uploadPhoto(editP.id, avatarFile);
      if (url) (row as any).photo_url = url;
    }
    const { error } = await supabase.from("partenaires").update(row).eq("id", editP.id);
    if (error) { toast.error("Erreur: " + error.message); setSaving(false); return; }
    toast.success("Partenaire mis à jour");
    setEditP(null);
    resetForm();
    loadPartenaires();
    setSaving(false);
  };

  const handleDelete = async (p: Partenaire) => {
    if (!confirm(`Supprimer le partenaire ${p.prenom} ${p.nom} ?`)) return;
    const { error } = await supabase.from("partenaires").delete().eq("id", p.id);
    if (error) toast.error("Erreur: " + error.message);
    else { toast.success("Partenaire supprimé"); loadPartenaires(); }
  };

  const uniqueReferents = [...new Set(partenaires.map(p => p.partenaire_referent))].sort();

  const filtered = partenaires.filter(p => {
    if (filterStatut !== "Tous" && p.statut !== filterStatut) return false;
    if (filterReferent !== "Tous" && p.partenaire_referent !== filterReferent) return false;
    if (filterRole !== "Tous") {
      if (filterRole === "directeur" && !p.is_directeur_agence) return false;
      if (filterRole === "president" && !p.is_president_club) return false;
      if (filterRole === "cadre" && !p.is_cadre_externalise) return false;
      if (filterRole === "dir+pres" && !(p.is_directeur_agence && p.is_president_club)) return false;
      if (filterRole === "dir+cadre" && !(p.is_directeur_agence && p.is_cadre_externalise)) return false;
      if (filterRole === "les3" && !(p.is_directeur_agence && p.is_president_club && p.is_cadre_externalise)) return false;
    }
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    const hay = `${p.prenom} ${p.nom} ${p.societe} ${p.email} ${p.partenaire_referent} ${(p.secteurs || []).join(" ")}`.toLowerCase();
    return term.split(/\s+/).every(w => hay.includes(w));
  });

  // Gender stats
  const nbHommes = filtered.filter(p => p.genre === 'M').length;
  const nbFemmes = filtered.filter(p => p.genre === 'F').length;
  const nbInconnu = filtered.length - nbHommes - nbFemmes;

  const renderFormFields = (isEdit = false) => (
    <div className="space-y-3">
      {/* Avatar */}
      <div className="flex justify-center">
        <label className="relative cursor-pointer group">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Photo" className="w-16 h-16 rounded-full object-cover border-2 border-border group-hover:opacity-75 transition-opacity" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-border group-hover:border-primary transition-colors">
              <FontAwesomeIcon icon={faCamera} className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatarSelect(e.target.files[0])} />
          <span className="text-[10px] text-muted-foreground absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">Photo</span>
        </label>
      </div>

      {/* Prénom / Nom */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Prénom</label>
          <Input
            value={form.prenom}
            onChange={(e) => {
              const v = e.target.value;
              const g = detectGenre(v);
              setForm(f => ({ ...f, prenom: v, ...(g ? { genre: g } : {}) }));
            }}
            className="h-9 text-sm"
            placeholder="Prénom"
            required
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nom</label>
          <Input value={form.nom} onChange={(e) => setForm(f => ({ ...f, nom: e.target.value }))} className="h-9 text-sm" placeholder="NOM" required />
        </div>
      </div>

      {/* Genre */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Genre</label>
        <Select value={form.genre || "non_defini"} onValueChange={(v) => setForm(f => ({ ...f, genre: v === "non_defini" ? "" : v }))}>
          <SelectTrigger className="h-9 text-sm w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="non_defini">Non défini</SelectItem>
            <SelectItem value="M">
              <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faMars} className="h-3 w-3 text-blue-500" /> Homme</span>
            </SelectItem>
            <SelectItem value="F">
              <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faVenus} className="h-3 w-3 text-pink-300" /> Femme</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statut */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Statut</label>
        <Select value={form.statut} onValueChange={(v) => setForm(f => ({ ...f, statut: v }))}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Société */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Société</label>
        <Input value={form.societe} onChange={(e) => setForm(f => ({ ...f, societe: e.target.value }))} className="h-9 text-sm" placeholder="Nom de la société" />
      </div>

      {/* Commission */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Commission (%)</label>
        <Input type="number" min={0} max={100} step={0.1} value={form.commission} onChange={(e) => setForm(f => ({ ...f, commission: e.target.value }))} className="h-9 text-sm w-32" />
      </div>

      {/* Partenaire référent */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Partenaire référent</label>
        <Select value={form.partenaire_referent} onValueChange={(v) => setForm(f => ({ ...f, partenaire_referent: v }))}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Dynabuy">Dynabuy</SelectItem>
            <Separator className="my-1" />
            {partenaires
              .filter(p => !editP || p.id !== editP.id)
              .sort((a, b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`))
              .map(p => (
                <SelectItem key={p.id} value={`${p.prenom} ${p.nom}`}>{p.prenom} {p.nom}</SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Casquettes */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Fonctions</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox id={`${isEdit ? "e" : "c"}-da`} checked={form.is_directeur_agence} onCheckedChange={(v) => setForm(f => ({ ...f, is_directeur_agence: !!v }))} />
            <label htmlFor={`${isEdit ? "e" : "c"}-da`} className="text-sm cursor-pointer">Directeur d'agence</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id={`${isEdit ? "e" : "c"}-pc`} checked={form.is_president_club} onCheckedChange={(v) => setForm(f => ({ ...f, is_president_club: !!v }))} />
            <label htmlFor={`${isEdit ? "e" : "c"}-pc`} className="text-sm cursor-pointer">Président de club d'affaires</label>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id={`${isEdit ? "e" : "c"}-ce`} checked={form.is_cadre_externalise} onCheckedChange={(v) => setForm(f => ({ ...f, is_cadre_externalise: !!v }))} className="mt-0.5" />
            <div className="flex-1">
              <label htmlFor={`${isEdit ? "e" : "c"}-ce`} className="text-sm cursor-pointer">Cadres externalisé.e.s</label>
              {form.is_cadre_externalise && (
                <Select value={form.pole_expertise || ""} onValueChange={(v) => setForm(f => ({ ...f, pole_expertise: v }))}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Pôle d'expertise" /></SelectTrigger>
                  <SelectContent>
                    {["Direction Générale", "Direction Commercial", "Ressources Humaines", "Finance & Administratif", "Achats & Logistique", "Marketing & Communication", "Informatique & Data", "RGPD", "Qualité"].map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secteurs */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Secteur(s) attribué(s)</label>
        <Input value={form.secteurs} onChange={(e) => setForm(f => ({ ...f, secteurs: e.target.value }))} className="h-9 text-sm" placeholder="28 / 78 / 92" />
        <span className="text-[10px] text-muted-foreground">Séparés par / , ou espace</span>
      </div>

      {/* Email + Téléphone */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="h-9 text-sm" placeholder="email@exemple.com" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Téléphone</label>
          <Input value={form.telephone} onChange={(e) => setForm(f => ({ ...f, telephone: e.target.value }))} className="h-9 text-sm" placeholder="06 XX XX XX XX" />
        </div>
      </div>

      {/* Anniversaire */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Date d'anniversaire</label>
        <Input type="date" value={form.date_anniversaire} onChange={(e) => setForm(f => ({ ...f, date_anniversaire: e.target.value }))} className="h-9 text-sm w-44" />
      </div>
    </div>
  );

  return (
    <div className="bg-card rounded-lg shadow-soft p-4 sm:p-5">
      {/* Gender balance bar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-blue-500/10 rounded-md px-2.5 py-1">
          <FontAwesomeIcon icon={faMars} className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">{nbHommes}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-pink-300/15 rounded-md px-2.5 py-1">
          <FontAwesomeIcon icon={faVenus} className="h-3.5 w-3.5 text-pink-300" />
          <span className="text-xs font-semibold text-pink-500 dark:text-pink-300">{nbFemmes}</span>
        </div>
        {nbInconnu > 0 && (
          <span className="text-[10px] text-muted-foreground">({nbInconnu} non défini{nbInconnu > 1 ? "s" : ""})</span>
        )}
        {filtered.length > 0 && (nbHommes + nbFemmes) > 0 && (
          <div className="flex items-center gap-1 ml-1">
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.max(4, (nbHommes / (nbHommes + nbFemmes)) * 80)}px` }} />
            <div className="h-2 rounded-full bg-pink-300" style={{ width: `${Math.max(4, (nbFemmes / (nbHommes + nbFemmes)) * 80)}px` }} />
          </div>
        )}
        <button onClick={() => setGenreManagerOpen(true)} className="p-1 rounded hover:bg-secondary transition-colors ml-auto" title="Gérer les prénoms">
          <FontAwesomeIcon icon={faGears} className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-foreground">Gestion des partenaires</h3>
        <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none justify-end">
          <Input
            placeholder="Rechercher…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 sm:w-[260px] h-9 text-sm rounded-md"
          />
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md gap-1.5 shrink-0">
                <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouveau partenaire</DialogTitle>
                <DialogDescription>Ajoutez un partenaire avec ses informations.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="py-3">
                {renderFormFields(false)}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setCreateOpen(false); resetForm(); }} className="rounded-md">Annuler</Button>
                  <Button type="submit" size="sm" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                    {saving ? "Création…" : "Créer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
          <FontAwesomeIcon icon={faFilter} className="h-3 w-3" />
          <span className="text-xs font-semibold hidden sm:inline">Filtres</span>
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[130px] h-8 text-xs rounded-md"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous statuts</SelectItem>
            {STATUT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterReferent} onValueChange={setFilterReferent}>
          <SelectTrigger className="w-[150px] h-8 text-xs rounded-md"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous référents</SelectItem>
            {uniqueReferents.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px] h-8 text-xs rounded-md"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Toutes fonctions</SelectItem>
            <Separator className="my-1" />
            <SelectItem value="directeur">Dir. Agence</SelectItem>
            <SelectItem value="president">Prés. Club</SelectItem>
            <SelectItem value="cadre">Cadre ext.</SelectItem>
            <Separator className="my-1" />
            <SelectItem value="dir+pres">Dir. Ag. + Prés. Club</SelectItem>
            <SelectItem value="dir+cadre">Dir. Ag. + Cadre Ext.</SelectItem>
            <SelectItem value="les3">Les 3 fonctions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wider w-10"></TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Nom</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Statut</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Fonction</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Société</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Comm.</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Référent</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Secteurs</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filtered.map((p) => (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-border hover:bg-secondary/50 transition-colors">
                      <TableCell><PartenaireAvatar url={p.photo_url} name={`${p.prenom} ${p.nom}`} /></TableCell>
                      <TableCell className="text-sm font-medium">
                        <span className="flex items-center gap-1.5">
                          <GenderIcon genre={p.genre} />
                          {p.prenom} {p.nom}
                        </span>
                      </TableCell>
                      <TableCell><StatutBadge statut={p.statut} /></TableCell>
                      <TableCell><RoleChips p={p} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.societe || "—"}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{p.commission}%</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.partenaire_referent}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{(p.secteurs || []).join(" / ") || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button onClick={() => setViewP(p)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title="Voir">
                            <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => openEditDialog(p)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title="Modifier">
                            <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(p)} className="p-1.5 rounded-sm hover:bg-primary/10 transition-colors" title="Supprimer">
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

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            <AnimatePresence>
              {filtered.map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-card border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <PartenaireAvatar url={p.photo_url} name={`${p.prenom} ${p.nom}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                          <GenderIcon genre={p.genre} />
                          {p.prenom} {p.nom}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{p.societe}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setViewP(p)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors"><FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => openEditDialog(p)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors"><FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => handleDelete(p)} className="p-1.5 rounded-sm hover:bg-primary/10 transition-colors"><FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5 text-primary" /></button>
                    </div>
                  </div>
                  <RoleChips p={p} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <p className="text-xs text-muted-foreground mt-3 tabular-nums">
            {filtered.length} partenaire{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
          </p>
        </>
      )}

      {/* View dialog */}
      <Dialog open={!!viewP} onOpenChange={(o) => { if (!o) setViewP(null); }}>
        <DialogContent className="sm:max-w-md pt-20 [&>button]:hidden" style={{ overflow: 'visible' }}>
          {viewP && (
            <>
              <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                <PartenaireAvatar url={viewP.photo_url} name={`${viewP.prenom} ${viewP.nom}`} size={128} />
              </div>
              <button onClick={() => setViewP(null)} className="absolute -right-3 -top-3 w-8 h-8 rounded-full flex items-center justify-center z-50 hover:opacity-90 transition-opacity" style={{ backgroundColor: "#ee4540" }}>
                <X className="h-4 w-4 text-white" />
              </button>
            </>
          )}
          <DialogHeader className="text-center">
            <DialogTitle className="sr-only">Détails</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center w-full">Fiche partenaire</DialogDescription>
          </DialogHeader>
          {viewP && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-1.5">
                  <GenderIcon genre={viewP.genre} />
                  {viewP.prenom} {viewP.nom}
                </p>
                <p className="text-xs text-muted-foreground">{viewP.societe}</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <StatutBadge statut={viewP.statut} />
                  <a
                    href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(viewP.prenom + " " + viewP.nom)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-[#0077B5]/10 transition-colors"
                    title="Voir sur LinkedIn"
                  >
                    <FontAwesomeIcon icon={faLinkedin} className="h-4 w-4 text-[#0077B5]" />
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground block">Commission</span><span className="font-medium text-foreground">{viewP.commission}%</span></div>
                <div><span className="text-xs text-muted-foreground block">Référent</span><span className="font-medium text-foreground">{viewP.partenaire_referent}</span></div>
                <div><span className="text-xs text-muted-foreground block">Email</span><span className="font-medium text-foreground break-all">{viewP.email || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Téléphone</span><span className="font-medium text-foreground">{viewP.telephone || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Anniversaire</span><span className="font-medium text-foreground">{viewP.date_anniversaire ? new Date(viewP.date_anniversaire).toLocaleDateString("fr-FR") : "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Secteurs</span><span className="font-medium text-foreground">{(viewP.secteurs || []).join(" / ") || "—"}</span></div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Fonctions</span>
                <RoleChips p={viewP} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editP} onOpenChange={(o) => { if (!o) { setEditP(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le partenaire</DialogTitle>
            <DialogDescription>Modifiez les informations de {editP?.prenom} {editP?.nom}</DialogDescription>
          </DialogHeader>
           <div className="py-3">
            {renderFormFields(true)}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => { setEditP(null); resetForm(); }} className="rounded-md">Annuler</Button>
              <Button size="sm" disabled={saving} onClick={handleEditSave} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md gap-1.5">
                <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Genre Manager */}
      <GenreManager open={genreManagerOpen} onOpenChange={setGenreManagerOpen} onUpdate={() => { loadPrenomsGenre(); loadPartenaires(); }} />
    </div>
  );
}
