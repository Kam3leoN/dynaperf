import { useState, useMemo, useCallback, useEffect } from "react";
import { collaborateursObjectifs, MOIS_ORDRE } from "@/data/audits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Audit {
  id: string;
  date: string;
  partenaire: string;
  lieu: string;
  auditeur: string;
  typeEvenement: string;
  note: number | null;
  moisVersement: string;
  statut: "OK" | "NON";
}

export interface Filters {
  auditeur: string;
  typeEvenement: string;
  moisVersement: string;
  statut: string;
  annee: string;
}

function dbToAudit(row: any): Audit {
  return {
    id: row.id,
    date: row.date,
    partenaire: row.partenaire,
    lieu: row.lieu || "",
    auditeur: row.auditeur,
    typeEvenement: row.type_evenement,
    note: row.note,
    moisVersement: row.mois_versement,
    statut: row.statut as "OK" | "NON",
  };
}

export function useAuditData() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    auditeur: "Tous",
    typeEvenement: "Tous",
    moisVersement: "Tous",
    statut: "Tous",
    annee: String(new Date().getFullYear()),
  });

  // Load from Supabase
  useEffect(() => {
    const fetchAudits = async () => {
      const { data, error } = await supabase.from("audits").select("*").order("date", { ascending: false });
      if (error) {
        toast.error("Erreur de chargement des audits");
        console.error(error);
      } else {
        setAudits((data || []).map(dbToAudit));
      }
      setLoading(false);
    };
    fetchAudits();
  }, []);

  // Extract available years from all audits
  const availableYears = useMemo(() => {
    const years = [...new Set(audits.map((a) => new Date(a.date).getFullYear()))].sort((a, b) => b - a);
    return years;
  }, [audits]);

  const filtered = useMemo(() => {
    return audits.filter((a) => {
      if (filters.annee !== "Tous" && String(new Date(a.date).getFullYear()) !== filters.annee) return false;
      if (filters.auditeur !== "Tous" && a.auditeur !== filters.auditeur) return false;
      if (filters.typeEvenement !== "Tous" && a.typeEvenement !== filters.typeEvenement) return false;
      if (filters.moisVersement !== "Tous" && a.moisVersement !== filters.moisVersement) return false;
      if (filters.statut !== "Tous" && a.statut !== filters.statut) return false;
      return true;
    });
  }, [audits, filters]);

  const notedAudits = useMemo(() => filtered.filter((a) => a.note !== null && a.note > 0), [filtered]);

  const scoresByType = useMemo(() => {
    const types = [...new Set(filtered.map((a) => a.typeEvenement))];
    return types.map((type) => {
      const ofType = notedAudits.filter((a) => a.typeEvenement === type);
      const notes = ofType.map((a) => a.note!);
      if (notes.length === 0) return { type, avg: 0, min: 0, max: 0, count: 0 };
      return {
        type,
        avg: +(notes.reduce((s, n) => s + n, 0) / notes.length).toFixed(2),
        min: +Math.min(...notes).toFixed(2),
        max: +Math.max(...notes).toFixed(2),
        count: ofType.length,
      };
    });
  }, [filtered, notedAudits]);

  const collaborateurStats = useMemo(() => {
    return collaborateursObjectifs.map((c) => {
      const count = filtered.filter((a) => a.auditeur === c.nom).length;
      return { ...c, realise: count, progression: c.objectif > 0 ? +(count / c.objectif * 100).toFixed(1) : 0 };
    });
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    MOIS_ORDRE.forEach((m) => (map[m] = 0));
    filtered.forEach((a) => {
      const month = new Date(a.date).toLocaleString("fr-FR", { month: "long" });
      const cap = month.charAt(0).toUpperCase() + month.slice(1);
      if (map[cap] !== undefined) map[cap]++;
    });
    return MOIS_ORDRE.map((m) => ({ mois: m.slice(0, 3), total: map[m] })).filter((m) => m.total > 0 || MOIS_ORDRE.indexOf(m.mois as any) < 7);
  }, [filtered]);

  // Per-type averages for each partner
  const partenaireStats = useMemo(() => {
    const map: Record<string, Record<string, { notes: number[]; count: number }>> = {};
    filtered.forEach((a) => {
      if (!map[a.partenaire]) map[a.partenaire] = {};
      if (!map[a.partenaire][a.typeEvenement]) map[a.partenaire][a.typeEvenement] = { notes: [], count: 0 };
      map[a.partenaire][a.typeEvenement].count++;
      if (a.note !== null && a.note > 0) map[a.partenaire][a.typeEvenement].notes.push(a.note);
    });
    const result: { nom: string; type: string; count: number; avg: number | null }[] = [];
    Object.entries(map).forEach(([nom, types]) => {
      Object.entries(types).forEach(([type, d]) => {
        result.push({
          nom,
          type,
          count: d.count,
          avg: d.notes.length > 0 ? +(d.notes.reduce((s, n) => s + n, 0) / d.notes.length).toFixed(2) : null,
        });
      });
    });
    return result.sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  }, [filtered]);

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: "0-2", count: 0 },
      { range: "2-4", count: 0 },
      { range: "4-6", count: 0 },
      { range: "6-8", count: 0 },
      { range: "8-10", count: 0 },
    ];
    notedAudits.forEach((a) => {
      const n = a.note!;
      if (n < 2) buckets[0].count++;
      else if (n < 4) buckets[1].count++;
      else if (n < 6) buckets[2].count++;
      else if (n < 8) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [notedAudits]);

  const globalStats = useMemo(() => {
    const notes = notedAudits.map((a) => a.note!);
    return {
      totalAudits: filtered.length,
      auditsNotes: notedAudits.length,
      moyenneGlobale: notes.length > 0 ? +(notes.reduce((s, n) => s + n, 0) / notes.length).toFixed(2) : 0,
      enAttente: filtered.filter((a) => a.statut === "NON").length,
    };
  }, [filtered, notedAudits]);

  const addAudit = useCallback(async (audit: Omit<Audit, "id">) => {
    const { data, error } = await supabase.from("audits").insert({
      date: audit.date,
      partenaire: audit.partenaire,
      lieu: audit.lieu,
      auditeur: audit.auditeur,
      type_evenement: audit.typeEvenement,
      note: audit.note,
      mois_versement: audit.moisVersement,
      statut: audit.statut,
    }).select().single();
    if (error) { toast.error("Erreur lors de l'ajout"); console.error(error); return; }
    setAudits((prev) => [dbToAudit(data), ...prev]);
    toast.success("Audit ajouté");
  }, []);

  const updateAudit = useCallback(async (id: string, updates: Partial<Audit>) => {
    const dbUpdates: any = {};
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.partenaire !== undefined) dbUpdates.partenaire = updates.partenaire;
    if (updates.lieu !== undefined) dbUpdates.lieu = updates.lieu;
    if (updates.auditeur !== undefined) dbUpdates.auditeur = updates.auditeur;
    if (updates.typeEvenement !== undefined) dbUpdates.type_evenement = updates.typeEvenement;
    if (updates.note !== undefined) dbUpdates.note = updates.note;
    if (updates.moisVersement !== undefined) dbUpdates.mois_versement = updates.moisVersement;
    if (updates.statut !== undefined) dbUpdates.statut = updates.statut;

    const { error } = await supabase.from("audits").update(dbUpdates).eq("id", id);
    if (error) { toast.error("Erreur lors de la modification"); console.error(error); return; }
    setAudits((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    toast.success("Audit modifié");
  }, []);

  const deleteAudit = useCallback(async (id: string) => {
    const { error } = await supabase.from("audits").delete().eq("id", id);
    if (error) { toast.error("Erreur lors de la suppression"); console.error(error); return; }
    setAudits((prev) => prev.filter((a) => a.id !== id));
    toast.success("Audit supprimé");
  }, []);

  return {
    audits: filtered,
    allAudits: audits,
    filters,
    setFilters,
    scoresByType,
    collaborateurStats,
    monthlyData,
    partenaireStats,
    scoreDistribution,
    globalStats,
    addAudit,
    updateAudit,
    deleteAudit,
    loading,
  };
}
