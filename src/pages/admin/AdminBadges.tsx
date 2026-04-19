import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ActionIconButton } from "@/components/ActionIconButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faRotateRight, faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

type BadgeRow = Tables<"badges">;

export default function AdminBadges() {
  const [rows, setRows] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BadgeRow | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<BadgeRow>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("badges").select("*").order("threshold", { ascending: true });
    if (error) {
      toast.error(error.message || "Chargement impossible");
      setRows([]);
    } else {
      setRows((data ?? []) as BadgeRow[]);
      setDrafts({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setDraft = (id: string, patch: Partial<BadgeRow>) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  const displayRow = (r: BadgeRow): BadgeRow => {
    const d = drafts[r.id];
    if (!d) return r;
    return { ...r, ...d };
  };

  const saveOne = async (r: BadgeRow) => {
    const cur = displayRow(r);
    setSavingId(r.id);
    const { error } = await supabase
      .from("badges")
      .update({
        label: cur.label,
        description: cur.description ?? "",
        icon: cur.icon ?? "🏆",
        category: cur.category ?? "general",
        threshold: cur.threshold ?? 0,
      })
      .eq("id", r.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message || "Enregistrement impossible");
      return;
    }
    toast.success("Badge mis à jour");
    setDrafts((d) => {
      const next = { ...d };
      delete next[r.id];
      return next;
    });
    await load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeletingId(id);
    const { error } = await supabase.from("badges").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast.error(error.message || "Suppression impossible (droits insuffisants ou erreur serveur)");
      return;
    }
    setDeleteTarget(null);
    toast.success("Badge supprimé — les attributions utilisateur associées ont été retirées.");
    await load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Badges (gamification)</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Modifiez le libellé, la description affichée, l’icône et la catégorie. La clé technique et l’identifiant ne
            sont pas modifiables : ils sont liés aux règles d’attribution côté serveur. La suppression est réservée aux
            administrateurs et retire aussi les succès déjà obtenus par les utilisateurs.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          <FontAwesomeIcon icon={faRotateRight} className="mr-2 h-4 w-4" />
          Recharger
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Seuil d’affichage</CardTitle>
          <CardDescription>
            Le champ numérique sert surtout à l’ordre d’affichage dans l’app. Les conditions réelles de déblocage sont
            définies dans la logique serveur (sauf alignement manuel avec ce libellé).
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {rows.map((r) => {
          const cur = displayRow(r);
          const dirty =
            cur.label !== r.label ||
            (cur.description ?? "") !== (r.description ?? "") ||
            (cur.icon ?? "") !== (r.icon ?? "") ||
            (cur.category ?? "") !== (r.category ?? "") ||
            Number(cur.threshold ?? 0) !== Number(r.threshold ?? 0);

          return (
            <Card key={r.id} className="border-border/60 overflow-hidden">
              <CardHeader className="flex flex-row flex-wrap items-center gap-3 border-b border-border/50 bg-muted/20 py-3">
                <span className="text-3xl leading-none" aria-hidden>
                  {cur.icon || "🏆"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-muted-foreground truncate">key: {r.key}</p>
                  <p className="font-mono text-[10px] text-muted-foreground/80 truncate">id: {r.id}</p>
                </div>
                <ActionIconButton
                  variant="destructive"
                  label="Supprimer ce badge"
                  disabled={savingId === r.id || deletingId === r.id}
                  onClick={() => setDeleteTarget(r)}
                >
                  {deletingId === r.id ? (
                    <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                  )}
                </ActionIconButton>
              </CardHeader>
              <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`label-${r.id}`}>Nom affiché</Label>
                  <Input
                    id={`label-${r.id}`}
                    value={cur.label}
                    onChange={(e) => setDraft(r.id, { label: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`desc-${r.id}`}>Texte condition / description</Label>
                  <Textarea
                    id={`desc-${r.id}`}
                    rows={2}
                    value={cur.description ?? ""}
                    onChange={(e) => setDraft(r.id, { description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`icon-${r.id}`}>Icône (emoji ou texte court)</Label>
                  <Input
                    id={`icon-${r.id}`}
                    value={cur.icon ?? ""}
                    onChange={(e) => setDraft(r.id, { icon: e.target.value })}
                    placeholder="🏆"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`cat-${r.id}`}>Catégorie</Label>
                  <Input
                    id={`cat-${r.id}`}
                    value={cur.category ?? ""}
                    onChange={(e) => setDraft(r.id, { category: e.target.value })}
                    placeholder="audit, équipe…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`thr-${r.id}`}>Seuil (tri / affichage)</Label>
                  <Input
                    id={`thr-${r.id}`}
                    type="number"
                    min={0}
                    value={cur.threshold ?? 0}
                    onChange={(e) => setDraft(r.id, { threshold: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-end sm:col-span-2">
                  <Button
                    type="button"
                    disabled={!dirty || savingId === r.id}
                    onClick={() => void saveOne(r)}
                  >
                    {savingId === r.id ? (
                      <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FontAwesomeIcon icon={faFloppyDisk} className="mr-2 h-4 w-4" />
                    )}
                    Enregistrer ce badge
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {rows.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Aucun badge en base.</p>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce badge ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">{deleteTarget?.label}</span>{" "}
                  <span className="font-mono text-xs">({deleteTarget?.key})</span>
                </p>
                <p>
                  Cette action est définitive : les utilisateurs qui l’avaient débloquée ne le verront plus dans leur
                  liste de succès.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
