import { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faXmark } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
}

const FORMAT_OPTIONS = ["Tous", "Développement", "Intensif", "Convivial"];
const STATUT_OPTIONS = [
  { value: "Tous", label: "Tous" },
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

export default function AdminClubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFormat, setFilterFormat] = useState("Tous");
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [filterAnnee, setFilterAnnee] = useState("Tous");
  const [filterDept, setFilterDept] = useState("Tous");
  const [filterSecteur, setFilterSecteur] = useState("Tous");
  const [membresMin, setMembresMin] = useState(0);
  const [leadsMin, setLeadsMin] = useState(0);
  const [caMin, setCaMin] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("clubs").select("*").order("nom");
    if (data) setClubs(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { loadClubs(); }, [loadClubs]);

  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    clubs.forEach(c => {
      if (c.date_creation) years.add(c.date_creation.substring(0, 4));
    });
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

  const maxMembres = useMemo(() => Math.max(1, ...clubs.map(c => c.nb_membres_actifs)), [clubs]);
  const maxLeads = useMemo(() => Math.max(1, ...clubs.map(c => c.nb_leads_transformes)), [clubs]);
  const maxCA = useMemo(() => Math.max(1, ...clubs.map(c => c.montant_ca)), [clubs]);

  const activeFiltersCount = [
    filterFormat !== "Tous",
    filterStatut !== "Tous",
    filterAnnee !== "Tous",
    filterDept !== "Tous",
    filterSecteur !== "Tous",
    membresMin > 0,
    leadsMin > 0,
    caMin > 0,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterFormat("Tous"); setFilterStatut("Tous"); setFilterAnnee("Tous");
    setFilterDept("Tous"); setFilterSecteur("Tous");
    setMembresMin(0); setLeadsMin(0); setCaMin(0);
  };

  const filtered = useMemo(() => clubs.filter(c => {
    if (filterFormat !== "Tous" && c.format !== filterFormat) return false;
    if (filterStatut !== "Tous" && c.statut !== filterStatut) return false;
    if (filterAnnee !== "Tous" && (!c.date_creation || !c.date_creation.startsWith(filterAnnee))) return false;
    if (filterDept !== "Tous" && c.departement !== filterDept) return false;
    if (filterSecteur !== "Tous" && c.agence_mere !== filterSecteur) return false;
    if (c.nb_membres_actifs < membresMin) return false;
    if (c.nb_leads_transformes < leadsMin) return false;
    if (c.montant_ca < caMin) return false;
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    const hay = `${c.nom} ${c.president_nom} ${c.departement || ""} ${c.agence_mere || ""} ${c.adresse || ""}`.toLowerCase();
    return term.split(/\s+/).every(w => hay.includes(w));
  }), [clubs, filterFormat, filterStatut, filterAnnee, filterDept, filterSecteur, membresMin, leadsMin, caMin, searchQuery]);

  const totalMembres = filtered.reduce((s, c) => s + c.nb_membres_actifs, 0);
  const totalLeads = filtered.reduce((s, c) => s + c.nb_leads_transformes, 0);
  const totalCA = filtered.reduce((s, c) => s + c.montant_ca, 0);

  const FilterPanel = () => (
    <div className="space-y-5 p-1">
      {/* Format */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Format</label>
        <Select value={filterFormat} onValueChange={setFilterFormat}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Statut */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Statut</label>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Année */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Année de création</label>
        <Select value={filterAnnee} onValueChange={setFilterAnnee}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {uniqueYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Département */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Département</label>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Secteur (Agence mère) */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Secteur (Agence mère)</label>
        <Select value={filterSecteur} onValueChange={setFilterSecteur}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {uniqueSecteurs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Membres min */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Membres min : {membresMin}</label>
        <Slider value={[membresMin]} onValueChange={([v]) => setMembresMin(v)} min={0} max={maxMembres} step={1} />
      </div>

      {/* Leads min */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Leads min : {leadsMin}</label>
        <Slider value={[leadsMin]} onValueChange={([v]) => setLeadsMin(v)} min={0} max={maxLeads} step={1} />
      </div>

      {/* CA min */}
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

  const MobileCard = ({ c }: { c: Club }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-card border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{c.nom}</p>
          <p className="text-xs text-muted-foreground truncate">{c.president_nom}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <FormatBadge format={c.format} />
          <StatutBadge statut={c.statut} />
        </div>
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
    <div className="bg-card rounded-lg shadow-soft p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-foreground">Clubs d'affaires</h3>
        <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none justify-end">
          <Input
            placeholder="Rechercher…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 sm:w-[260px] h-9 text-sm rounded-md"
          />
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
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FilterPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Stats bar */}
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
          {/* Mobile */}
          <div className="md:hidden space-y-2">
            <AnimatePresence>
              {filtered.map(c => <MobileCard key={c.id} c={c} />)}
            </AnimatePresence>
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun club trouvé</p>}
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Président</TableHead>
                  <TableHead>Dpt.</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Membres</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.nom}</TableCell>
                    <TableCell><FormatBadge format={c.format} /></TableCell>
                    <TableCell className="text-sm">{c.president_nom}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.departement || "—"}</TableCell>
                    <TableCell><StatutBadge statut={c.statut} /></TableCell>
                    <TableCell className="text-right text-sm">{c.nb_membres_actifs}</TableCell>
                    <TableCell className="text-right text-sm">{c.nb_leads_transformes}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCA(c.montant_ca)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(c.date_creation)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Aucun club trouvé</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
