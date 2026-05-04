import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilter,
  faXmark,
  faCamera,
  faTrash,
  faPlus,
  faTrashCan,
  faPenToSquare,
  faFloppyDisk,
  faEye,
  faSort,
  faSortUp,
  faSortDown,
  faFileImport,
  faFileArrowDown,
  faBuilding,
  faUsers,
  faBullseye,
  faEuroSign,
  faTowerBroadcast,
  faVenusMars,
  faMapLocationDot,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
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
import { Checkbox } from "@/components/ui/checkbox";
import { syncClubPresidentPartenaire } from "@/lib/clubPresidentPartenaire";
import { clubNameInitials, displayClubName } from "@/lib/clubDisplayName";
import { DepartementTableCell } from "@/components/DepartementTableCell";
import {
  extractDepartementCode,
  findSecteurIdForDepartementCode,
  normalizeDepartementForStorage,
} from "@/lib/departementDisplay";
import { normalizePresidentImportName } from "@/lib/personNameNormalize";
import { ActionIconButton } from "@/components/ActionIconButton";

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
  president_partenaire_id: string | null;
}

interface SecteurRow {
  id: string;
  nom: string;
  departements: string[];
}

/**
 * `secteur_id` en base, ou secteur déduit du département selon la carte Administration › Secteurs.
 */
function resolveSecteurIdForClub(c: Club, secteurs: SecteurRow[]): string | null {
  if (c.secteur_id) return c.secteur_id;
  const code = extractDepartementCode(c.departement);
  return findSecteurIdForDepartementCode(code, secteurs);
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

/** Moyenne par club (membres, leads, etc.) — jusqu’à une décimale, format fr-FR. */
function formatAvgMembresParClub(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Affichage (tableau, KPI, export) : retire le préfixe « Secteur » si présent. */
function formatSecteurDisplayName(nom: string): string {
  const t = nom.trim();
  if (!t) return "";
  const stripped = t.replace(/^secteur\s+/i, "").trim();
  return stripped || t;
}

function normalizePartenaireGenre(raw: string | null | undefined): "M" | "F" | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!s) return null;
  const c = s.charAt(0).toUpperCase();
  if (c === "M") return "M";
  if (c === "F") return "F";
  return null;
}

/** Premier token du prénom (Dynabuy / slash), pour inférence H/F via `prenoms_genre`. */
function presidentPrenomTokenForGenre(c: Club): string {
  const norm = normalizePresidentImportName(c.president_nom).trim();
  if (!norm) return "";
  return norm.split(/[-\s]/)[0]?.toLowerCase() ?? "";
}

/** Référent « en direct » Geoffroy L'HONNEN : agence ou libellé référent. */
function isGeoffroyLHonnenReferent(agence: string | null | undefined, referentPartenaire: string | null | undefined): boolean {
  const parts = [agence, referentPartenaire].filter(Boolean) as string[];
  for (const raw of parts) {
    const n = stripDiacritics(raw).toLowerCase();
    if (n.includes("geoffroy") && n.includes("honnen")) return true;
  }
  return false;
}

function presidentIdentityKey(c: Club): string {
  const e = c.email_president?.trim().toLowerCase();
  if (e) return `e:${e}`;
  return `n:${normalizePresidentImportName(c.president_nom).toLowerCase().replace(/\s+/g, " ").trim()}`;
}

function AdminKpiCard({
  value,
  label,
  title,
  className,
  icon,
  subline,
}: {
  value: ReactNode;
  label: string;
  title?: string;
  className?: string;
  icon?: IconDefinition;
  /** Ligne sous le total (ex. moyenne / club). */
  subline?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-m3-standard ease-m3-standard hover:border-border hover:shadow-md min-w-0 w-full h-full ${className ?? ""}`}
      title={title}
    >
      <div className="relative flex flex-col items-center justify-center gap-1 px-3 py-2.5 text-center sm:gap-1.5 sm:px-3 sm:py-3">
        {icon ? (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted/50 text-muted-foreground shadow-sm transition-transform duration-m3-standard ease-m3-standard group-hover:scale-[1.03] dark:border-border/60 dark:bg-muted/35"
            aria-hidden
          >
            <FontAwesomeIcon icon={icon} className="h-[0.95rem] w-[0.95rem] sm:h-[1rem] sm:w-[1rem]" />
          </div>
        ) : null}
        <p className="text-2xl font-bold tabular-nums leading-none tracking-tight text-foreground sm:text-3xl">
          {value}
        </p>
        {subline ? (
          <p className="max-w-[14rem] text-[10px] font-medium tabular-nums leading-tight text-muted-foreground sm:text-[11px]">
            {subline}
          </p>
        ) : null}
        <p className="max-w-[14rem] text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-snug sm:text-[11px]">
          {label}
        </p>
      </div>
    </div>
  );
}

/** Répartition compacte : présidents distincts par nombre exact de clubs (1 à 10). */
function PresidentMultiClubChips({ hist }: { hist: Record<number, number> }) {
  const bins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
  return (
    <div
      className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-4 sm:px-5 sm:py-5"
      role="list"
      aria-label="Nombre de présidents distincts par nombre de clubs gérés"
    >
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        {bins.map((n) => {
          const count = hist[n] ?? 0;
          const clubWord = n === 1 ? "club" : "clubs";
          const title =
            count === 0
              ? `Aucun président avec exactement ${n} ${clubWord}`
              : `${count} président${count > 1 ? "s" : ""} avec exactement ${n} ${clubWord}`;
          return (
            <span
              key={n}
              role="listitem"
              title={title}
              className={`inline-flex items-stretch overflow-hidden rounded-lg border text-sm shadow-sm ring-0 transition-colors sm:text-base ${
                count === 0
                  ? "border-border/50 text-muted-foreground/80"
                  : "border-border/80 text-foreground hover:border-border"
              }`}
            >
              <span
                className={`flex min-h-10 min-w-[2.75rem] items-center justify-center border-r border-border/70 px-3 font-semibold tabular-nums sm:min-h-11 sm:min-w-[3rem] sm:px-4 ${
                  count === 0 ? "bg-muted/50" : "bg-muted/90 dark:bg-muted/70"
                }`}
              >
                {n}
              </span>
              <span className="flex min-h-10 min-w-[3rem] items-center justify-center bg-background px-3 font-bold tabular-nums sm:min-h-11 sm:min-w-[3.5rem] sm:px-4">
                {count}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function KpiSectionTitle({
  children,
  hint,
  centered,
}: {
  children: ReactNode;
  hint?: ReactNode;
  /** Titre + hint centrés (ex. bloc Répartition). */
  centered?: boolean;
}) {
  return (
    <div
      className={
        centered
          ? "flex flex-col items-center gap-1 text-center"
          : "flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3"
      }
    >
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
        {children}
      </h4>
      {hint ? (
        <div
          className={`text-[10px] text-muted-foreground/80 ${centered ? "max-w-md text-center" : "sm:text-right"}`}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

type SortKey =
  | "nom"
  | "format"
  | "president_nom"
  | "referent_nom"
  | "secteur_nom"
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
  referent_nom: "Référent",
  secteur_nom: "Secteur",
  departement: "Département",
  statut: "Statut",
  nb_membres_actifs: "Membres",
  nb_leads_transformes: "Leads",
  montant_ca: "CA",
  date_creation: "Date de création",
};

/** Valeur sentinelle du filtre « club sans référent affiché » (évite collision avec un libellé métier). */
const FILTER_REFERENT_SANS = "__sans_ref__";

function compareClubs(
  a: Club,
  b: Club,
  key: SortKey,
  dir: "asc" | "desc",
  secteurLabelForClub: (c: Club) => string,
  referentLabel: (c: Club) => string,
): number {
  const mul = dir === "asc" ? 1 : -1;
  const str = (x: string | null | undefined) => (x ?? "").toLocaleLowerCase();
  switch (key) {
    case "nom":
      return mul * displayClubName(a.nom).localeCompare(displayClubName(b.nom), "fr", { numeric: true });
    case "president_nom":
      return (
        mul *
        normalizePresidentImportName(a.president_nom).localeCompare(
          normalizePresidentImportName(b.president_nom),
          "fr",
          { numeric: true },
        )
      );
    case "referent_nom":
      return mul * referentLabel(a).localeCompare(referentLabel(b), "fr", { numeric: true });
    case "secteur_nom":
      return mul * formatSecteurDisplayName(secteurLabelForClub(a)).localeCompare(
        formatSecteurDisplayName(secteurLabelForClub(b)),
        "fr",
        { numeric: true },
      );
    case "format":
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

function escapeCsvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[";\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Exporte la vue actuelle (filtres + option masquer doublons), séparateur `;`, UTF-8 BOM pour Excel. */
function downloadClubsCsv(
  rows: Club[],
  basename: string,
  ctx: {
    secteurLabelForClub: (c: Club) => string;
    referentLabel: (c: Club) => string;
  },
) {
  const sep = ";";
  const headers = [
    "Nom",
    "Format",
    "Président",
    "Vice-président",
    "Département",
    "Statut",
    "Membres actifs",
    "Leads transformés",
    "CA (€)",
    "Date création",
    "Adresse",
    "Email président",
    "Tél. président",
    "Agence mère",
    "Agence rattachement",
    "Secteur",
    "Référent agence",
  ];
  const line = (c: Club) =>
    [
      displayClubName(c.nom),
      c.format,
      normalizePresidentImportName(c.president_nom),
      c.vice_president_nom ?? "",
      c.departement ?? "",
      c.statut,
      c.nb_membres_actifs,
      c.nb_leads_transformes,
      Math.round(c.montant_ca * 100) / 100,
      c.date_creation ?? "",
      c.adresse ?? "",
      c.email_president ?? "",
      c.telephone_president ?? "",
      c.agence_mere ?? "",
      c.agence_rattachement ?? "",
      formatSecteurDisplayName(ctx.secteurLabelForClub(c)),
      ctx.referentLabel(c),
    ].map(escapeCsvCell).join(sep);

  const bom = "\uFEFF";
  const body = [headers.join(sep), ...rows.map(line)].join("\r\n");
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${basename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
        <AvatarImage src={club.logo_url || undefined} alt={displayClubName(club.nom)} />
        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
          {clubNameInitials(club.nom)}
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
  secteur_id: "",
};

export default function AdminClubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [secteurs, setSecteurs] = useState<SecteurRow[]>([]);
  const [partenairesById, setPartenairesById] = useState<
    Record<string, { partenaire_referent: string; genre: string | null }>
  >({});
  /** Prénom → M/F (table `prenoms_genre`), pour compléter les genres partenaires absents. */
  const [prenomsGenreMap, setPrenomsGenreMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFormat, setFilterFormat] = useState("Tous");
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [filterAnnee, setFilterAnnee] = useState("Tous");
  const [filterDept, setFilterDept] = useState("Tous");
  const [filterSecteurId, setFilterSecteurId] = useState("Tous");
  const [filterAgenceRattachement, setFilterAgenceRattachement] = useState("Tous");
  const [filterReferent, setFilterReferent] = useState("Tous");
  const [sortKey, setSortKey] = useState<SortKey>("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [membresMin, setMembresMin] = useState(0);
  const [leadsMin, setLeadsMin] = useState(0);
  const [caMin, setCaMin] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** Masque les lignes en double après import (même `nom` exact, insensible à la casse des espaces). */
  const [hideDuplicateNoms, setHideDuplicateNoms] = useState(false);
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
    try {
      const [clubsRes, sectRes, parRes, pgRes] = await Promise.all([
        supabase.from("clubs").select("*").order("nom"),
        supabase.from("secteurs").select("id, nom, departements").order("nom"),
        supabase.from("partenaires").select("id, partenaire_referent, genre"),
        supabase.from("prenoms_genre").select("prenom, genre"),
      ]);
      if (clubsRes.error) {
        toast.error("Clubs : " + clubsRes.error.message);
        setClubs([]);
      } else if (clubsRes.data) {
        setClubs(clubsRes.data as Club[]);
      }
      if (sectRes.error) {
        toast.error("Secteurs : " + sectRes.error.message);
        setSecteurs([]);
      } else if (sectRes.data) {
        setSecteurs(sectRes.data as SecteurRow[]);
      }
      if (parRes.error) {
        toast.error("Partenaires : " + parRes.error.message);
        setPartenairesById({});
      } else if (parRes.data) {
        const m: Record<string, { partenaire_referent: string; genre: string | null }> = {};
        for (const p of parRes.data as { id: string; partenaire_referent: string; genre: string | null }[]) {
          m[p.id] = { partenaire_referent: p.partenaire_referent, genre: p.genre ?? null };
        }
        setPartenairesById(m);
      }
      if (pgRes.error) {
        setPrenomsGenreMap({});
      } else if (pgRes.data) {
        const map: Record<string, string> = {};
        for (const d of pgRes.data as { prenom: string; genre: string }[]) {
          map[d.prenom.toLowerCase()] = d.genre;
        }
        setPrenomsGenreMap(map);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Chargement impossible : " + msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClubs(); }, [loadClubs]);

  const resetForm = () => setForm(emptyForm);

  const formToRow = () => {
    const deptNorm = normalizeDepartementForStorage(form.departement);
    const autoSecteur = findSecteurIdForDepartementCode(
      extractDepartementCode(deptNorm ?? form.departement),
      secteurs,
    );
    const manualSecteur = form.secteur_id?.trim();
    return {
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
      departement: deptNorm,
      secteur_id: manualSecteur ? manualSecteur : autoSecteur ?? null,
      nb_membres_actifs: parseInt(form.nb_membres_actifs) || 0,
      nb_leads_transformes: parseInt(form.nb_leads_transformes) || 0,
      montant_ca: parseFloat(form.montant_ca) || 0,
      date_creation: form.date_creation || null,
      date_desactivation: form.date_desactivation || null,
    };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    const { data: created, error } = await supabase.from("clubs").insert(formToRow()).select("id").single();
    if (error) { toast.error("Erreur : " + error.message); setSaving(false); return; }
    if (created?.id) await syncClubPresidentPartenaire(created.id);
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
      secteur_id: c.secteur_id || "",
    });
  };

  const handleEditSave = async () => {
    if (!editClub) return;
    setSaving(true);
    const { error } = await supabase.from("clubs").update(formToRow()).eq("id", editClub.id);
    if (error) { toast.error("Erreur : " + error.message); setSaving(false); return; }
    await syncClubPresidentPartenaire(editClub.id);
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
    clubs.forEach(c => {
      if (!c.departement) return;
      const code = extractDepartementCode(c.departement) ?? c.departement.trim();
      if (code) depts.add(code);
    });
    return ["Tous", ...Array.from(depts).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
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
    filterDept !== "Tous", filterSecteurId !== "Tous", filterAgenceRattachement !== "Tous",
    filterReferent !== "Tous",
    membresMin > 0, leadsMin > 0, caMin > 0, hideDuplicateNoms,
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterFormat("Tous"); setFilterStatut("Tous"); setFilterAnnee("Tous");
    setFilterDept("Tous"); setFilterSecteurId("Tous"); setFilterAgenceRattachement("Tous");
    setFilterReferent("Tous");
    setMembresMin(0); setLeadsMin(0); setCaMin(0);
    setHideDuplicateNoms(false);
    setSearchQuery("");
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const secteurNom = useCallback(
    (id: string | null) => (id ? secteurs.find(s => s.id === id)?.nom ?? "" : ""),
    [secteurs],
  );

  /** Libellé secteur affiché : en base ou déduit du département (même règle qu’Admin › Secteurs). */
  const secteurLabelForClub = useCallback(
    (c: Club) => {
      const id = resolveSecteurIdForClub(c, secteurs);
      return id ? secteurs.find((s) => s.id === id)?.nom ?? "" : "";
    },
    [secteurs],
  );

  const referentLabel = useCallback(
    (c: Club) =>
      (c.agence_rattachement ?? "").trim() ||
      (c.president_partenaire_id ? partenairesById[c.president_partenaire_id]?.partenaire_referent ?? "" : ""),
    [partenairesById],
  );

  const uniqueReferentLabels = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach((c) => {
      const r = referentLabel(c).trim();
      if (r) set.add(r);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  }, [clubs, referentLabel]);

  const filtered = useMemo(() => clubs.filter(c => {
    if (filterFormat !== "Tous" && c.format !== filterFormat) return false;
    if (filterStatut !== "Tous" && c.statut !== filterStatut) return false;
    if (filterAnnee !== "Tous" && (!c.date_creation || !c.date_creation.startsWith(filterAnnee))) return false;
    if (filterDept !== "Tous") {
      const fc = extractDepartementCode(c.departement) ?? c.departement?.trim() ?? "";
      if (fc !== filterDept) return false;
    }
    if (filterSecteurId !== "Tous" && resolveSecteurIdForClub(c, secteurs) !== filterSecteurId) return false;
    if (filterAgenceRattachement !== "Tous" && c.agence_rattachement !== filterAgenceRattachement) return false;
    if (filterReferent !== "Tous") {
      const ref = referentLabel(c).trim();
      if (filterReferent === FILTER_REFERENT_SANS) {
        if (ref) return false;
      } else if (ref !== filterReferent) {
        return false;
      }
    }
    if (c.nb_membres_actifs < membresMin) return false;
    if (c.nb_leads_transformes < leadsMin) return false;
    if (c.montant_ca < caMin) return false;
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    const sn = secteurLabelForClub(c);
    const snDisplay = formatSecteurDisplayName(sn);
    const refL = referentLabel(c);
    const hay = `${c.nom} ${displayClubName(c.nom)} ${c.president_nom} ${normalizePresidentImportName(c.president_nom)} ${c.email_president || ""} ${c.departement || ""} ${c.agence_mere || ""} ${c.agence_rattachement || ""} ${refL} ${sn} ${snDisplay} ${c.adresse || ""}`.toLowerCase();
    return term.split(/\s+/).every(w => hay.includes(w));
  }), [clubs, filterFormat, filterStatut, filterAnnee, filterDept, filterSecteurId, filterAgenceRattachement, filterReferent, membresMin, leadsMin, caMin, searchQuery, secteurs, secteurLabelForClub, referentLabel]);

  const sortedList = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => compareClubs(a, b, sortKey, sortDir, secteurLabelForClub, referentLabel));
    return copy;
  }, [filtered, sortKey, sortDir, secteurLabelForClub, referentLabel]);

  const rowsToDisplay = useMemo(() => {
    if (!hideDuplicateNoms) return sortedList;
    const seen = new Set<string>();
    const out: Club[] = [];
    for (const c of sortedList) {
      const key = c.nom.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }, [sortedList, hideDuplicateNoms]);

  const totalMembres = rowsToDisplay.reduce((s, c) => s + c.nb_membres_actifs, 0);
  const totalLeads = rowsToDisplay.reduce((s, c) => s + c.nb_leads_transformes, 0);
  const totalCA = rowsToDisplay.reduce((s, c) => s + c.montant_ca, 0);
  const nClubsVue = rowsToDisplay.length;
  const sublineMoyMembres =
    nClubsVue > 0 ? `Moy. ${formatAvgMembresParClub(totalMembres / nClubsVue)} / club` : undefined;
  const sublineMoyLeads =
    nClubsVue > 0 ? `Moy. ${formatAvgMembresParClub(totalLeads / nClubsVue)} / club` : undefined;
  const sublineMoyCA =
    nClubsVue > 0 ? `Moy. ${formatCA(totalCA / nClubsVue)} / club` : undefined;

  /** KPIs étendus : toujours calculés sur tous les clubs en base (indépendamment des filtres). */
  const extendedKpis = useMemo(() => {
    const referentP = (c: Club) =>
      c.president_partenaire_id ? partenairesById[c.president_partenaire_id]?.partenaire_referent ?? "" : "";

    let clubsGeoffroyReferent = 0;
    const hist: Record<number, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0,
    };

    const byPresident = new Map<string, number>();
    for (const c of clubs) {
      const pk = presidentIdentityKey(c);
      byPresident.set(pk, (byPresident.get(pk) ?? 0) + 1);
      if (isGeoffroyLHonnenReferent(c.agence_rattachement, referentP(c))) clubsGeoffroyReferent++;
    }

    /** Carte admin : compte les clubs avec ce secteur en base ou déduit du département. */
    const clubsPerSecteur = secteurs.map((s) => ({
      id: s.id,
      nom: s.nom,
      count: clubs.filter((c) => resolveSecteurIdForClub(c, secteurs) === s.id).length,
    }));

    for (const nClub of byPresident.values()) {
      if (nClub >= 1 && nClub <= 10) hist[nClub]++;
    }

    const genreByPresident = new Map<string, "M" | "F" | null>();
    const sampleClubByPresident = new Map<string, Club>();
    for (const c of clubs) {
      const pk = presidentIdentityKey(c);
      if (!sampleClubByPresident.has(pk)) sampleClubByPresident.set(pk, c);
      const raw = c.president_partenaire_id ? partenairesById[c.president_partenaire_id]?.genre : null;
      const g = normalizePartenaireGenre(raw);
      if (!genreByPresident.has(pk)) genreByPresident.set(pk, g);
      else if (genreByPresident.get(pk) == null && g) genreByPresident.set(pk, g);
    }
    for (const [pk, g] of [...genreByPresident.entries()]) {
      if (g === "M" || g === "F") continue;
      const club = sampleClubByPresident.get(pk);
      if (!club) continue;
      const token = presidentPrenomTokenForGenre(club);
      if (!token) continue;
      const inferred = prenomsGenreMap[token];
      const inf = inferred === "M" || inferred === "F" ? inferred : normalizePartenaireGenre(inferred);
      if (inf === "M" || inf === "F") genreByPresident.set(pk, inf);
    }
    let presidentsH = 0;
    let presidentsF = 0;
    for (const g of genreByPresident.values()) {
      if (g === "M") presidentsH++;
      else if (g === "F") presidentsF++;
    }

    return {
      clubsGeoffroyReferent,
      clubsPerSecteur,
      presidentsH,
      presidentsF,
      hist,
    };
  }, [clubs, secteurs, partenairesById, prenomsGenreMap]);

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
      <ActionIconButton label="Voir le club" variant="view" onClick={() => setViewClub(c)}>
        <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5" />
      </ActionIconButton>
      {isAdmin && (
        <>
          <ActionIconButton label="Modifier le club" variant="edit" onClick={() => openEditDialog(c)}>
            <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5" />
          </ActionIconButton>
          <ActionIconButton label="Supprimer le club" variant="destructive" onClick={() => setDeleteClub(c)}>
            <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
          </ActionIconButton>
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
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Secteur</label>
        <Select value={filterSecteurId} onValueChange={setFilterSecteurId}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous</SelectItem>
            {secteurs.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {formatSecteurDisplayName(s.nom)}
              </SelectItem>
            ))}
          </SelectContent>
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
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Référent</label>
        <Select value={filterReferent} onValueChange={setFilterReferent}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous</SelectItem>
            <SelectItem value={FILTER_REFERENT_SANS}>Sans référent</SelectItem>
            {uniqueReferentLabels.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
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
      <div className="flex items-start gap-2 rounded-md border border-border/80 p-3">
        <Checkbox
          id="hide-dup-clubs"
          checked={hideDuplicateNoms}
          onCheckedChange={(v) => setHideDuplicateNoms(!!v)}
          className="mt-0.5"
        />
        <label htmlFor="hide-dup-clubs" className="text-xs leading-snug cursor-pointer text-foreground">
          Masquer les doublons (même nom exact en base) — utile si un import a dupliqué des lignes.
        </label>
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
          <Input value={form.departement} onChange={(e) => setForm(f => ({ ...f, departement: e.target.value }))} className="h-9 text-sm" placeholder="ex. 28 ou 28 Chartres" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Secteur</label>
          <Select value={form.secteur_id || "__auto"} onValueChange={(v) => setForm(f => ({ ...f, secteur_id: v === "__auto" ? "" : v }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Auto (département)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto">Auto selon département</SelectItem>
              {secteurs.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {formatSecteurDisplayName(s.nom)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Agence mère</label>
        <Input value={form.agence_mere} onChange={(e) => setForm(f => ({ ...f, agence_mere: e.target.value }))} className="h-9 text-sm" placeholder="Libellé libre" />
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

  const MobileCard = ({ c }: { c: Club }) => {
    const refMobile = referentLabel(c);
    return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-card border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ClubLogo club={c} isAdmin={isAdmin} onUpdate={loadClubs} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{displayClubName(c.nom)}</p>
            <p className="text-xs text-muted-foreground truncate">{normalizePresidentImportName(c.president_nom)}</p>
            {refMobile ? (
              <p className="text-[10px] text-muted-foreground/90 truncate" title="Référent">
                {refMobile}
              </p>
            ) : null}
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
      <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2">
        <span className="min-w-0">{formatSecteurDisplayName(secteurLabelForClub(c)) || "Sans secteur"}</span>
        <span className="shrink-0">{formatDate(c.date_creation)}</span>
      </div>
      <div className="text-[10px] text-muted-foreground border-t border-border/60 pt-1">
        <DepartementTableCell raw={c.departement} />
      </div>
    </motion.div>
    );
  };

  const kpiSection = !loading ? (
    <section className="space-y-6 min-w-0" aria-label="Indicateurs clubs">
      <div className="space-y-2.5">
        <KpiSectionTitle hint="Sommes et effectifs selon filtres actuels">Vue filtrée</KpiSectionTitle>
        <div className="grid grid-cols-12 gap-3 sm:gap-3.5">
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <AdminKpiCard
              value={rowsToDisplay.length}
              label="Clubs"
              title="Vue filtrée (tableau ci-dessous)"
              icon={faBuilding}
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <AdminKpiCard
              value={totalMembres}
              label="Membres"
              title={
                nClubsVue > 0
                  ? `Somme sur la vue filtrée — moyenne ${formatAvgMembresParClub(totalMembres / nClubsVue)} / club`
                  : "Somme sur la vue filtrée"
              }
              icon={faUsers}
              subline={sublineMoyMembres}
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <AdminKpiCard
              value={totalLeads}
              label="Leads"
              title={
                nClubsVue > 0
                  ? `Somme sur la vue filtrée — moyenne ${formatAvgMembresParClub(totalLeads / nClubsVue)} / club`
                  : "Somme sur la vue filtrée"
              }
              icon={faBullseye}
              subline={sublineMoyLeads}
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <AdminKpiCard
              value={formatCA(totalCA)}
              label="CA Total"
              title={
                nClubsVue > 0
                  ? `Somme sur la vue filtrée — moyenne ${formatCA(totalCA / nClubsVue)} / club`
                  : "Somme sur la vue filtrée"
              }
              icon={faEuroSign}
              subline={sublineMoyCA}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-dashed border-border/60 bg-muted/25 p-3 sm:p-4">
        <KpiSectionTitle
          hint={
            <span className="inline-flex max-w-prose items-start gap-1.5 rounded-lg bg-background/80 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground ring-1 ring-border/50">
              Les cartes suivantes utilisent <strong className="font-medium text-foreground/90">toute la base</strong>, sans tenir compte des filtres du tableau.
            </span>
          }
        >
          Base complète
        </KpiSectionTitle>
        <div className="grid grid-cols-12 gap-3 sm:gap-3.5">
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <AdminKpiCard
              value={extendedKpis.clubsGeoffroyReferent}
              label="Clubs en Direct"
              title="Clubs avec référent Geoffroy L'HONNEN (agence de rattachement ou référent partenaire)"
              icon={faTowerBroadcast}
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <AdminKpiCard
              value={`${extendedKpis.presidentsH} / ${extendedKpis.presidentsF}`}
              label="Présidents H / F"
              title="Présidents distincts : genre du partenaire lié, sinon inféré par le prénom (table prenoms_genre)"
              icon={faVenusMars}
            />
          </div>
          {extendedKpis.clubsPerSecteur.map((row) => (
            <div key={row.id} className="col-span-12 sm:col-span-6 lg:col-span-3">
              <AdminKpiCard
                value={row.count}
                label={formatSecteurDisplayName(row.nom)}
                title="Clubs dont le secteur en base ou le département (carte Admin › Secteurs) correspond à ce secteur."
                icon={faMapLocationDot}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <KpiSectionTitle centered hint="Nombre de présidents distincts par multi‑clubs">
          Répartition
        </KpiSectionTitle>
        <PresidentMultiClubChips hist={extendedKpis.hist} />
      </div>
    </section>
  ) : null;

  return (
    <div className="min-w-0 space-y-4">
      {kpiSection}
      <div className="bg-card rounded-2xl shadow-soft border border-border/60 p-4 sm:p-5">
      <div
        className="mb-4 rounded-xl border border-border/50 bg-muted/15 p-3 sm:p-4"
        aria-label="Filtres du tableau"
      >
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Filtrer l’affichage
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-1.5 min-w-0">
            <label htmlFor="filter-inline-format" className="text-[10px] font-medium text-muted-foreground">
              Format
            </label>
            <Select value={filterFormat} onValueChange={setFilterFormat}>
              <SelectTrigger id="filter-inline-format" className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-0">
            <label htmlFor="filter-inline-statut" className="text-[10px] font-medium text-muted-foreground">
              Statut
            </label>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger id="filter-inline-statut" className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-0">
            <label htmlFor="filter-inline-agence" className="text-[10px] font-medium text-muted-foreground">
              Agence
            </label>
            <Select value={filterAgenceRattachement} onValueChange={setFilterAgenceRattachement}>
              <SelectTrigger id="filter-inline-agence" className="h-9 w-full text-sm">
                <SelectValue placeholder="Agence de rattachement" />
              </SelectTrigger>
              <SelectContent>
                {uniqueAgencesRattachement.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-0">
            <label htmlFor="filter-inline-dept" className="text-[10px] font-medium text-muted-foreground">
              Département
            </label>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger id="filter-inline-dept" className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {uniqueDepts.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-0">
            <label htmlFor="filter-inline-secteur" className="text-[10px] font-medium text-muted-foreground">
              Zone / secteur
            </label>
            <Select value={filterSecteurId} onValueChange={setFilterSecteurId}>
              <SelectTrigger id="filter-inline-secteur" className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous">Tous</SelectItem>
                {secteurs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {formatSecteurDisplayName(s.nom)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-foreground">Clubs d'affaires</h3>
        <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none justify-end">
          <div className="relative w-48 sm:w-[260px] shrink-0">
            <Input
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-sm rounded-md pr-8"
              aria-label="Rechercher dans les clubs"
            />
            {searchQuery ? (
              <button
                type="button"
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => setSearchQuery("")}
                aria-label="Effacer la recherche"
              >
                <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
              </button>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs shrink-0"
            onClick={() =>
              downloadClubsCsv(
                rowsToDisplay,
                `clubs-dynaperf-${new Date().toISOString().slice(0, 10)}`,
                { secteurLabelForClub, referentLabel },
              )
            }
            disabled={rowsToDisplay.length === 0}
          >
            <FontAwesomeIcon icon={faFileArrowDown} className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </Button>
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

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>
      ) : (
        <>
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

          <div className="md:hidden space-y-2">
            <AnimatePresence>
              {rowsToDisplay.map(c => <MobileCard key={c.id} c={c} />)}
            </AnimatePresence>
            {rowsToDisplay.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun club trouvé</p>}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <SortableTh label="Club" colKey="nom" />
                  <SortableTh label="Format" colKey="format" />
                  <SortableTh label="Président" colKey="president_nom" className="min-w-[160px]" />
                  <SortableTh label="Référent" colKey="referent_nom" className="min-w-[140px]" />
                  <SortableTh label="Secteur" colKey="secteur_nom" />
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
                {rowsToDisplay.map(c => (
                  <TableRow key={c.id}>
                    <TableCell><ClubLogo club={c} isAdmin={isAdmin} onUpdate={loadClubs} /></TableCell>
                    <TableCell className="font-medium text-sm">{displayClubName(c.nom)}</TableCell>
                    <TableCell><FormatBadge format={c.format} /></TableCell>
                    <TableCell className="text-sm align-top">
                      {normalizePresidentImportName(c.president_nom)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground align-top min-w-0">
                      <span className="line-clamp-2" title={referentLabel(c) || undefined}>
                        {referentLabel(c) || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {formatSecteurDisplayName(secteurLabelForClub(c)) || "—"}
                    </TableCell>
                    <TableCell className="align-top"><DepartementTableCell raw={c.departement} /></TableCell>
                    <TableCell><StatutBadge statut={c.statut} /></TableCell>
                    <TableCell className="text-right text-sm">{c.nb_membres_actifs}</TableCell>
                    <TableCell className="text-right text-sm">{c.nb_leads_transformes}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCA(c.montant_ca)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(c.date_creation)}</TableCell>
                    <TableCell><ActionButtons c={c} /></TableCell>
                  </TableRow>
                ))}
                {rowsToDisplay.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-sm text-muted-foreground py-8">Aucun club trouvé</TableCell>
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
                  <AvatarImage src={viewClub.logo_url || undefined} alt={displayClubName(viewClub.nom)} />
                  <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                    {clubNameInitials(viewClub.nom)}
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
                <p className="text-sm font-semibold text-foreground">{displayClubName(viewClub.nom)}</p>
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
                <div><span className="text-xs text-muted-foreground block">Président</span><span className="font-medium text-foreground">{normalizePresidentImportName(viewClub.president_nom) || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Référent</span><span className="font-medium text-foreground">{referentLabel(viewClub) || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Vice-président</span><span className="font-medium text-foreground">{viewClub.vice_president_nom || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Tél. président</span><span className="font-medium text-foreground">{viewClub.telephone_president || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Email</span><span className="font-medium text-foreground break-all">{viewClub.email_president || "—"}</span></div>
                <div>
                  <span className="text-xs text-muted-foreground block">Secteur</span>
                  <span className="font-medium text-foreground">
                    {formatSecteurDisplayName(secteurLabelForClub(viewClub)) || "—"}
                  </span>
                </div>
                <div className="col-span-2"><span className="text-xs text-muted-foreground block">Département</span><div className="font-medium text-foreground"><DepartementTableCell raw={viewClub.departement} /></div></div>
                <div><span className="text-xs text-muted-foreground block">Agence mère</span><span className="font-medium text-foreground">{viewClub.agence_mere || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block">Agence rattachement</span><span className="font-medium text-foreground">{viewClub.agence_rattachement || "—"}</span></div>
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
              Êtes-vous sûr de vouloir supprimer le club{" "}
              <strong>{deleteClub ? displayClubName(deleteClub.nom) : ""}</strong> ? Cette action est irréversible.
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
    </div>
  );
}
