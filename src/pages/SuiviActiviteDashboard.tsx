import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { fetchSuiviItemsConfig, SuiviItemConfig } from "@/data/suiviActiviteItems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faClipboardCheck,
  faBuilding,
  faCheckCircle,
  faTimesCircle,
  faFileContract,
} from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SuiviRecord {
  id: string;
  date: string;
  agence: string;
  suivi_par: string;
  items: Record<string, { status: string; observation?: string }>;
  total_items_valides: number;
  total_items: number;
  nb_contrats_total: number;
  nb_contrats_depuis_dernier: number;
  created_at: string;
}

export default function SuiviActiviteDashboard() {
  const [suivis, setSuivis] = useState<SuiviRecord[]>([]);
  const [itemsConfig, setItemsConfig] = useState<SuiviItemConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from("suivi_activite")
        .select("*")
        .order("date", { ascending: false }),
      fetchSuiviItemsConfig(),
    ]).then(([{ data }, config]) => {
      setSuivis((data as unknown as SuiviRecord[]) ?? []);
      setItemsConfig(config);
      setLoading(false);
    });
  }, []);

  // KPIs
  const totalSuivis = suivis.length;
  const totalValides = suivis.reduce((s, r) => s + (r.total_items_valides ?? 0), 0);
  const totalItems = suivis.reduce((s, r) => s + (r.total_items ?? 0), 0);
  const globalRate = totalItems > 0 ? Math.round((totalValides / totalItems) * 100) : 0;
  const totalContrats = suivis.reduce((s, r) => s + (r.nb_contrats_total ?? 0), 0);
  const uniqueAgences = new Set(suivis.map((s) => s.agence)).size;

  // Category stats
  const categoryStats = useMemo(() => {
    const categories = [...new Set(itemsConfig.map((i) => i.categorie))];
    return categories.map((cat) => {
      const catItems = itemsConfig.filter((i) => i.categorie === cat);
      const catIds = new Set(catItems.map((i) => i.id));
      let fait = 0, pasFait = 0, nc = 0, total = 0;

      suivis.forEach((s) => {
        const items = s.items as Record<string, { status: string }>;
        Object.entries(items).forEach(([id, val]) => {
          if (!catIds.has(id)) return;
          total++;
          if (val.status === "fait") fait++;
          else if (val.status === "pas_fait") pasFait++;
          else if (val.status === "nc") nc++;
        });
      });

      const applicable = fait + pasFait;
      const rate = applicable > 0 ? Math.round((fait / applicable) * 100) : 0;
      return { name: cat, fait, pasFait, nc, total, rate };
    });
  }, [suivis, itemsConfig]);

  // Per-agency stats
  const agencyStats = useMemo(() => {
    const map = new Map<string, { valides: number; total: number; count: number; contrats: number }>();
    suivis.forEach((s) => {
      const prev = map.get(s.agence) ?? { valides: 0, total: 0, count: 0, contrats: 0 };
      map.set(s.agence, {
        valides: prev.valides + (s.total_items_valides ?? 0),
        total: prev.total + (s.total_items ?? 0),
        count: prev.count + 1,
        contrats: prev.contrats + (s.nb_contrats_total ?? 0),
      });
    });
    return [...map.entries()]
      .map(([name, v]) => ({
        name,
        ...v,
        rate: v.total > 0 ? Math.round((v.valides / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [suivis]);

  if (loading) {
    return (
      <AppLayout>
        <p className="text-muted-foreground animate-pulse py-20 text-center">Chargement…</p>
      </AppLayout>
    );
  }

  const kpis = [
    { label: "Suivis réalisés", value: totalSuivis, icon: faClipboardCheck, color: "text-primary" },
    { label: "Agences suivies", value: uniqueAgences, icon: faBuilding, color: "text-blue-500" },
    { label: "Taux global", value: `${globalRate}%`, icon: faChartLine, color: "text-emerald-500" },
    { label: "Contrats cumulés", value: totalContrats, icon: faFileContract, color: "text-amber-500" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tableau de bord — Suivi d'activité</h1>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble de la progression des agences
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 ${kpi.color}`}>
                  <FontAwesomeIcon icon={kpi.icon} className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Category progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progression par catégorie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
            ) : (
              categoryStats.map((cat) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <FontAwesomeIcon icon={faCheckCircle} className="h-2.5 w-2.5 text-emerald-500" />
                        {cat.fait}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <FontAwesomeIcon icon={faTimesCircle} className="h-2.5 w-2.5 text-destructive" />
                        {cat.pasFait}
                      </Badge>
                      <span className="text-sm font-semibold text-foreground w-10 text-right">{cat.rate}%</span>
                    </div>
                  </div>
                  <Progress value={cat.rate} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Per-agency table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance par agence</CardTitle>
          </CardHeader>
          <CardContent>
            {agencyStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-left">
                      <th className="pb-2 font-medium">Agence</th>
                      <th className="pb-2 font-medium text-center">Suivis</th>
                      <th className="pb-2 font-medium text-center">Validés</th>
                      <th className="pb-2 font-medium text-center">Taux</th>
                      <th className="pb-2 font-medium text-center">Contrats</th>
                      <th className="pb-2 font-medium w-32">Progression</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {agencyStats.map((a) => (
                      <tr key={a.name}>
                        <td className="py-2 font-medium text-foreground">{a.name}</td>
                        <td className="py-2 text-center text-muted-foreground">{a.count}</td>
                        <td className="py-2 text-center">
                          <span className="text-foreground">{a.valides}</span>
                          <span className="text-muted-foreground">/{a.total}</span>
                        </td>
                        <td className="py-2 text-center font-semibold text-foreground">{a.rate}%</td>
                        <td className="py-2 text-center text-muted-foreground">{a.contrats}</td>
                        <td className="py-2">
                          <Progress value={a.rate} className="h-1.5" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent suivis */}
        {suivis.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Derniers suivis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suivis.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="font-medium text-foreground text-sm">{s.agence}</span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.date), "dd MMM yyyy", { locale: fr })} — {s.suivi_par}
                      </p>
                    </div>
                    <Badge
                      className={
                        (s.total_items_valides ?? 0) / Math.max(s.total_items ?? 1, 1) >= 0.7
                          ? "bg-emerald-600 text-white"
                          : (s.total_items_valides ?? 0) / Math.max(s.total_items ?? 1, 1) >= 0.4
                          ? "bg-amber-500 text-white dark:bg-amber-600"
                          : "bg-destructive text-destructive-foreground"
                      }
                    >
                      {s.total_items_valides}/{s.total_items}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
