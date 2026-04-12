import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  id: string;
  name: string;
  scan_count: number;
  value: string;
  created_at: string;
};

/**
 * Vue agrégée des scans par QR (compteur `scan_count`), typique d’un tableau de suivi de campagnes.
 */
export default function QrCodeStats() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("qr_codes")
        .select("id, name, scan_count, value, created_at")
        .order("scan_count", { ascending: false });
      if (!alive) return;
      if (error) {
        toast.error(`Statistiques : ${error.message}`);
        setRows([]);
      } else {
        setRows((data ?? []) as Row[]);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const totalScans = useMemo(() => rows.reduce((s, r) => s + (typeof r.scan_count === "number" ? r.scan_count : 0), 0), [rows]);

  return (
    <AppLayout>
      <section className="app-page-shell-wide min-w-0 w-full space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-semibold">Consulter les statistiques</h1>
          <p className="text-sm text-muted-foreground">
            Totaux de scans enregistrés via les liens de suivi publics — même principe qu’un tableau de bord de librairie ou de service QR.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>QR codes</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{loading ? "…" : rows.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Scans cumulés</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{loading ? "…" : totalScans}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Détail par QR</CardTitle>
            <CardDescription>Classé par nombre de scans (décroissant).</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun QR enregistré pour le moment.</p>
            ) : (
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Nom</th>
                    <th className="py-2 pr-3 text-right tabular-nums">Scans</th>
                    <th className="py-2 pr-3">Créé le</th>
                    <th className="py-2">Cible (extrait)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{r.scan_count ?? 0}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2.5 max-w-[240px] truncate text-muted-foreground" title={r.value}>
                        {r.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}
