import { useState, useMemo, useCallback } from "react";
import { Audit, initialAudits, collaborateursObjectifs, MOIS_ORDRE } from "@/data/audits";

export interface Filters {
  auditeur: string;
  typeEvenement: string;
  moisVersement: string;
  statut: string;
}

export function useAuditData() {
  const [audits, setAudits] = useState<Audit[]>(initialAudits);
  const [filters, setFilters] = useState<Filters>({
    auditeur: "Tous",
    typeEvenement: "Tous",
    moisVersement: "Tous",
    statut: "Tous",
  });

  const filtered = useMemo(() => {
    return audits.filter((a) => {
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

  const partenaireStats = useMemo(() => {
    const map: Record<string, { notes: number[]; count: number }> = {};
    filtered.forEach((a) => {
      if (!map[a.partenaire]) map[a.partenaire] = { notes: [], count: 0 };
      map[a.partenaire].count++;
      if (a.note !== null && a.note > 0) map[a.partenaire].notes.push(a.note);
    });
    return Object.entries(map)
      .map(([nom, d]) => ({
        nom,
        count: d.count,
        avg: d.notes.length > 0 ? +(d.notes.reduce((s, n) => s + n, 0) / d.notes.length).toFixed(2) : null,
      }))
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
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

  const addAudit = useCallback((audit: Omit<Audit, "id">) => {
    setAudits((prev) => [...prev, { ...audit, id: String(Date.now()) }]);
  }, []);

  const updateAudit = useCallback((id: string, data: Partial<Audit>) => {
    setAudits((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  }, []);

  const deleteAudit = useCallback((id: string) => {
    setAudits((prev) => prev.filter((a) => a.id !== id));
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
  };
}
