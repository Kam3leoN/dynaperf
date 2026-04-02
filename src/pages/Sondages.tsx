import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faPen, faTrash, faEllipsisVertical, faChartBar, faSquarePollVertical,
  faXmark, faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { RichTextarea } from "@/components/ui/rich-textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Sondage {
  id: string;
  created_by: string;
  title: string;
  description: string;
  is_active: boolean;
  is_multiple_choice: boolean;
  ends_at: string | null;
  created_at: string;
}

interface SondageOption {
  id: string;
  sondage_id: string;
  label: string;
  sort_order: number;
}

interface SondageVote {
  id: string;
  sondage_id: string;
  option_id: string;
  user_id: string;
}

export default function Sondages() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin(user);
  const [sondages, setSondages] = useState<Sondage[]>([]);
  const [options, setOptions] = useState<Record<string, SondageOption[]>>({});
  const [votes, setVotes] = useState<SondageVote[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sondage | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isMultiple, setIsMultiple] = useState(false);
  const [endsAt, setEndsAt] = useState("");
  const [optionLabels, setOptionLabels] = useState<string[]>(["", ""]);

  const [deleteTarget, setDeleteTarget] = useState<Sondage | null>(null);

  const loadAll = useCallback(async () => {
    const [{ data: s }, { data: o }, { data: v }] = await Promise.all([
      supabase.from("sondages").select("*").order("created_at", { ascending: false }),
      supabase.from("sondage_options").select("*").order("sort_order"),
      supabase.from("sondage_votes").select("*"),
    ]);
    setSondages((s as Sondage[]) || []);
    const grouped: Record<string, SondageOption[]> = {};
    ((o as SondageOption[]) || []).forEach((opt) => {
      if (!grouped[opt.sondage_id]) grouped[opt.sondage_id] = [];
      grouped[opt.sondage_id].push(opt);
    });
    setOptions(grouped);
    setVotes((v as SondageVote[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("sondages-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "sondages" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "sondage_votes" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadAll]);

  const openNew = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setIsMultiple(false);
    setEndsAt("");
    setOptionLabels(["", ""]);
    setDialogOpen(true);
  };

  const openEdit = (s: Sondage) => {
    setEditing(s);
    setTitle(s.title);
    setDescription(s.description);
    setIsMultiple(s.is_multiple_choice);
    setEndsAt(s.ends_at ? s.ends_at.slice(0, 16) : "");
    setOptionLabels((options[s.id] || []).map((o) => o.label));
    setDialogOpen(true);
  };

  const save = async () => {
    const validLabels = optionLabels.filter((l) => l.trim());
    if (!title.trim() || validLabels.length < 2) {
      toast.error("Titre et au moins 2 options requis");
      return;
    }

    if (editing) {
      const { error } = await supabase.from("sondages").update({
        title: title.trim(),
        description,
        is_multiple_choice: isMultiple,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      }).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }

      // Delete old options and recreate
      await supabase.from("sondage_options").delete().eq("sondage_id", editing.id);
      const { error: optErr } = await supabase.from("sondage_options").insert(
        validLabels.map((label, i) => ({ sondage_id: editing.id, label, sort_order: i }))
      );
      if (optErr) { toast.error(optErr.message); return; }
      toast.success("Sondage modifié");
    } else {
      const { data: newS, error } = await supabase.from("sondages").insert({
        created_by: user!.id,
        title: title.trim(),
        description,
        is_multiple_choice: isMultiple,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      }).select().single();
      if (error || !newS) { toast.error(error?.message || "Erreur"); return; }

      const { error: optErr } = await supabase.from("sondage_options").insert(
        validLabels.map((label, i) => ({ sondage_id: (newS as Sondage).id, label, sort_order: i }))
      );
      if (optErr) { toast.error(optErr.message); return; }
      toast.success("Sondage créé");
    }
    setDialogOpen(false);
    loadAll();
  };

  const deleteSondage = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("sondages").delete().eq("id", deleteTarget.id);
    if (error) toast.error(error.message);
    else toast.success("Sondage supprimé");
    setDeleteTarget(null);
    loadAll();
  };

  const toggleVote = async (sondageId: string, optionId: string, isMultipleChoice: boolean) => {
    if (!user) return;
    const existing = votes.find((v) => v.sondage_id === sondageId && v.option_id === optionId && v.user_id === user.id);
    if (existing) {
      await supabase.from("sondage_votes").delete().eq("id", existing.id);
    } else {
      if (!isMultipleChoice) {
        // Remove previous vote on this sondage
        const prev = votes.filter((v) => v.sondage_id === sondageId && v.user_id === user.id);
        for (const p of prev) {
          await supabase.from("sondage_votes").delete().eq("id", p.id);
        }
      }
      await supabase.from("sondage_votes").insert({ sondage_id: sondageId, option_id: optionId, user_id: user.id });
    }
    loadAll();
  };

  const toggleActive = async (s: Sondage) => {
    await supabase.from("sondages").update({ is_active: !s.is_active }).eq("id", s.id);
    loadAll();
  };

  return (
    <AppLayout>
      <div className="py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Sondages</h1>
            <p className="text-sm text-muted-foreground">Créez et participez aux sondages</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
            Nouveau
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-12">Chargement…</p>
        ) : sondages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FontAwesomeIcon icon={faSquarePollVertical} className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Aucun sondage pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sondages.map((s) => {
              const opts = options[s.id] || [];
              const sVotes = votes.filter((v) => v.sondage_id === s.id);
              const totalVoters = new Set(sVotes.map((v) => v.user_id)).size;
              const isMine = s.created_by === user?.id;
              const isExpired = s.ends_at && new Date(s.ends_at) < new Date();
              const canVote = s.is_active && !isExpired;

              return (
                <Card key={s.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{s.title}</CardTitle>
                          {!s.is_active && <Badge variant="secondary">Fermé</Badge>}
                          {isExpired && <Badge variant="outline" className="text-amber-600 border-amber-300">Expiré</Badge>}
                          {s.is_multiple_choice && <Badge variant="outline">Choix multiples</Badge>}
                        </div>
                        {s.description && (
                          <div className="text-sm text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: s.description }} />
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(s.created_at), "dd MMM yyyy", { locale: fr })} · {totalVoters} participant{totalVoters !== 1 ? "s" : ""}
                          {s.ends_at && ` · Expire le ${format(new Date(s.ends_at), "dd MMM yyyy HH:mm", { locale: fr })}`}
                        </p>
                      </div>
                      {isMine && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <FontAwesomeIcon icon={faEllipsisVertical} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl">
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <FontAwesomeIcon icon={faPen} className="mr-2 h-3.5 w-3.5" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(s)}>
                              <FontAwesomeIcon icon={s.is_active ? faXmark : faCheck} className="mr-2 h-3.5 w-3.5" />
                              {s.is_active ? "Fermer" : "Rouvrir"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteTarget(s)} className="text-destructive focus:text-destructive">
                              <FontAwesomeIcon icon={faTrash} className="mr-2 h-3.5 w-3.5" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {opts.map((opt) => {
                      const optVotes = sVotes.filter((v) => v.option_id === opt.id).length;
                      const pct = totalVoters > 0 ? (optVotes / totalVoters) * 100 : 0;
                      const myVote = sVotes.some((v) => v.option_id === opt.id && v.user_id === user?.id);

                      return (
                        <button
                          key={opt.id}
                          disabled={!canVote}
                          onClick={() => toggleVote(s.id, opt.id, s.is_multiple_choice)}
                          className={`w-full text-left rounded-xl border p-3 transition-all ${
                            myVote
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40"
                          } ${!canVote ? "opacity-70 cursor-default" : "cursor-pointer"}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${myVote ? "text-primary" : "text-foreground"}`}>
                              {myVote && <FontAwesomeIcon icon={faCheck} className="mr-1.5 h-3 w-3" />}
                              {opt.label}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">{optVotes} ({pct.toFixed(0)}%)</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le sondage" : "Nouveau sondage"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Votre question…" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <RichTextarea value={description} onChange={setDescription} placeholder="Contexte ou détails…" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isMultiple} onCheckedChange={setIsMultiple} id="multi" />
              <Label htmlFor="multi">Choix multiples</Label>
            </div>
            <div className="space-y-1.5">
              <Label>Date de fin (optionnel)</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Options *</Label>
              {optionLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={label}
                    onChange={(e) => {
                      const next = [...optionLabels];
                      next[i] = e.target.value;
                      setOptionLabels(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                  />
                  {optionLabels.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOptionLabels(optionLabels.filter((_, j) => j !== i))}>
                      <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setOptionLabels([...optionLabels, ""])} className="gap-1.5">
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> Ajouter une option
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save}>{editing ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce sondage ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSondage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
