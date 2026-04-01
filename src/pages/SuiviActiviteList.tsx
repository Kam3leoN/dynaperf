import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faEye, faCalendarPlus } from "@fortawesome/free-solid-svg-icons";
import { SuiviActiviteExportExcel, SuiviActiviteExportPDF } from "@/components/SuiviActiviteExport";
import { SuiviActivitePdfDetail } from "@/components/SuiviActivitePdfDetail";
import { PlanActiviteDialog } from "@/components/PlanActiviteDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SuiviRow {
  id: string;
  date: string;
  agence: string;
  suivi_par: string;
  total_items_valides: number;
  total_items: number;
  nb_contrats_total: number;
  nb_contrats_depuis_dernier: number;
  created_at: string;
}

export default function SuiviActiviteList() {
  const [suivis, setSuivis] = useState<SuiviRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [planOpen, setPlanOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open plan dialog from URL
  useEffect(() => {
    if (searchParams.get("plan") === "1") {
      setPlanOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("suivi_activite")
      .select("id, date, agence, suivi_par, total_items_valides, total_items, nb_contrats_total, nb_contrats_depuis_dernier, created_at")
      .order("date", { ascending: false });
    setSuivis((data as SuiviRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("suivi_activite").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Suivi supprimé");
      load();
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Suivis d'activité</h1>
          <p className="text-sm text-muted-foreground">{suivis.length} suivi{suivis.length !== 1 ? "s" : ""} enregistré{suivis.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SuiviActiviteExportExcel suivis={suivis} />
          <SuiviActiviteExportPDF suivis={suivis} />
          <Button variant="outline" className="gap-2" onClick={() => setPlanOpen(true)}>
            <FontAwesomeIcon icon={faCalendarPlus} className="h-3.5 w-3.5 text-amber-500" />
            Planifier
          </Button>
          <Button asChild className="gap-2">
             <Link to="/activite/new/version">
              <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
              Nouveau suivi
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground animate-pulse py-12 text-center">Chargement…</p>
      ) : suivis.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">Aucun suivi d'activité enregistré.</p>
          <Button asChild variant="outline">
            <Link to="/activite/new">Créer votre premier suivi</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {suivis.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-foreground">{s.agence || "Sans agence"}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {s.total_items_valides}/{s.total_items} validés
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(s.date), "dd MMMM yyyy", { locale: fr })} — par {s.suivi_par}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <SuiviActivitePdfDetail suiviId={s.id} />
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link to={`/activite/${s.id}`}>
                      <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                      Voir
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce suivi ?</AlertDialogTitle>
                        <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(s.id)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <PlanActiviteDialog open={planOpen} onOpenChange={setPlanOpen} onCreated={() => load()} />
    </AppLayout>
  );
}
